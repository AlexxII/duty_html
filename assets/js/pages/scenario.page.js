window.ScenarioPage = function() {

  let root = null;

  async function mount(container, params) {
    root = container;
    const id = params.get("id");
    if (!id) {
      renderFallback("Не указан сценарий.");
      return;
    }
    try {
      await Data.init();
      const scenario = await Data.getScenarioById(id);
      if (!scenario) {
        renderFallback(`Сценарий "${id}" не найден.`);
        return;
      }
      renderBaseLayout(scenario.title);
      if (scenario.mode === true) {
        renderModeSelect(scenario);
      } else {
        window.APP_MODE = "all";
        renderScenario(scenario);
      }
    } catch (e) {
      renderFallback(e.message || e);
    }
  }

  function renderBaseLayout(title) {
    root.innerHTML = `
      <div class="page-scenario">
        <header class="topbar">
          <div>
            <a href="#/" class="back-btn">
              &larr; На главную
            </a>
          </div>
          <h2 id="scenario-title">${title}</h2>
          <div class="right-side">
            <button id="reset-storage" class="nav button button--warning" 
              data-tooltip="Сбросить прогресс сценария">Сбросить</button>
            <div id="clock"></div>
          </div>
        </header>
        <div id="scenario-root"></div>
      </div>
    `;
    Clock.start();
  }

  function renderFallback(message) {
    root.innerHTML = `
      <div class="fallback">
        <h1>Сценарий недоступен</h1>
        <p>${message}</p>
        <a href="#/" class="back-btn">
          &larr; На главную
        </a>
      </div>
    `;
  }

  function renderModeSelect(scenario) {
    const area = root.querySelector("#scenario-root");
    area.innerHTML = `
      <div class="mode-select">
        <h2>Выберите время</h2>
        <div>
          <button data-mode="day">Рабочее</button>
          <button data-mode="night">Не рабочее</button>
        </div>
      </div>
    `;

    area.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        window.APP_MODE = btn.dataset.mode;
        renderScenario(scenario);
      };
    });
  }

  function renderScenario(scenario) {
    const area = root.querySelector("#scenario-root");
    area.innerHTML = `
      <div id="app" class="app">
        <aside class="steps" id="steps"></aside>
        <main class="content">
          <div id="step-title"></div>

          <div id="step-text" class="step-text"></div>
          <div id="step-progress" class="step-progress"></div>

          <div class="actions">
            <button class="button button--primary" id="prev">Назад</button>
            <button class="button button--secondary" id="next">Выполнено</button>
          </div>
          <p></p>
        </main>
      </div>
    `;
    startScenario(scenario);
  }

  function unmount() {
    Clock.stop();
    root.innerHTML = "";
  }

  return { mount, unmount };
};
