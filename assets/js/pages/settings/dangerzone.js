window.DangerZone = function() {

  let root = null;
  let scenarios = [];
  let raw = [];

  async function loadScenarios() {
    raw = await Data.getScenarios();
    scenarios = ScenarioService.getState(raw);
  }

  async function reload() {
    raw = await Data.getScenarios();
    scenarios = ScenarioService.getState(raw);
    renderList(
      root.querySelector("#search-scenario")?.value || "",
      root.querySelector("#only-active")?.checked || false
    );
  }

  function resetScenario(id) {
    const scenario = scenarios.find(s => s.id == id);
    if (!scenario) return;

    ScenarioService.resetProgress([scenario]);
    reload();
  }

  function resetAllScenarios() {
    ScenarioService.resetProgress(scenarios);
    reload();
  }

  function fullReset() {
    const a = Math.floor(Math.random() * 50) + 10;
    const b = Math.floor(Math.random() * 50) + 10;

    const answer = prompt(`Для полного сброса введите: ${a} + ${b}`);

    if (Number(answer) !== a + b) {
      alert("Неверно. Сброс отменён.");
      return;
    }

    localStorage.clear();
    Data.clear();
    window.location.replace("index.html");
  }

  function renderList(filter = "", onlyActive = false) {

    const container = root.querySelector("#scenario-list");
    container.innerHTML = "";

    const filtered = scenarios.filter(s => {
      const titleMatch = s.title.toLowerCase().includes(filter.toLowerCase());
      const progressMatch = !onlyActive || s.hasProgress;
      return titleMatch && progressMatch;
    });

    if (!filtered.length) {
      container.innerHTML = "<p>Ничего не найдено</p>";
      return;
    }

    filtered.forEach(s => {

      const card = document.createElement("div");
      card.className = "danger-card";

      card.innerHTML = `
        <div class="danger-card-top">
          <strong>${s.title}</strong>
          ${s.hasProgress
          ? `<span class="badge active">В процессе</span>`
          : `<span class="badge">Нет прогресса</span>`
        }
        </div>
        <div class="danger-meta">
          Текущий шаг: ${s.current ?? "-"} |
          Выполнено: ${s.completed}
        </div>
        <div class="danger-actions">
          <button data-id="${s.id}" class="reset-one-scenario button small info">
            Сбросить
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".reset-one-scenario").forEach(btn => {
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

      <p></p>

      <div class="danger-reencrypt">
        <h3>Смена пароля и перешифрование</h3>
        <div class="danger-desc">
          Все данные будут зашифрованы новым паролем. Старые файлы станут недоступны. Будьте внимательны. Операция необратима!
        </div>
        <button id="reencrypt-all" class="button button--warning">
          Перешифровать данные
        </button>
      </div>

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

    root.querySelector("#reencrypt-all").onclick = async () => {
      const ok = confirm(
        "Старые файлы станут недействительными. Продолжить?"
      );
      if (!ok) return;
      try {
        const files = await Data.reencryptAll();
        // если есть zip
        await downloadAsZip(files);
      } catch (e) {
        alert(e.message);
      }
    };

    renderList();
  }

  async function downloadAsZip(files) {
    const zip = new JSZip();

    // --- data ---
    if (files.data) {
      const dataFolder = zip.folder("data");

      for (const [name, content] of Object.entries(files.data)) {
        dataFolder.file(
          name,
          JSON.stringify(content, null, 2)
        );
      }
    }

    // --- scenarios ---
    if (files.scenarios) {
      const scenariosFolder = zip.folder("scenarios");

      for (const [name, content] of Object.entries(files.scenarios)) {
        const isIndex = name === "index.json";

        scenariosFolder.file(
          name,
          isIndex
            ? JSON.stringify(content, null, 2)
            : JSON.stringify(content, null, 2)
        );
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });

    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);

    a.href = url;
    a.download = "export.zip";
    a.click();

    URL.revokeObjectURL(url);
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
