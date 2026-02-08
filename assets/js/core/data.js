(function() {
  const DB_NAME = "duty-db";
  const DB_VERSION = 1;

  const STORES = {
    META: "meta",
    STAFF: "staff",
    SCENARIOS: "scenarios",
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

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const request = tx(storeName, "readwrite").clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function isInFolder(path, folder) {
    const parts = path.split("/");
    return parts.includes(folder);
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

    // тут же:
    // - duty_pool.json
    // - future config files

    return { staff };
  }

  async function parseScenariosDir(files) {
    const scenarios = [];

    console.log(files);

    for (const file of files) {
      if (!file.name.endsWith(".json")) continue;

      const text = await file.text();
      const scenario = JSON.parse(text);
      console.log(scenario);

      if (!scenario.id || !Array.isArray(scenario.steps)) {
        throw new Error(`Некорректный сценарий: ${file.name}`);
      }

      scenarios.push(scenario);
    }

    if (!scenarios.length) {
      throw new Error("Каталог scenarios пуст");
    }

    return scenarios;
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

      console.log(data);
      console.log(scenarios);

      await this.clear();


      // TODO:
      // 2. Определить staff / scenarios
      // 3. JSON.parse
      // 4. Валидация структуры
      // 5. Очистка stores
      // 6. Сохранение в IndexedDB
      //
      // валидация данных
      //
      // const used = new Set();
      // window.SCENARIOS.forEach(s => {
      //   if (used.has(s.hotkey)) {
      //     console.error("Дублируются hotkey:", s.hotkey);
      //   }
      //   used.add(s.hotkey);
      // })
      //

      // Пока заглушка
      console.warn("importFiles() not implemented yet");
    },

    async getStaff() {
      return await getAll(STORES.STAFF);
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
      await clearStore(STORES.SCENARIOS);
    },
  };

  window.Data = Data;
})();
