(function() {
  const STORAGE_KEY = "duty.data";

  // ---------- INTERNAL HELPERS ----------

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

    return { staff, dutyPool, roles };
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
      // Ничего не нужно. Оставлено ради совместимости.
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

      const grouped = collectByFolder(files);
      const dataFiles = grouped.get("data");
      const scenarioFiles = grouped.get("scenarios");

      if (!dataFiles || !scenarioFiles) {
        throw new Error("Не найдены каталоги data и scenarios");
      }

      const data = await parseDataDir(dataFiles);
      const scenarios = await parseScenariosDir(scenarioFiles);

      // Валидации остаются
      window.validateIndex(scenarios.index);
      window.validateStaff(data.staff);
      window.validateScenarios(scenarios.scenarios);
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
        importedAt: new Date().toISOString()
      };

      save(fullData);
    },

    async getIndex() {
      return load()?.index || [];
    },

    async getStaff() {
      return load()?.staff || [];
    },

    async getRoles() {
      return load()?.roles || null;
    },

    async getDutyPool() {
      return load()?.dutyPool || null;
    },

    async getScenarios() {
      return load()?.scenarios || [];
    },

    async getScenarioById(id) {
      const scenarios = load()?.scenarios || [];
      return scenarios.find(s => s.id === id) || null;
    },

    async clear() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  window.Data = Data;
})();
