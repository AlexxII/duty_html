window.ScenarioBuilder = function() {

  let root = null;

  const state = {
    scenario: { id: "", title: "", color: "", steps: [] }
  };

  function mount() {
    root = document.getElementById("scenario-builder");
    render();
    bindEvents();
  }

  function unmount() { root.innerHTML = ""; }

  function render() {
    root.innerHTML = `
      <div class="builder">

        <div class="builder-section">
          <h2>Сценарий</h2>
          <div class="builder-grid">
            <div>
              <div class="builder-field">
              <label>ID</label>
              <input id="scenario-id" class="input xl">
              </div>

              <div class="builder-field">
              <label>Цвет</label>
              <input id="scenario-color" class="input xl">
              </div>

              <div class="builder-field">
              <label>Название</label>
              <input id="scenario-title" class="input xl">
              </div>
            </div>

            <div class="builder-warning">
              <button id="export" class="button button--primary">Экспорт</button>
            </div>


          </div>

          <div class="builder-pages">
            <button id="add-step" class="button button--secondary">Добавить шаг</button>
          </div>

        </div>


        <div id="steps"></div>

      </div>
    `;

    renderSteps();
  }

  function renderSteps() {
    const container = root.querySelector("#steps");
    container.innerHTML = "";

    state.scenario.steps.forEach((step, i) => {
      const el = document.createElement("div");
      el.className = "step-card";

      el.innerHTML = `
        <div class="step-header">
          <input class="step-title" data-step="${i}" placeholder="Название шага" value="${step.title || ""}">

          <div class="step-controls">
            <label>день <input type="checkbox" class="step-day" data-step="${i}"></label>
            <label>ночь <input type="checkbox" class="step-night" data-step="${i}"></label>
            <button class="delete-step" data-step="${i}">✕</button>
          </div>
        </div>

        <button class="add-action" data-step="${i}">Добавить действие</button>

        <div id="actions-${i}"></div>
      `;

      container.appendChild(el);
      renderActions(i);
    });
  }

  function renderActions(i) {
    const container = root.querySelector(`#actions-${i}`);
    const step = state.scenario.steps[i];
    container.innerHTML = "";

    step.text.forEach((a, j) => {
      const el = document.createElement("div");
      el.className = "action-card";

      el.innerHTML = `
        <div class="builder-grid">
          <div class="builder-field">
            <label>Тип</label>
            <select class="action-type" data-step="${i}" data-action="${j}">
              <option value="action">action</option>
              <option value="notify">notify</option>
              <option value="info">info</option>
            </select>
          </div>

          <div class="builder-field">
            <label>Вариант</label>
            <select class="action-variant" data-step="${i}" data-action="${j}">
              <option value="default">default</option>
              <option value="warning">warning</option>
            </select>
          </div>
        </div>

        <div class="builder-grid full">
          <div class="builder-field">
            <label>Текст</label>
            <input class="action-value" data-step="${i}" data-action="${j}" value="${a.value || ""}">
          </div>
        </div>

        <div class="preview" id="preview-${i}-${j}"></div>
      `;

      container.appendChild(el);
      renderPreview(i, j);
    });
  }

  function renderPreview(i, j) {
    const a = state.scenario.steps[i].text[j];
    const el = root.querySelector(`#preview-${i}-${j}`);
    el.innerHTML = `<div class="item ${a.type} ${a.variant}">${a.value || ""}</div>`;
  }

  function bindEvents() {
    root.addEventListener("click", e => {
      if (e.target.id === "add-step") addStep();

      if (e.target.classList.contains("delete-step")) {
        state.scenario.steps.splice(e.target.dataset.step, 1);
        renderSteps();
      }

      if (e.target.classList.contains("add-action")) addAction(e.target.dataset.step);

      if (e.target.classList.contains("delete-action")) {
        const i = e.target.dataset.step;
        const j = e.target.dataset.action;
        state.scenario.steps[i].text.splice(j, 1);
        renderActions(i);
      }

      if (e.target.id === "export") {
        root.querySelector("#output").textContent = JSON.stringify(state.scenario, null, 2);
      }
    });

    root.addEventListener("input", e => {
      const t = e.target;

      if (t.classList.contains("action-value")) {
        const a = getAction(t);
        a.value = t.value;
        renderPreview(t.dataset.step, t.dataset.action);
      }

      if (t.classList.contains("action-type")) {
        const a = getAction(t);
        a.type = t.value;
        renderPreview(t.dataset.step, t.dataset.action);
      }

      if (t.classList.contains("action-variant")) {
        const a = getAction(t);
        a.variant = t.value;
        renderPreview(t.dataset.step, t.dataset.action);
      }
    });
  }

  function getAction(t) {
    return state.scenario.steps[t.dataset.step].text[t.dataset.action];
  }

  function addStep() {
    state.scenario.steps.push({ title: "", text: [] });
    renderSteps();
  }

  function addAction(i) {
    state.scenario.steps[i].text.push({ type: "action", value: "", variant: "default" });
    renderActions(i);
  }

  return { mount, unmount };
};
