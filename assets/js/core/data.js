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

  async function parseDataDir(files) {
    const staffFile = files.find(f => f.name === STAFF_FILE);
    if (!staffFile) {
      throw new Error(`В каталоге data отсутствует ${STAFF_FILE}`);
    }
    // const staff = JSON.parse(await staffFile.text());
    const staff = await readJsonFile(staffFile)
    if (!Array.isArray(staff)) {
      throw new Error(`${STAFF_FILE} должен содержать массив`);
    }

    const positionsPoolFile = files.find(f => f.name === POSITIONS_FILE);
    if (!positionsPoolFile) {
      throw new Error(`В каталоге data отсутствует ${POSITIONS_FILE}`);
    }
    const positionsPool = JSON.parse(await positionsPoolFile.text());

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
    return { staff, roles, docs, positionsPool };
  }

  async function parseScenariosDir(files) {
    const indexFile = files.find(f => f.name === "index.json");
    if (!indexFile) {
      throw new Error("В каталоге scenarios отсутствует index.json");
    }

    const index = JSON.parse(await indexFile.text());

    const scenarios = [];
    for (const file of files) {
      if (!file.name.endsWith(SCENARIOS_EXTENTION) || file.name === "index.json") continue;
      scenarios.push(await readJsonFile(file));
    }

    if (!scenarios.length) {
      throw new Error("Каталог scenarios пуст");
    }

    return { index, scenarios };
  }

  async function readJsonFile(file) {
    const text = await file.text();
    const json = JSON.parse(text);

    if (!isEncrypted(json)) return json;

    if (!password) {
      password = await requestPassword();
    }

    return await CryptoService.decrypt(json, password);
  }

  function isEncrypted(obj) {
    return obj && obj.salt && obj.iv && obj.data;
  }

  function requestPassword() {
    return new Promise(resolve => {
      const val = prompt("Введите пароль");
      if (!val) throw new Error("Пароль обязателен");
      resolve(val);
    });
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

    async importFiles(files) {
      if (!password) {
        password = await requestPassword();
      }
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

      const data = await parseDataDir(dataFiles);
      const scenarios = await parseScenariosDir(scenarioFiles);

      window.validateIndex(scenarios.index);
      window.validateStaff(data.staff);
      window.validateScenarios(scenarios.scenarios);
      if (data.docs) {
        window.validateDocs(data.docs);
        documents = {
          documents: data.docs,
          updated_at: new Date().toISOString()
        }
      } else {
        documents = {
          documents: [],
          updated_at: new Date().toISOString()
        }
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
        importedAt: new Date().toISOString()
      };
      save(fullData);
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
