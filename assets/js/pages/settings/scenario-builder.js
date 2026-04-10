window.ScenarioBuilder = function() {

  let root = null;
  let stepsRoot = null;
  let currentStepIndex = 0;
  const COLORS = [
    "#e53935", // red
    "#d81b60", // pink
    "#8e24aa", // purple
    "#5e35b1", // deep purple
    "#3949ab", // indigo
    "#1e88e5", // blue
    "#00897b", // teal
    "#43a047", // green
    "#fdd835", // yellow
    "#fb8c00"  // orange
  ];

  const ALERT_TEXT = `
    <div class="export-text">
      Внимание: перед закрытием вкладки сделайте экспорт, иначе данные будут уничтожены безвозвратно
    </div>
  `;

  const state = {
    scenario: { id: "", title: "", color: "", steps: [] }
  };

  function mount() {
    root = document.getElementById("scenario-builder");
    root.innerHTML = layout();
    stepsRoot = root.querySelector("#steps");
    bindTop();
    renderColorPicker();
  }

  function unmount() { root.innerHTML = ""; }

  function layout() {
    return `
      <div class="builder">
        <div class="builder-section">
          <h2>Сценарий</h2>
          <div class="builder-grid--3">
            <label>ID:</label>
            <input id="scenario-id" class="input xxl" placeholder="Латинскими буквами короткое название">
            <div class="export-block" rowspan="3">
              ${ALERT_TEXT}
              <button id="export" class="button button--primary">Экспорт</button>
            </div>

            <label>Цвет <span style="font-size: 14px">(должен соответствовать цвету папки):</span></label>
            <div class="color-picker" id="scenario-color"></div>

            <label>Название сценария:</label>
            <input id="scenario-title" class="input xxl" placeholder="Например пожар, сбор">
          </div>
          <div class="builder-pages">
            <button id="add-step" class="button button--secondary">Добавить шаг</button>
            <div id="steps-counter"></div>
          </div>
        </div>

        <div id="steps"></div>
      </div>
    `;
  }

  function renderStep(index) {
    stepsRoot.innerHTML = "";

    const step = state.scenario.steps[index];
    if (!step) return;

    appendStep(step, index);
  }

  function renderAction(step, action, container) {
    const el = document.createElement("div");
    el.className = "action-card";

    el.innerHTML = `
    <div class="builder-grid">
      <div class="builder-field">
        <label>Тип</label>
        <select class="action-type">
          <option value="action">action</option>
          <option value="notify">notify</option>
          <option value="info">info</option>
        </select>
      </div>
      <div class="builder-field">
        <label>Вариант</label>
        <select class="action-variant">
          <option value="default">default</option>
          <option value="warning">warning</option>
        </select>
      </div>
    </div>

    <div class="builder-grid full">
      <div class="builder-field">
        <label>Текст</label>
        <input class="action-value">
      </div>
    </div>

    <button class="delete-action button--warning button">✕</button>
  `;

    const type = el.querySelector(".action-type");
    const variant = el.querySelector(".action-variant");
    const value = el.querySelector(".action-value");

    // восстановление значений
    type.value = action.type;
    variant.value = action.variant;
    value.value = action.value;

    // бинды
    type.onchange = () => action.type = type.value;
    variant.onchange = () => action.variant = variant.value;
    value.oninput = () => action.value = value.value;

    el.querySelector(".delete-action").onclick = () => {
      const idx = step.text.indexOf(action);
      if (idx !== -1) step.text.splice(idx, 1);
      el.remove();
    };

    container.appendChild(el);
  }

  function renderColorPicker() {
    const container = root.querySelector("#scenario-color");
    container.innerHTML = "";

    COLORS.forEach(color => {
      const el = document.createElement("div");
      el.className = "color-swatch";
      el.style.background = color;

      if (state.scenario.color === color) {
        el.classList.add("active");
      }

      el.onclick = () => {
        state.scenario.color = color;
        renderColorPicker();
      };

      container.appendChild(el);
    });
  }

  function appendStep(step, i) {
    const el = document.createElement("div");
    el.className = "step-card";
    el.dataset.step = i;

    el.innerHTML = `
      <div class="step-header">
        <input class="constructor-step-title input xxl" placeholder="Название шага" value="${step.title || ""}">
        <div class="step-controls">
          <label>день <input type="checkbox" class="step-day"></label>
          <label>ночь <input type="checkbox" class="step-night"></label>
          <button class="delete-step button--warning button">✕</button>
        </div>
      </div>
      <button class="add-action button button--secondary">Добавить действие</button>
      <div class="actions"></div>
    `;

    // bind step events
    const title = el.querySelector(".constructor-step-title");
    title.addEventListener("input", () => step.title = title.value);

    const day = el.querySelector(".step-day");
    const night = el.querySelector(".step-night");

    function updateWhen() {
      const w = [];
      if (day.checked) w.push("day");
      if (night.checked) w.push("night");
      step.when = w.length ? w : null;
    }

    day.onchange = updateWhen;
    night.onchange = updateWhen;

    el.querySelector(".delete-step").onclick = () => {
      const idx = state.scenario.steps.indexOf(step);
      if (idx !== -1) state.scenario.steps.splice(idx, 1);

      if (currentStepIndex >= state.scenario.steps.length) {
        currentStepIndex = state.scenario.steps.length - 1;
      }

      renderStep(currentStepIndex);
      updateStepsCounter();
    };

    el.querySelector(".add-action").onclick = () => {
      addAction(step, el.querySelector(".actions"));
    };

    const actionsContainer = el.querySelector(".actions");

    (step.text || []).forEach(action => {
      renderAction(step, action, actionsContainer);
    });

    stepsRoot.appendChild(el);
  }

  function updateStepsCounter() {
    const stepper = document.querySelector("#steps-counter");
    stepper.innerHTML = '';

    state.scenario.steps.forEach((_, i) => {
      const el = document.createElement("span");
      el.textContent = i + 1;

      if (i === currentStepIndex) {
        el.classList.add("active");
      }

      el.onclick = () => {
        currentStepIndex = i;
        renderStep(currentStepIndex);
        updateStepsCounter();
      };

      stepper.appendChild(el);
    });
  }

  function addAction(step, container) {
    const action = {
      type: "action",
      value: "",
      variant: "default",
      confirm: false
    };

    step.text.push(action);
    renderAction(step, action, container);
  }

  function bindTop() {
    root.querySelector("#add-step").onclick = () => {
      const step = { title: "", text: [] };
      state.scenario.steps.push(step);
      currentStepIndex = state.scenario.steps.length - 1;
      renderStep(currentStepIndex);
      updateStepsCounter();
    };

    root.querySelector("#export").onclick = () => {
      console.log(state)
      // root.querySelector("#output").textContent = JSON.stringify(state.scenario, null, 2);
    };

    root.querySelector("#scenario-id").oninput = e => state.scenario.id = e.target.value;
    root.querySelector("#scenario-title").oninput = e => state.scenario.title = e.target.value;
    root.querySelector("#scenario-color").oninput = e => state.scenario.color = e.target.value;
  }

  return { mount, unmount };
};
