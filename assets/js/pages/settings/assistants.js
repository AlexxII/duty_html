window.SettingsAssistants = function(staff, roles) {

  let root = null;
  let order = [];
  let statusMap = {};

  const STORAGE_ORDER = "assistants.order";
  const STORAGE_STATUS_PREFIX = "assistants.status.";

  // ==============================
  // STORAGE
  // ==============================

  function loadOrder() {
    const saved = localStorage.getItem(STORAGE_ORDER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { }
    }
    return [...roles.duty_assistant.staffIds];
  }

  function saveOrder() {
    localStorage.setItem(STORAGE_ORDER, JSON.stringify(order));
  }

  function loadStatus(id) {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_STATUS_PREFIX + id)
      ) || { absent: false, until: null };
    } catch {
      return { absent: false, until: null };
    }
  }

  function saveStatus(id, data) {
    localStorage.setItem(
      STORAGE_STATUS_PREFIX + id,
      JSON.stringify(data)
    );
  }

  // ==============================
  // HELPERS
  // ==============================

  function getStaffById(id) {
    return staff.find(p => p.id === id);
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ==============================
  // RENDER
  // ==============================

  function render() {

    root.innerHTML = `
      <h2>Помощники дежурного</h2>
      <div id="assistants-list"></div>
    `;

    const list = root.querySelector("#assistants-list");

    order.forEach((id, _) => {

      const person = getStaffById(id);
      if (!person) return;

      const status = statusMap[id];

      const row = document.createElement("div");
      row.className = "assistant-row";

      row.innerHTML = `
        <div class="assistant-info">
          <strong>${escapeHtml(person.fio)}</strong>
          <span class="assistant-status ${status.absent ? "off" : "on"}">
            ${status.absent
          ? `отсутствует ${status.until ? "до " + utils.formatDate(status.until) : ""}`
          : "на месте"}
          </span>
        </div>

        <div class="assistant-controls">
          <div class="move-buttons">
            <button data-id="${id}" data-move="up">↑</button>
            <button data-id="${id}" data-move="down">↓</button>
          </div>
          
          <label class="absent-label">
            <input type="checkbox"
                   data-id="${id}"
                   data-role="absent"
                   ${status.absent ? "checked" : ""}>
            отсутствует
          </label>

          <input type="date"
                 data-id="${id}"
                 data-role="until"
                 value="${status.until || ""}"
                 ${status.absent ? "" : "disabled"}>

        </div>
      `;

      list.appendChild(row);
    });

    bindEvents();
  }

  // ==============================
  // EVENTS
  // ==============================

  function bindEvents() {

    root.querySelectorAll("input[data-role='absent']").forEach(input => {
      input.onchange = () => {
        const id = Number(input.dataset.id);
        const data = statusMap[id];

        data.absent = input.checked;
        if (!data.absent) {
          data.until = null;
        }

        saveStatus(id, data);
        render();
      };
    });

    root.querySelectorAll("input[data-role='until']").forEach(input => {
      input.onchange = () => {
        const id = Number(input.dataset.id);
        const data = statusMap[id];

        data.until = input.value || null;
        saveStatus(id, data);
        render();
      };
    });

    root.querySelectorAll("button[data-move]").forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.id);
        const direction = btn.dataset.move;
        const index = order.indexOf(id);

        if (direction === "up" && index > 0) {
          [order[index - 1], order[index]] =
            [order[index], order[index - 1]];
        }

        if (direction === "down" && index < order.length - 1) {
          [order[index + 1], order[index]] =
            [order[index], order[index + 1]];
        }

        saveOrder();
        render();
      };
    });
  }

  // ==============================
  // LIFECYCLE
  // ==============================

  function mount() {
    root = document.getElementById("assistants");

    order = loadOrder();
    statusMap = {};

    order.forEach(id => {
      statusMap[id] = loadStatus(id);
    });

    render();
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
