const grid = document.getElementById("grid");
const dutyApp = document.getElementById("duty-app");

let utils = window.utils;

// проверяю есть ли данные
(async () => {
  try {
    await Data.init();
    const scenarios = await Data.getStaff();

    if (!scenarios.length) {
      showImportUI();
      return;
    }

    render(scenarios);
    bindHotkeys(scenarios);
  } catch (e) {
    utils.showFatalError(`Ошибка - ${e}`);
  }
})()

function showImportUI() {
  const app = document.getElementById("duty-app");
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

      <label class="import-button">
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


function bindHotkeys(scenarios) {
  document.addEventListener("keyup", (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const scenario = scenarios.find(
      s => s.hotkey === e.code
    );
    if (!scenario) return;
    window.location.href = `scenario.html?name=${scenario.id}`;
  });
}


function render(scenarios) {
  scenarios.forEach(s => {
    const a = document.createElement("a");
    a.className = "tile " + s.color;
    a.href = "scenario.html?name=" + s.id;
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
