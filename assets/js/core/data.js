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
        throw new Error("Провео");
      }

      const dataFiles = [...files].filter(f => {

        console.log(f);
        return f.webkitRelativePath.startsWith("data/")
      });

      const scenarioFiles = [...files].filter(f =>
        f.webkitRelativePath.startsWith("scenarios/")
      );

      console.log(dataFiles)
      console.log(scenarioFiles)

      // const staffFile = [...files].find(
      //   f => f.webkitRelativePath === "data/staff.json"
      // );
      //
      // const scenarioFiles = [...files].filter(
      //   f => f.webkitRelativePath.startsWith("scenarios/")
      // );

      // if (!staffFile) {
      //   throw new Error("Не найден data/staff.json");
      // }
      //
      // if (!scenarioFiles.length) {
      //   throw new Error("Каталог scenarios пуст или отсутствует");
      // }

      // TODO:
      // 1. Разобрать FileList
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

    // ---------- DATA GETTERS ----------

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

    // ---------- MAINTENANCE ----------

    async clear() {
      await clearStore(STORES.META);
      await clearStore(STORES.STAFF);
      await clearStore(STORES.SCENARIOS);
    },
  };

  // Экспорт в глобал (один origin — один Data)
  window.Data = Data;
})();
