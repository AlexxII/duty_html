window.IndexPage = function() {
  let root;
  let hotkeyHandler = null;

  async function mount(container) {
    root = container;
    renderLayout();
    try {
      Clock.start();
      await Data.init();

      const scenarios = await Data.getIndex();
      if (!scenarios || !scenarios.length) {
        showImportUI();
        return;
      }
      renderGrid(scenarios);
      bindHotkeys(scenarios);

      // проверка состояния системы
      const healthBtn = root.querySelector("#health-btn");
      healthBtn.onclick = async () => {
        const issues = await HealthCheck.run(true);
        showHealthModal(issues);
      };
    } catch (e) {
      console.error(e);
      renderFatal(e);
    }
  }

  function bindHotkeys(scenarios) {
    hotkeyHandler = function(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const scenario = scenarios.find(s => s.hotkey === e.code);
      if (!scenario) return;
      location.hash = `/scenario?id=${scenario.id}`;
    };
    document.addEventListener("keyup", hotkeyHandler);
  }

  function showHealthModal(issues) {
    if (document.querySelector(".health-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "health-overlay";

    overlay.innerHTML = `
      <div class="health-modal">
        <h1>Состояние системы</h1>
        <div class="health-list"></div>
        <div class="health-actions">
          <button class="button button--secondary" id="health-close">
            Закрыть
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const list = overlay.querySelector(".health-list");

    if (!issues.length) {

      list.innerHTML = `
        <div class="health-item success">
          Система работает корректно. Нарушений не обнаружено.
        </div>
      `;

    } else {

      list.innerHTML = issues.map(issue => `
        <div class="health-item ${issue.level === "error" ? "error" : "warning"}">
          ${issue.level === "error" ? "Ошибка" : "Предупреждение"}:<br>
          ${issue.message}
        </div>
      `).join("");
    }

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", escHandler);
    }

    overlay.querySelector("#health-close").onclick = close;
    // закрытие по клику вне окна
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
    // закрытие по Esc
    function escHandler(e) {
      if (e.code === "Escape") close();
    }
    document.addEventListener("keydown", escHandler);
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-index">
        <div class="header">
          <h1>Документация дежурного</h1>
          <div>
            <a id="health-btn" class="nav" data-tooltip="Проверка состояния системы">
              <img src="assets/icons/health.svg" alt="Здоровье" class="icon">
            </a>
            <a class="nav" href="#/settings" data-tooltip="Настройки системы">
              <img src="assets/icons/config.svg" alt="Настройки" class="icon">
            </a>
            <a class="nav" href="#/staff" data-tooltip="Список сотрудников">
              <img src="assets/icons/staff.svg" alt="Люди" class="icon">
            </a>
            <p id="clock"></p>
          </div>
        </div>
        <div class="grid" id="grid"></div>

      </div>
    `;
  }

  function showImportUI() {
    const app = document.getElementById("app");
    app.style.display = "none";

    const overlay = document.createElement("div");
    overlay.id = "import-overlay";
    overlay.innerHTML = `
    <div class="import-card">
      <h1>Импорт данных</h1>
      <p class="import-hint">
        Выберите корневую папку носителя.<br>
        Внутри должны быть каталоги <b>data</b> и <b>scenarios</b>.
      </p>

      <label class="button button--primary">
        Выбрать папку
        <input type="file" id="import-input" webkitdirectory>
      </label>

      <div class="import-status" id="import-status"></div>
    </div>
  `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector("#import-input");
    const status = overlay.querySelector("#import-status");

    input.addEventListener("change", async () => {
      if (!input.files.length) return;

      status.textContent = "Чтение данных…";
      status.className = "import-status loading";

      try {
        await Data.importFiles(input.files);

        status.textContent = "Данные успешно импортированы";
        status.className = "import-status success";

        setTimeout(() => {
          overlay.remove();
          app.style.display = "";
          location.reload();
        }, 600);

      } catch (e) {
        console.error(e);
        status.textContent = e.message || "Ошибка импорта данных";
        status.className = "import-status error";
      }
    });
  }

  function renderGrid(scenarios) {
    const grid = root.querySelector("#grid");
    grid.innerHTML = "";

    scenarios
      .sort((a, b) => a.order - b.order)
      .forEach(s => {
        const a = document.createElement("a");
        a.className = "tile " + s.color;
        a.href = `#/scenario?id=${s.id}`;
        const label = utils.hotkeyLabel(s.hotkey);

        a.innerHTML = `
          <div class="title">${s.title}</div>
          <div class="hint">
            <span class="kbd"><i>${label}</i></span>
          </div>
        `;
        grid.appendChild(a);
      });
  }

  function renderFatal(error) {
    Clock.stop();

    root.innerHTML = `
      <div class="fatal-error">
        <h2>Ошибка приложения</h2>
        <pre>${escapeHtml(error?.message || error)}</pre>
        <a href="#/" class="back-btn">На главную</a>
      </div>
    `;
  }

  function renderFatal(error) {
    Clock.stop();

    root.innerHTML = `
      <div class="fatal-error">
        <h2>Ошибка приложения</h2>
        <pre>${escapeHtml(error?.message || error)}</pre>
        <a href="#/" class="back-btn">На главную</a>
      </div>
    `;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function unmount() {
    Clock.stop();
    if (hotkeyHandler) {
      document.removeEventListener("keyup", hotkeyHandler);
      hotkeyHandler = null;
    }
    root.innerHTML = "";
  }

  return { mount, unmount };
};
