window.DangerZone = function() {

  let root = null;
  let scenarios = [];
  let progressMap = {};

  async function loadScenarios() {
    await Data.init();
    scenarios = await Data.getScenarios();
    buildProgressMap();
  }

  function buildProgressMap() {
    progressMap = {};

    scenarios.forEach(s => {
      const prefix = s.id + ".";
      const current = localStorage.getItem(prefix + "current");
      const completed = JSON.parse(localStorage.getItem(prefix + "completed") || "[]");

      progressMap[s.id] = {
        hasProgress: current !== null || completed.length > 0,
        current,
        completed: completed.length
      };
    });
  }

  function resetScenario(id) {
    const prefix = id + ".";
    localStorage.removeItem(prefix + "current");
    localStorage.removeItem(prefix + "completed");
    localStorage.removeItem(prefix + "viewed");
    localStorage.removeItem(prefix + "confirmations");

    buildProgressMap();
    renderList();
  }

  function resetAllScenarios() {
    scenarios.forEach(s => resetScenario(s.id));
    alert("Прогресс всех сценариев сброшен.");
  }

  function fullReset() {
    const a = Math.floor(Math.random() * 50) + 10;
    const b = Math.floor(Math.random() * 50) + 10;

    const answer = prompt(`Для полного сброса введите: ${a} × ${b}`);

    if (Number(answer) !== a * b) {
      alert("Неверно. Сброс отменён.");
      return;
    }

    Object.keys(localStorage).forEach(key => {
      localStorage.removeItem(key);
    });

    alert("Полный сброс выполнен.");
    location.reload();
  }

  function renderList(filter = "", onlyActive = false) {

    const container = root.querySelector("#scenario-list");
    container.innerHTML = "";

    const filtered = scenarios.filter(s => {
      const titleMatch = s.title.toLowerCase().includes(filter.toLowerCase());
      const progressMatch = !onlyActive || progressMap[s.id].hasProgress;
      return titleMatch && progressMatch;
    });

    if (!filtered.length) {
      container.innerHTML = "<p>Ничего не найдено</p>";
      return;
    }

    filtered.forEach(s => {

      const progress = progressMap[s.id];

      const card = document.createElement("div");
      card.className = "danger-card";

      card.innerHTML = `
        <div class="danger-card-top">
          <strong>${s.title}</strong>
          ${progress.hasProgress
          ? `<span class="badge active">В процессе</span>`
          : `<span class="badge">Нет прогресса</span>`
        }
        </div>
        <div class="danger-meta">
          Текущий шаг: ${progress.current ?? "-"} |
          Выполнено: ${progress.completed}
        </div>
        <div class="danger-actions">
          <button data-id="${s.id}" class="button small info">
            Сбросить
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".btn-reset-one").forEach(btn => {
      btn.onclick = () => resetScenario(btn.dataset.id);
    });
  }

  function render() {

    root.innerHTML = `
      <h2>Опасная зона</h2>
      <p>Управление состоянием системы</p>

      <div class="danger-toolbar">
        <input class="input" id="search-scenario" type="text" placeholder="Поиск сценария...">
        <label>
          <input type="checkbox" id="only-active">
          Только с прогрессом
        </label>
        <button class="button button--warning" id="reset-all">Сбросить все сценарии</button>
      </div>

      <div id="scenario-list" class="danger-grid"></div>

      <hr>

      <div class="danger-full-reset">
        <h3>Полный сброс системы</h3>
        <button id="full-reset" class="button button--warning">
          Полный сброс
        </button>
      </div>
    `;

    root.querySelector("#search-scenario").oninput = e => {
      renderList(e.target.value, root.querySelector("#only-active").checked);
    };

    root.querySelector("#only-active").onchange = () => {
      renderList(
        root.querySelector("#search-scenario").value,
        root.querySelector("#only-active").checked
      );
    };

    root.querySelector("#reset-all").onclick = resetAllScenarios;
    root.querySelector("#full-reset").onclick = fullReset;

    renderList();
  }

  async function mount() {
    root = document.getElementById("danger-zone");
    await loadScenarios();
    render();
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
