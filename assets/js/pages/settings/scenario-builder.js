window.ScenarioBuilder = function() {

  const DRAFT_KEY = "scenario.builder.draft";

  let root = null;
  let stepsRoot = null;
  let currentStepIndex = 0;
  let rolesData = null;
  let roles = []
  let staff = []
  let previewRoot = null;
  const COLORS = [
    "red", // red
    "blue", // pink
    "green", // purple
    "yellow", // deep purple
    "orange", // indigo
    // "#1e88e5", // blue
    // "#00897b", // teal
    // "#43a047", // green
    // "#fdd835", // yellow
    // "#fb8c00"  // orange
  ];

  const ALERT_TEXT = `
    <div class="export-text">
      Внимание: перед закрытием вкладки сделайте экспорт, иначе данные будут уничтожены безвозвратно
    </div>
  `;

  const state = {
    scenario: { id: "", title: "", color: "", steps: [] }
  };

  let saveTimer = null;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      SecureStorage.setItem(DRAFT_KEY, {
        version: 1,
        data: state
      });
      showSavedIndicator();
    }, 500);
  }

  function showSavedIndicator() {
    let el = document.getElementById("draft-status");
    if (!el) return;

    el.textContent = "Сохранено";
    el.style.opacity = 1;

    setTimeout(() => {
      el.style.opacity = 0.5;
    }, 1000);
  }

  const ACTION_RENDERERS = {
    action: renderTextEditor,
    notify: renderNotifySelector,
    info: renderTextEditor
  };

  async function load() {
    roles = await Data.getRoles();
    staff = await Data.getStaff();
    // форматируем список для далнейшей работы 
    rolesData = groupRolesE(roles)
    // загрузка состояния с памяти
    await loadDraft();
  }

  async function loadDraft() {
    const draft = await SecureStorage.getItem(DRAFT_KEY);
    if (!draft) return false;
    if (draft.version !== 1) return false;
    const ok = confirm("Найден несохранённый сценарий. Восстановить?");
    if (!ok) {
      SecureStorage.removeItem(DRAFT_KEY);
      return false;
    }
    state = draft.data;
    return true;
  }

  window.addEventListener("beforeunload", (e) => {
    if (!state.steps.length) return;
    e.preventDefault();
    e.returnValue = "";
  });

  function groupRolesE(roles) {
    let rolesPool = [];
    for (const [key, value] of Object.entries(roles)) {
      rolesPool.push({ title: value.title, role: key })
    }
    return rolesPool
  }

  function groupRoles(roles, staff) {
    console.log(roles)
    let rolesPool = [];
    for (const [key, value] of Object.entries(roles)) {
      if (key == "duty_assistant") {
        let person = [];
        value.staffIds.forEach(id => {
          person.push(StaffService.getStaffById(staff, id));
        });
        rolesPool.push({ title: "Помощник дежурного", person });
      } else {
        rolesPool.push({ title: value.title, person: StaffService.getStaffById(staff, value.staffId) })
      }
    }
    return rolesPool;
  }

  async function mount() {
    await load()
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
          <div id="draft-status" style="opacity:0.5;font-size:12px;">Черновик</div>
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

    if (step.when) {
      day.checked = step.when.includes("day");
      night.checked = step.when.includes("night");
    }

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
      <div style="display: flex; gap: 20px">
        <div class="builder-field">
          <label>Тип</label>
          <select class="action-type">
            <option value="action">Действие</option>
            <option value="notify">Оповещение</option>
            <option value="info">Информация</option>
          </select>
        </div>
        <div class="builder-field variant-field">
          <label>Вариант</label>
          <select class="action-variant">
            <option value="default">default</option>
            <option value="flat">flat</option>
            <option value="warning">warning</option>
          </select>
        </div>
        <div class="builder-field confirm-field">
          <div class="step-controls">
            <label>Подтверждение<input type="checkbox" class="confirm"></label>
          </div>
        </div>
        <div class="builder-field day-night">
            <label>Нерабочее <input type="checkbox" class="action-night"></label>
        </div>
        <div class="builder-field day-night">
            <label>Рабочее <input type="checkbox" class="action-day"></label>
        </div>
      </div>
      <div class="action-deletion">
        <button class="delete-action button--warning button">✕</button>
      </div>
    </div>

    <div class="action-content">
      <div class="action-editor"></div>
      <div class="action-preview">
        <div class="preview-header">
          Пример отображения
        </div>
        <div class="preview-content"></div>
      </div>
    </div>

  `;

    const type = el.querySelector(".action-type");
    const variant = el.querySelector(".action-variant");
    const contentRoot = el.querySelector(".action-editor");
    previewRoot = el.querySelector(".preview-content");
    let confirm = el.querySelector(".confirm")
    let day = el.querySelector(".action-day");
    let night = el.querySelector(".action-night");

    // восстановление значений
    type.value = action.type;
    variant.value = action.variant;
    confirm.checked = action.confirm;

    const typeSelect = el.querySelector('.action-type');
    const variantField = el.querySelector('.variant-field');
    const confirmField = el.querySelector('.confirm-field');

    function updateUI() {
      const isInfo = typeSelect.value === 'info';
      variantField.classList.toggle('hidden', !isInfo);
      confirmField.classList.toggle('hidden', isInfo);
    }
    typeSelect.addEventListener('change', updateUI);
    updateUI();

    if (action.when) {
      day.checked = action.when.includes("day");
      night.checked = action.when.includes("night");
    }

    renderActionContent(action, contentRoot, previewRoot);
    renderPreview(action, previewRoot);

    type.onchange = () => {
      action.type = type.value;
      contentRoot.innerHTML = "";
      renderActionContent(action, contentRoot, previewRoot);
      renderPreview(action, previewRoot);
    };

    confirm.onchange = () => {
      action.confirm = confirm.checked;
      renderPreview(action, previewRoot);
    }

    // изменение отображения - default - warning - flat
    variant.onchange = () => {
      action.variant = variant.value;
      renderPreview(action, previewRoot)
    };

    // изменение параметров по параметру - рабочее/нерабочее время
    function updateWhen() {
      const w = [];
      if (day.checked) w.push("day");
      if (night.checked) w.push("night");
      action.when = w.length ? w : null;
    }
    day.onchange = updateWhen;
    night.onchange = updateWhen;

    el.querySelector(".delete-action").onclick = () => {
      const idx = step.text.indexOf(action);
      if (idx !== -1) step.text.splice(idx, 1);
      el.remove();
    };

    container.appendChild(el);
  }

  // mini-markdown
  function formatInline(text) {
    if (!text) return "";
    // экранируем HTML чтобы исключить <script>
    const escapeHtml = str =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let safe = escapeHtml(text);

    // **bold**
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // *italic*
    safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // $\color{blue}{text}$
    safe = safe.replace(
      /\$\\color\{(.*?)\}\{(.*?)\}\$/g,
      '<span class="text-color-$1">$2</span>'
    );
    return safe;
  }

  function renderPreview(action, container) {
    container.innerHTML = "";
    const stepLine = document.createElement("div");
    stepLine.className = "step-line";
    stepLine.classList.add("no-anim");
    const prompt = "Вводите текст слева"

    if (action.type == "action") {
      if (action.confirm) {
        const confirmLine = document.createElement("div");
        confirmLine.className = "confirm-line";
        const confirmLabel = document.createElement("label");

        const confInput = document.createElement("input");
        confInput.type = "checkbox";

        const confirmContent = document.createElement("div");
        confirmContent.className = "confirm-content"
        confirmContent.innerHTML = formatInline(action.value) || prompt;

        confirmLabel.append(confInput, confirmContent);
        confirmLine.appendChild(confirmLabel);
        stepLine.appendChild(confirmLine)

      } else {

        const plainLine = document.createElement("div");
        plainLine.className = "plain-line";

        const paragraph = document.createElement("div");
        paragraph.innerHTML = formatInline(action.value) || prompt

        plainLine.appendChild(paragraph);
        stepLine.appendChild(plainLine);

      }
    } else if (action.type == "info") {
      const infoLine = document.createElement("div")
      infoLine.className = "info-line"
      const infoParagraph = document.createElement("div");
      infoParagraph.className = "info-paragraph";
      infoParagraph.innerHTML = formatInline(action.value) || prompt;
      infoLine.appendChild(infoParagraph);
      stepLine.appendChild(infoLine);

      if (action.variant == "flat") {
        infoLine.classList.add("variant-flat")
      }
      if (action.variant == "warning") {
        infoLine.classList.add("variant-warning")
      }
    } else {
      const line = createNotifyPreview(action);
      container.appendChild(line)
    }
    container.appendChild(stepLine)
  }

  function createNotifyPreview(action) {
    //.confirm-line или .plain-line
    const line = document.createElement("div");
    line.className = action.confirm ? "confirm-line" : "plain-line";
    line.classList.add("notify");

    const label = document.createElement("label");

    if (action.confirm) {
      const ch = document.createElement("input");
      ch.type = "checkbox";
      label.append(ch)
    }
    let personFio = null;
    let personPosition = null;
    let phones = null;

    const person = StaffService.getStaffByRole(staff, roles, action.value);
    if (person) {
      personFio = window.utils.fioToShort(person.fio);
      personPosition = person.position;
      phones = StaffService._getPhone(person)
    }

    //.confirm-content
    const confirmContent = document.createElement("div");
    confirmContent.className = "confirm-content";
    confirmContent.classList.add("notify");
    label.append(confirmContent)

    const position = document.createElement("div")
    position.className = "position"
    position.innerText = personPosition || "должность"

    const staffStatus = document.createElement("div")
    staffStatus.className = "staff-status";

    const fioName = document.createElement("span")
    fioName.className = "fio-name";
    fioName.innerText = personFio || "ФИО"

    const phoneNumber = document.createElement("span")
    phoneNumber.className = "phone-number";
    phoneNumber.innerText = phones || " телефоны"

    staffStatus.append(fioName, phoneNumber);
    confirmContent.append(position, staffStatus);
    label.append(confirmContent);

    line.appendChild(label)
    return line
  }

  function renderActionContent(action, container, preview) {
    const renderer = ACTION_RENDERERS[action.type];
    if (renderer) renderer(action, container, preview);
  }


  function renderTextEditor(action, container, preview) {
    const wrapper = document.createElement("div");

    const toolbar = document.createElement("div");
    toolbar.className = "action-toolbar";

    const textarea = document.createElement("textarea");
    textarea.className = "input";
    textarea.value = action.value || "";

    textarea.oninput = () => {
      action.value = textarea.value;
      renderPreview(action, preview)
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
      const event = new Event('input', {
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(event);
    }

    function wrapColor(color) {
      const before = `$\\color{${color}}{`;
      const after = `}$`;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      let text = textarea.value;
      let selected = text.slice(start, end);

      const hasWrap =
        text.slice(start - before.length, start) === before &&
        text.slice(end, end + after.length) === after;

      if (hasWrap) {
        // снять цвет
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
        // добавить цвет
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
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function createColorBtn(color, className) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.textContent = "";
      btn.onclick = () => wrapColor(color);
      return btn;
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

    // кнопка color
    const colorBtn = document.createElement("button");
    colorBtn.type = "button";
    colorBtn

    const blueBtn = createColorBtn("blue", "text-color-blue");
    const redBtn = createColorBtn("red", "text-color-red");
    const orangeBtn = createColorBtn("orange", "text-color-orange");
    const yellowBtn = createColorBtn("yellow", "text-color-yellow");

    toolbar.appendChild(boldBtn);
    toolbar.appendChild(italicBtn);

    toolbar.appendChild(blueBtn);
    toolbar.appendChild(redBtn);
    toolbar.appendChild(orangeBtn);
    toolbar.appendChild(yellowBtn);

    wrapper.appendChild(toolbar);
    wrapper.appendChild(textarea);

    container.appendChild(wrapper);
  }



  function renderNotifySelector(action, container) {
    const wrapper = document.createElement("div")
    const header = document.createElement("div")
    header.className = "action-toolbar"
    header.innerText = "Выбирите должностное лицо для оповещения"

    const select = document.createElement("select");
    rolesData.forEach(val => {
      select.append(new Option(val.title, val.role))
    })
    select.value = action.value;
    select.onchange = () => {
      action.value = select.value
      renderPreview(action, previewRoot)
    }
    const selectWrapper = document.createElement("div")
    selectWrapper.className = "select-wrapper"
    selectWrapper.appendChild(select)

    const help = document.createElement("div")
    help.className = "select-help"
    help.innerText = `Помощник дежурного в боевом интерефейсе будет отображаться массивом оповещения т.е. все помощники`

    wrapper.append(header, selectWrapper, help)
    container.appendChild(wrapper);
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
      // draft save
      scheduleSave();
      currentStepIndex = state.scenario.steps.length - 1;
      renderStep(currentStepIndex);
      updateStepsCounter();
    };

    root.querySelector("#export").onclick = () => {
      console.log(state)
      // root.querySelector("#output").textContent = JSON.stringify(state.scenario, null, 2);
    };

    root.querySelector("#scenario-id").oninput = e => {
      state.scenario.id = e.target.value
      // draft save
      scheduleSave();
    };
    root.querySelector("#scenario-title").oninput = e => {
      state.scenario.title = e.target.value
      // draft save
      scheduleSave();
    };
    root.querySelector("#scenario-color").oninput = e => {
      state.scenario.color = e.target.value;
      // draft save
      scheduleSave();
    }
  }

  return { mount, unmount };
};
