window.IndexPage = function() {
  let root;
  let hotkeyHandler = null;

  async function mount(container) {
    root = container;
    renderLayout();
    ReminderUI.updateBadge();

    try {
      Clock.start();
      await Data.init();

      const scenarios = await Data.getIndex();
      if (!scenarios || !scenarios.length) {
        showImportUI();
        return;
      }
      updateHealthBadge();

      renderGrid(scenarios);
      updateProgressBadge(scenarios);
      bindServiceButtons(scenarios);

    } catch (e) {
      console.error(e);
      renderFatal(e);
    }
  }

  function updateHealthBadge() {
    const count = StaffService.getAbsentCount();
    const badge = root.querySelector("#health-badge");
    const btn = root.querySelector("#health-btn");
    if (!badge || !btn) return;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
      btn.setAttribute("data-tooltip", `Отсутствуют: ${count}`);
    } else {
      badge.classList.add("hidden");
      btn.setAttribute("data-tooltip", "Проверка состояния системы");
    }
  }

  // биндим checkhealth, напоминалку и сброс сценариев
  function bindServiceButtons(scenarios) {
    // проверка состояния системы
    const healthBtn = root.querySelector("#health-btn");
    healthBtn.onclick = async () => {
      HealthUI.open();
    };
    // запустить модалку напоминания
    const reminderBtn = root.querySelector("#reminder-btn");
    reminderBtn.onclick = () => {
      ReminderUI.openManager();
    };

    const progressBtn = root.querySelector("#progress-btn");
    progressBtn.onclick = () => {
      const count = getActiveScenariosCount(scenarios);
      if (!count) {
        alert("Нет сценариев в процессе");
        return;
      }

      const ok = confirm(`Сценариев в процессе: ${count}. Удалить прогресс?`);
      if (!ok) return;
      ScenarioService.resetProgress(scenarios);
      // пересчитать состояние
      const enriched = ScenarioService.getState(scenarios);
      updateProgressBadge(enriched);
    };
  }

  function getActiveScenariosCount(scenarios) {
    const enriched = ScenarioService.getState(scenarios);
    return enriched.filter(s => s.hasProgress).length;
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-index">
        <div class="header">
          <div class="no-gap">
            <img src="assets/icons/duty.png" alt="logo" class="logo"/>
            <h1>Документация дежурного</h1>
          </div>
          <div>
            <a id="reminder-btn" class="nav reminder-wrapper" data-tooltip="Напоминания">
              <img src="assets/icons/ring.svg" alt="Напоминания" class="icon">
              <span id="reminder-badge" class="reminder-badge hidden">0</span>
            </a>
            <a id="progress-btn" class="nav" data-tooltip="Сценарии в процессе">
              <img src="assets/icons/progress.svg" class="icon">
              <span id="progress-badge" class="reminder-badge hidden">0</span>
            </a>
            <a id="health-btn" class="nav" data-tooltip="Проверка состояния системы">
              <img src="assets/icons/health.svg" alt="Здоровье" class="icon">
              <span id="health-badge" class="reminder-badge health-badge hidden">0</span>
            </a>
            <a class="nav" href="#/settings" data-tooltip="Настройки системы">
              <img src="assets/icons/config.svg" alt="Настройки" class="icon">
            </a>
            <a class="nav" href="#/staff" data-tooltip="Список сотрудников">
              <img src="assets/icons/staff.svg" alt="Люди" class="icon">
            </a>
            <a class="nav" href="#/docs" data-tooltip="Перечень документов">
              <img src="assets/icons/docs.svg" alt="Доки" class="icon">
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

        setTimeout(async () => {
          overlay.remove();
          app.style.display = "";

          updateHealthBadge();

          const scenarios = await Data.getIndex();
          if (scenarios && scenarios.length) {
            renderGrid(scenarios);
            updateProgressBadge(scenarios);
            bindServiceButtons(scenarios);
          }
        }, 600);

      } catch (e) {
        console.error(e);
        status.textContent = e.message || "Ошибка импорта данных";
        status.className = "import-status error";
      }
    });
  }

  function updateProgressBadge(scenarios) {
    const count = getActiveScenariosCount(scenarios);

    const badge = root.querySelector("#progress-badge");
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
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

        a.innerHTML = `
          <div class="title">${s.title}</div>
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
