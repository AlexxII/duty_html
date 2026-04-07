(function() {
  const STORAGE_KEY = "duty.data";

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
    const staffFile = files.find(f => f.name === "staff.json");
    if (!staffFile) {
      throw new Error("В каталоге data отсутствует staff.json");
    }
    const staff = JSON.parse(await staffFile.text());
    if (!Array.isArray(staff)) {
      throw new Error("staff.json должен содержать массив");
    }

    const dutyPoolFile = files.find(f => f.name === "duty_pool.json");
    if (!dutyPoolFile) {
      throw new Error("В каталоге data отсутствует duty_pool.json");
    }
    const dutyPool = JSON.parse(await dutyPoolFile.text());

    const rolesFile = files.find(f => f.name === "roles.json");
    if (!rolesFile) {
      throw new Error("В каталоге data отсутствует roles.json");
    }
    const roles = JSON.parse(await rolesFile.text());

    const docsFile = files.find(f => f.name === "docs.json");
    let docs = null;

    if (docsFile) {
      try {
        docs = JSON.parse(await docsFile.text());
      } catch (e) {
        throw new Error("Ошибка чтения docs.json: " + e.message);
      }
    }
    return { staff, dutyPool, roles, docs };
  }

  async function parseScenariosDir(files) {
    const indexFile = files.find(f => f.name === "index.json");
    if (!indexFile) {
      throw new Error("В каталоге scenarios отсутствует index.json");
    }

    const index = JSON.parse(await indexFile.text());

    const scenarios = [];
    for (const file of files) {
      if (!file.name.endsWith(".json") || file.name === "index.json") continue;
      scenarios.push(JSON.parse(await file.text()));
    }

    if (!scenarios.length) {
      throw new Error("Каталог scenarios пуст");
    }

    return { index, scenarios };
  }

  // ---------- PUBLIC API ----------

  const Data = {
    async init() {
      // ради совместимости.
      return;
    },

    async hasData() {
      const data = load();
      return !!(data && data.staff?.length && data.scenarios?.length);
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
      }
      window.validateCross({
        staff: data.staff,
        scenarios: scenarios.scenarios,
        roles: data.roles,
        dutyPool: data.dutyPool
      });

      const fullData = {
        staff: data.staff,
        scenarios: scenarios.scenarios,
        index: scenarios.index,
        roles: data.roles,
        dutyPool: data.dutyPool,
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
          dutyPool: {},
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
      console.log(data)
      return data?.docs || [];
    },

    async setDocs(docs) {
      let data = await load();
      if (!data) {
        data = {
          staff: [],
          roles: {},
          scenarios: [],
          dutyPool: {},
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

    async getDutyPool() {
      const data = await load();
      return data?.dutyPool || null;
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
