// работа с данными, импорт, валидация, обработка и API для получения
(function() {
  const STORAGE_KEY = "duty.data";
  const STAFF_FILE = "staff.json";
  const POSITIONS_FILE = "positions_pool.json";
  const ROLES_FILE = "roles.json";
  const DOCS_FILE = "docs.json";
  const SCENARIOS_EXTENTION = ".json";

  let password = null;

  // ---------- INTERNAL HELPERS ----------

  async function load() {
    try {
      return JSON.parse(await SecureStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  async function save(data) {
    await SecureStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function collectByFolder(files) {
    const map = new Map();

    for (const file of files) {
      const parts = file.webkitRelativePath.split("/");
      const folder = parts.find(p => p === "data" || p === "scenarios");
      if (!folder) continue;

      if (!map.has(folder)) map.set(folder, []);
      map.get(folder).push(file);
    }
    return map;
  }

  async function decryptWithRetry(json) {
    let errorType = null;
    while (true) {
      if (password) {
        try {
          const data = await CryptoService.decrypt(json, password);
          if (data.__magic !== "duty_v1") {
            throw new Error("BAD_PASSWORD");
          }
          return data;
        } catch {
          // пароль не подошёл → сбрасываем и просим новый
          password = null;
          errorType = "invalid";
        }
      }
      const pwd = await requestPassword({ error: errorType });
      password = pwd;
    }
  }

  function extractLastEncryptedAt(data, scenarios) {
    const dates = [];
    if (data.meta?.staffEncryptedAt) {
      dates.push(data.meta.staffEncryptedAt);
    }
    if (data.meta?.positionsEncryptedAt) {
      dates.push(data.meta.positionsEncryptedAt);
    }
    if (scenarios.meta?.encryptedAtList) {
      dates.push(...scenarios.meta.encryptedAtList);
    }
    return dates
      .filter(Boolean)
      .sort()
      .at(-1) || null;
  }

  async function parseDataDir(files) {
    const staffFile = files.find(f => f.name === STAFF_FILE);
    if (!staffFile) {
      throw new Error(`В каталоге data отсутствует ${STAFF_FILE}`);
    }
    const { data: staffRaw, encryptedAt: staffEncryptedAt } =
      await readJsonFile(staffFile);
    let staff;
    if (Array.isArray(staffRaw)) {
      // старый формат (без обертки)
      staff = staffRaw;
    } else if (staffRaw && Array.isArray(staffRaw.staff)) {
      // новый формат
      staff = staffRaw.staff;
    } else {
      throw new Error(`${STAFF_FILE} должен содержать массив`);
    }

    const positionsPoolFile = files.find(f => f.name === POSITIONS_FILE);
    if (!positionsPoolFile) {
      throw new Error(`В каталоге data отсутствует ${POSITIONS_FILE}`);
    }
    const { data: positionsPoolObj, encryptedAt: positionsEncryptedAt } =
      await readJsonFile(positionsPoolFile);
    const positionsPool = Object.values(positionsPoolObj);

    const rolesFile = files.find(f => f.name === ROLES_FILE);
    if (!rolesFile) {
      throw new Error(`В каталоге data отсутствует ${ROLES_FILE}`);
    }
    const roles = JSON.parse(await rolesFile.text());

    const docsFile = files.find(f => f.name === DOCS_FILE);
    let docs = null;

    if (docsFile) {
      try {
        docs = JSON.parse(await docsFile.text());
      } catch (e) {
        throw new Error(`Ошибка чтения ${DOCS_FILE}: ` + e.message);
      }
    }
    return {
      staff, roles, docs, positionsPool, meta: {
        staffEncryptedAt,
        positionsEncryptedAt
      }
    };
  }

  async function parseScenariosDir(files) {
    const indexFile = files.find(f => f.name === "index.json");
    if (!indexFile) {
      throw new Error("В каталоге scenarios отсутствует index.json");
    }
    const index = JSON.parse(await indexFile.text());

    const scenarios = [];
    const encryptedAtList = [];

    for (const file of files) {
      if (!file.name.endsWith(SCENARIOS_EXTENTION) || file.name === "index.json") continue;
      const { data, encryptedAt } = await readJsonFile(file);
      scenarios.push(data);
      if (encryptedAt) {
        encryptedAtList.push(encryptedAt);
      }
    }
    // if (!scenarios.length) {
    //   throw new Error("Каталог scenarios пуст");
    // }
    return {
      index, scenarios, meta: {
        encryptedAtList
      }
    };
  }

  async function readJsonFile(file) {
    const text = await file.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Ошибка JSON: ${file.name}`);
    }
    // не зашифрован
    if (!isEncrypted(json)) {
      return { data: json, encryptedAt: null };
    }
    const decrypted = await decryptWithRetry(json);
    if (decrypted && typeof decrypted === "object") {
      const encryptedAt = decrypted.__encrypted_at || null;
      // чистим служебные поля
      delete decrypted.__magic;
      delete decrypted.__encrypted_at;
      return { data: decrypted, encryptedAt };
    }
    return { data: decrypted, encryptedAt: null };
  }

  function isEncrypted(obj) {
    return obj && obj.salt && obj.iv && obj.data;
  }

  async function requestPassword({ error = null } = {}) {
    const res = await PasswordDialog.open({ error });
    if (!res.ok) {
      throw new Error("Отменено пользователем");
    }
    return res.password;
  }

  async function requestPasswordNew() {
    let errorType = null;
    while (true) {
      const res = await PasswordDialog.open({
        title: "Новый пароль",
        subtitle: "Введите и подтвердите пароль",
        confirmText: "Сохранить",
        confirm: true,
        error: errorType
      });
      if (!res.ok) {
        if (res.mismatch) {
          errorType = "mismatch";
          continue;
        }
        throw new Error("Отменено пользователем");
      }
      return res.password;
    }
  }

  // ---------- PUBLIC API ----------

  const Data = {
    async init() {
      return;
    },

    async hasData() {
      const data = load();
      return !!(data && data.staff?.length && data.scenarios?.length);
    },

    async getKeyMeta() {
      const data = await load();
      return data?.keyMeta || null;
    },

    async reencryptAll() {
      const data = await load();
      if (!data) {
        throw new Error("Нет данных для перешифрования");
      }
      // запрашиваем новый пароль
      const newPassword = await requestPasswordNew();
      const now = new Date().toISOString();

      const result = {
        data: {},
        scenarios: {}
      };

      // --- STAFF ---
      result.data[STAFF_FILE] =
        await CryptoService.encrypt({
          __magic: "duty_v1",
          __encrypted_at: now,
          staff: data.staff
        }, newPassword);

      // --- POSITIONS ---
      result.data["positions_pool.json"] =
        await CryptoService.encrypt({
          __magic: "duty_v1",
          __encrypted_at: now,
          ...data.positions
        }, newPassword);

      // --- SCENARIOS ---
      for (const s of data.scenarios) {
        result.scenarios[`${s.id}.json`] =
          await CryptoService.encrypt({
            __magic: "duty_v1",
            __encrypted_at: now,
            ...s
          }, newPassword);
      }

      return result;
    },

    async importFiles(files) {
      if (!files || !files.length) {
        throw new Error("Проверь импорт");
      }
      let documents = null;
      const grouped = collectByFolder(files);
      const dataFiles = grouped.get("data");
      const scenarioFiles = grouped.get("scenarios");

      if (!dataFiles || !scenarioFiles) {
        throw new Error("Не найдены каталоги data и scenarios");
      }

      try {
        const data = await parseDataDir(dataFiles);
        const scenarios = await parseScenariosDir(scenarioFiles);
        const lastEncryptedAt = extractLastEncryptedAt(data, scenarios);

        window.validateIndex(scenarios.index);
        window.validateStaff(data.staff);
        window.validateScenarios(scenarios.scenarios);
        if (data.docs) {
          window.validateDocs(data.docs);
          documents = {
            documents: data.docs,
            updated_at: new Date().toISOString()
          };
        } else {
          documents = {
            documents: [],
            updated_at: new Date().toISOString()
          };
        }
        window.validateCross({
          staff: data.staff,
          scenarios: scenarios.scenarios,
          roles: data.roles,
        });
        const fullData = {
          staff: data.staff,
          scenarios: scenarios.scenarios,
          index: scenarios.index,
          roles: data.roles,
          positions: data.positionsPool,
          docs: documents,
          importedAt: new Date().toISOString(),
          keyMeta: lastEncryptedAt
        };
        await save(fullData);
      } catch (e) {
        throw new Error(e.message || "Ошибка импорта");
      }
    },


    async importScenarioFile(file) {
      const text = await file.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Файл поврежден или не JSON");
      }
      // если зашифрован
      if (isEncrypted(json)) {
        json = await decryptWithRetry(json);
      } else {
        json = {
          ...json,
          __magic: "duty_v1"
        };
      }
      // проверка сигнатуры
      if (json.__magic !== "duty_v1") {
        throw new Error("Неверный формат файла");
      }
      // убираем служебное поле
      delete json.__magic;
      return json;
    },

    async exportScenario(scenario) {
      await this.ensurePassword();
      const prepared = {
        id: scenario.id,
        title: scenario.title,
        color: scenario.color,
        mode: scenario.mode,
        steps: scenario.steps,
        __magic: "duty_v1",
        __encrypted_at: new Date().toISOString()
      };
      const encrypted = await CryptoService.encrypt(prepared, password);
      return {
        filename: `${scenario.id || "scenario"}${SCENARIOS_EXTENTION}`,
        content: encrypted
      };
    },

    async exportStaffFile(staff) {
      await this.ensurePassword();
      const payload = {
        __magic: "duty_v1",
        __encrypted_at: new Date().toISOString(),
        staff
      };
      const encrypted = await CryptoService.encrypt(payload, password);
      return {
        filename: STAFF_FILE,
        content: encrypted
      };
    },

    async ensurePassword() {
      if (!password) {
        password = await requestPassword();
      }
    },

    async getIndex() {
      const data = await load();
      return data?.index || [];
    },

    async getStaff() {
      const data = await load();
      return data?.staff || [];
    },

    async setStaff(staff) {
      let data = await load();
      if (!data) {
        data = {
          staff: [],
          roles: {},
          scenarios: [],
          docs: [],
          importedAt: null
        }
      }
      data.staff = staff;
      data.importedAt = new Date().toISOString();
      await save(data);
    },

    async getDocs() {
      const data = await load();
      return data?.docs || [];
    },

    async getPositions() {
      const data = await load();
      return data?.positions || [];
    },

    async setDocs(docs) {
      let data = await load();
      if (!data) {
        data = {
          staff: [],
          roles: {},
          scenarios: [],
          docs: [],
          importedAt: null
        };
      }
      data.docs = docs;
      data.importedAt = new Date().toISOString();
      await save(data);
    },

    async getDepartments() {
      try {
        const raw = localStorage.getItem("departments");
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },

    async getRoles() {
      const data = await load();
      return data?.roles || null;
    },

    async getScenarios() {
      const data = await load();
      return data?.scenarios || null;
    },

    async getScenarioById(id) {
      const data = await load();
      const scenarios = data?.scenarios || [];
      return scenarios.find(s => s.id === id) || null;
    },

    async clear() {
      await SecureStorage.removeItem(STORAGE_KEY);
    }
  };

  window.Data = Data;
})();
