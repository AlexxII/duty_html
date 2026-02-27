window.ReminderUI = (function() {

  function openManager() {
    if (document.querySelector(".reminder-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "health-overlay reminder-overlay";

    overlay.innerHTML = `
      <div class="health-modal reminder-modal">
        <h1>Напоминания</h1>
        <div id="reminder-list" class="reminder-list"></div>
        <hr style="margin:20px 0;border-color:#333;">
        <div class="reminder-form">
          <input id="r-title" class="input" type="text" placeholder="Текст напоминания">
          <div class="reminder-row">
            <select id="r-type" class="input">
              <option value="once">Одиночное</option>
              <option value="daily">Ежедневное</option>
              <option value="weekly">Еженедельное</option>
            </select>
          </div>

          <div class="reminder-row">
            <input id="r-datetime" class="input" type="datetime-local">
            <input id="r-time" class="input hidden" type="time">
            <select id="r-weekday" class="input hidden">
              <option value="1">Пн</option>
              <option value="2">Вт</option>
              <option value="3">Ср</option>
              <option value="4">Чт</option>
              <option value="5">Пт</option>
              <option value="6">Сб</option>
              <option value="0">Вс</option>
            </select>
          </div>

        </div>

        <div class="reminder-actions">
          <button id="r-add" class="button button--primary">
            Добавить
          </button>
          <button class="button button--secondary" id="r-close">
            Закрыть
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    renderList();
    bindForm();
    bindClose();
  }

  function renderList() {
    const container = document.getElementById("reminder-list");
    const reminders = ReminderService.getAll();

    if (!reminders.length) {
      container.innerHTML = `<p style="opacity:0.6;">Нет напоминаний</p>`;
      return;
    }

    container.innerHTML = reminders.map(r => `
      <div class="reminder-card">
        <div class="reminder-card-top">
          <strong>${r.title}</strong>
          <span class="badge ${r.active ? "active" : ""}">
            ${r.active ? "Активно" : "Выключено"}
          </span>
        </div>

        <div class="reminder-meta">
          ${formatReminderMeta(r)}
        </div>

        <div class="reminder-actions">
          <button class="button small" data-remove="${r.id}">
            Удалить
          </button>
        </div>
      </div>
    `).join("");

    container.querySelectorAll("[data-remove]").forEach(btn => {
      btn.onclick = () => {
        ReminderService.remove(btn.dataset.remove);
        renderList();
      };
    });
  }

  function bindForm() {
    const typeSelect = document.getElementById("r-type");
    const dtInput = document.getElementById("r-datetime");
    const timeInput = document.getElementById("r-time");
    const weekdaySelect = document.getElementById("r-weekday");
    const addBtn = document.getElementById("r-add");

    typeSelect.onchange = () => {
      dtInput.classList.add("hidden");
      timeInput.classList.add("hidden");
      weekdaySelect.classList.add("hidden");

      if (typeSelect.value === "once") dtInput.classList.remove("hidden");
      if (typeSelect.value === "daily") timeInput.classList.remove("hidden");
      if (typeSelect.value === "weekly") {
        timeInput.classList.remove("hidden");
        weekdaySelect.classList.remove("hidden");
      }
    };

    addBtn.onclick = () => {
      const title = document.getElementById("r-title").value.trim();
      if (!title) return;

      const type = typeSelect.value;

      let reminder = {
        id: crypto.randomUUID(),
        title,
        type,
        active: true,
        lastTriggered: null
      };

      if (type === "once") {
        const dt = dtInput.value;
        if (!dt) return;
        reminder.datetime = new Date(dt).getTime();
      }

      if (type === "daily") {
        reminder.time = timeInput.value;
      }

      if (type === "weekly") {
        reminder.time = timeInput.value;
        reminder.weekday = Number(weekdaySelect.value);
      }

      ReminderService.add(reminder);
      renderList();
      document.getElementById("r-title").value = "";
    };
  }

  function formatReminderMeta(r) {
    if (r.type === "once") {
      return "Дата: " + new Date(r.datetime).toLocaleString("ru-RU");
    }

    if (r.type === "daily") {
      return "Каждый день в " + r.time;
    }

    if (r.type === "weekly") {
      const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      return "Каждую " + days[r.weekday] + " в " + r.time;
    }

    return "";
  }

  function bindClose() {
    const overlay = document.querySelector(".reminder-overlay");
    const closeBtn = document.getElementById("r-close");

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", escHandler);
    }

    closeBtn.onclick = close;

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    function escHandler(e) {
      if (e.code === "Escape") close();
    }

    document.addEventListener("keydown", escHandler);

  }

  return {
    openManager
  };

})();
