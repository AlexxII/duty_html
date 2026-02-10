(function() {
  const DB_NAME = "duty-db";
  const DB_VERSION = 1;

  const STORES = {
    META: "meta",
    STAFF: "staff",
    SCENARIOS: "scenarios",
    INDEX: "index",
  };

  let db = null;

  // ---------- INTERNAL HELPERS ----------

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(STORES.INDEX)) {
          db.createObjectStore(STORES.INDEX, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.STAFF)) {
          db.createObjectStore(STORES.STAFF, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.SCENARIOS)) {
          db.createObjectStore(STORES.SCENARIOS, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function tx(storeName, mode = "readonly") {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function getAll(storeName) {
    return new Promise((resolve, reject) => {
      const request = tx(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function putAll(storeName, items) {
    return new Promise((resolve, reject) => {
      const store = tx(storeName, "readwrite");

      if (Array.isArray(items)) {
        items.forEach(item => {
          store.put(item);
        });
      } else {
        store.put(items);
      }

      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const request = tx(storeName, "readwrite").clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
    const text = await staffFile.text();
    const staff = JSON.parse(text);
    if (!Array.isArray(staff)) {
      throw new Error("staff.json должен содержать массив");
    }

    const dutyPoolFile = files.find(f => f.name === "duty_pool.json");
    if (!dutyPoolFile) {
      throw new Error("В каталоге data отсутствует duty_pool.json");
    }
    const dutyPoolText = await dutyPoolFile.text();
    const dutyPool = JSON.parse(dutyPoolText);


    const rolesFile = files.find(f => f.name === "roles.json");
    if (!rolesFile) {
      throw new Error("В каталоге data отсутствует roles.json");
    }
    const rolesText = await rolesFile.text();
    const roles = JSON.parse(rolesText);

    return { staff, dutyPool, roles };
  }

  async function parseScenariosDir(files) {
    const indexFile = files.find(f => f.name === "index.json");
    if (!indexFile) {
      throw new Error("В каталоге scenarios отсутствует index.json");
    }
    const text = await indexFile.text();
    const index = JSON.parse(text);

    const scenarios = [];
    for (const file of files) {

      if (!file.name.endsWith(".json") || file.name === "index.json") continue;

      const text = await file.text();
      const scenario = JSON.parse(text);

      scenarios.push(scenario);
    }

    if (!scenarios.length) {
      throw new Error("Каталог scenarios пуст");
    }

    return {
      index,
      scenarios
    };
  }

  // ---------- PUBLIC API ----------

  const Data = {
    async init() {
      if (db) return;
      db = await openDB();
    },

    async hasData() {
      const staff = await getAll(STORES.STAFF);
      const scenarios = await getAll(STORES.SCENARIOS);
      return staff.length > 0 && scenarios.length > 0;
    },

    // Импорт данных (файлы передаёт UI)
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

      window.validateIndex(scenarios.index)
      window.validateStaff(data.staff);
      window.validateScenarios(scenarios.scenarios);
      window.validateCross({
        staff: data.staff,
        scenarios: scenarios.scenarios,
        roles: data.roles,
        dutyPool: data.dutyPool
      })

      await this.clear();

      await putAll(STORES.STAFF, data.staff);
      await putAll(STORES.INDEX, scenarios.index);
      await putAll(STORES.SCENARIOS, scenarios.scenarios);

      await putAll(STORES.META, [
        {
          key: "roles",
          value: data.roles
        }
      ]);

      await putAll(STORES.META, [
        {
          key: "duty-pool",
          value: data.dutyPool
        }
      ]);

      await putAll(STORES.META, [{
        key: "importedAt",
        value: new Date().toISOString()
      }]);
    },

    async getIndex() {
      return await getAll(STORES.INDEX);
    },

    async getStaff() {
      return await getAll(STORES.STAFF);
    },

    async getRoles() {
      return new Promise((resolve, reject) => {
        const req = tx(STORES.META).get("roles");
        req.onsuccess = () => {
          resolve(req.result ? req.result.value : null);
        };
        req.onerror = () => reject(req.error);
      });
    },

    async getDutyPool() {
      return new Promise((resolve, reject) => {
        const req = tx(STORES.META).get("duty-pool");
        req.onsuccess = () => {
          resolve(req.result ? req.result.value : null);
        };
        req.onerror = () => reject(req.error);
      });
    },

    async getScenarios() {
      return await getAll(STORES.SCENARIOS);
    },

    async getScenarioById(id) {
      return new Promise((resolve, reject) => {
        const request = tx(STORES.SCENARIOS).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    },

    async clear() {
      await clearStore(STORES.META);
      await clearStore(STORES.STAFF);
      await clearStore(STORES.INDEX);
      await clearStore(STORES.SCENARIOS);
    },
  };

  window.Data = Data;
})();
