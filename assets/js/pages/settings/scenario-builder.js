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

  const ACTION_RENDERERS = {
    action: renderTextEditor,
    notify: renderNotifySelector,
    info: renderInfoInput
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
            <input id="scenario-id" class="input xxl" placeholder="Латиницей, например fire, attack и т.д.">
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

  function appendStep(step, i) {
    const el = document.createElement("div");
    el.className = "step-card";
    el.dataset.step = i;

    el.innerHTML = `
      <div class="step-header">
      <div class="step-input">
        <input class="constructor-step-title input xxl" placeholder="Название шага, например Вызвать помощь" 
            value="${step.title || ""}">
      </div>
        <div class="step-controls">
          <label>Рабочее <input type="checkbox" class="step-day"></label>
          <label>Нерабочее <input type="checkbox" class="step-night"></label>
        </div>
        <div class="step-deletion">
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
          <option value="flat">flat</option>
          <option value="warning">warning</option>
        </select>
      </div>
      <div class="builder-field">
        <div class="step-controls">
          <label>Подтверждение<input type="checkbox" class="confirm"></label>
        </div>
      </div>
      <div class="builder-field">
        <div class="step-controls">
          <label>Рабочее <input type="checkbox" class="step-day"></label>
          <label>Нерабочее <input type="checkbox" class="step-night"></label>
        </div>
      </div>
      <div class="action-deletion">
        <button class="delete-action button--warning button">✕</button>
      </div>
    </div>

    <div class="action-content"></div>

  `;

    const type = el.querySelector(".action-type");
    const variant = el.querySelector(".action-variant");
    const contentRoot = el.querySelector(".action-content");

    // восстановление значений
    type.value = action.type;
    variant.value = action.variant;

    renderActionContent(action, contentRoot)

    type.onchange = () => {
      action.type = type.value;
      contentRoot.innerHTML = "";
      renderActionContent(action, contentRoot);
    };

    variant.onchange = () => action.variant = variant.value;

    el.querySelector(".delete-action").onclick = () => {
      const idx = step.text.indexOf(action);
      if (idx !== -1) step.text.splice(idx, 1);
      el.remove();
    };

    container.appendChild(el);
  }


  function renderActionContent(action, container) {
    const renderer = ACTION_RENDERERS[action.type];
    if (renderer) renderer(action, container);
  }

  function renderTextEditor(action, container) {
    const wrapper = document.createElement("div");

    const toolbar = document.createElement("div");
    toolbar.className = "action-toolbar";

    const textarea = document.createElement("textarea");
    textarea.className = "input";
    textarea.value = action.value || "";

    textarea.oninput = () => {
      action.value = textarea.value;
    };

    function wrapSelection(before, after) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      let text = textarea.value;
      let selected = text.slice(start, end);

      const hasWrap =
        text.slice(start - before.length, start) === before &&
        text.slice(end, end + after.length) === after;

      if (hasWrap) {
        // снять форматирование
        text =
          text.slice(0, start - before.length) +
          selected +
          text.slice(end + after.length);

        textarea.value = text;
        action.value = text;

        textarea.focus();
        textarea.selectionStart = start - before.length;
        textarea.selectionEnd = end - before.length;
      } else {
        // добавить форматирование
        text =
          text.slice(0, start) +
          before + selected + after +
          text.slice(end);

        textarea.value = text;
        action.value = text;

        textarea.focus();
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = end + before.length;
      }
    }

    // кнопка bold
    const boldBtn = document.createElement("button");
    boldBtn.type = "button";
    boldBtn.textContent = "B";
    boldBtn.onclick = () => wrapSelection("**", "**");

    // кнопка italic
    const italicBtn = document.createElement("button");
    italicBtn.type = "button";
    italicBtn.textContent = "I";
    italicBtn.onclick = () => wrapSelection("*", "*");

    toolbar.appendChild(boldBtn);
    toolbar.appendChild(italicBtn);

    wrapper.appendChild(toolbar);
    wrapper.appendChild(textarea);

    container.appendChild(wrapper);
  }

  function renderNotifySelector(action, container) {
    const select = document.createElement("select");
    ["all", "admin", "user"].forEach(v => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
    select.value = action.value || "all";
    select.onchange = () => action.value = select.value;
    container.appendChild(select);
  }

  function renderInfoInput(action, container) {
    const input = document.createElement("input");
    input.value = action.value || "";
    input.oninput = () => action.value = input.value;
    container.appendChild(input);
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
