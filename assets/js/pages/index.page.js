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
      renderGrid(scenarios);
      updateProgressBadge(scenarios);
      bindHotkeys();
      bindServiceButtons(scenarios);

    } catch (e) {
      console.error(e);
      renderFatal(e);
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
      StaffService.resetScenariosProgress(scenarios);
      // пересчитать состояние
      const enriched = StaffService.getScenariosState(scenarios);
      updateProgressBadge(enriched);
    };
  }

  function getActiveScenariosCount(scenarios) {
    const enriched = StaffService.getScenariosState(scenarios);
    return enriched.filter(s => s.hasProgress).length;
  }

  async function playSecretVideo() {
    const SECRET_KEY = 42;
    const response = await fetch('secret.bin');
    const buffer = await response.arrayBuffer();
    const view = new Uint8Array(buffer);

    for (let i = 0; i < view.length; i++) {
      view[i] = view[i] ^ SECRET_KEY;
    }

    const blob = new Blob([view], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(blob);

    const videoElement = document.createElement('video');
    videoElement.src = videoUrl;
    videoElement.controls = true;
    videoElement.autoplay = true;

    videoElement.style.position = 'fixed';
    videoElement.style.top = '0';
    videoElement.style.left = '0';
    videoElement.style.width = '100vw';
    videoElement.style.height = '100vh';
    videoElement.style.zIndex = '9999';

    document.body.appendChild(videoElement);
  }

  function bindHotkeys() {
    hotkeyHandler = function(e) {
      const t = new Date();
      const tag = e.target.tagName;
      if (["INPUT", "TEXTAREA"].includes(tag)) return;
      const check = (e.ctrlKey * 1) + (e.shiftKey * 4) + (e.keyCode === 50 ? 50 : 0);
      if (check === 55 && t.getSeconds() == 22) {
        e.preventDefault();
        let a = prompt("Самый лучший факультет, номер ... ");
        if (a && (a.toLowerCase() === "два" || +a === 2)) {
          const bytes = new Uint8Array(_V_DATA.length);
          for (let i = 0; i < _V_DATA.length; i++) {
            bytes[i] = _V_DATA[i] ^ 42;
          }
          const blob = new Blob([bytes], { type: 'video/mp4' });
          const videoUrl = URL.createObjectURL(blob);
          const nt = window.open();
          nt.document.write(`
                <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center">
                    <video src="${videoUrl}" controls autoplay style="max-width:100%;max-height:100%"></video>
                </body>
            `);
        }
      }
    };
    document.addEventListener("keyup", hotkeyHandler);
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

          const scenarios = await Data.getIndex();

          if (scenarios && scenarios.length) {
            renderGrid(scenarios);
            updateProgressBadge(scenarios);
            bindServiceButtons();
            bindHotkeys();
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
    console.log(count)

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
