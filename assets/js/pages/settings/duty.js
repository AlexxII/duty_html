window.SettingsDuty = function(dutyPool, staff) {

  let root = null;
  let appInstance = null;

  function mount() {
    root = document.getElementById("duty");

    root.innerHTML = `
      <div class="duty-layout">
        <aside id="duty-calendar"></aside>
        <main class="duty-people" id="duty-people"></main>
      </div>
    `;

    appInstance = createDutyApp(dutyPool, staff);
    appInstance.init();
  }

  function createDutyApp(dutyPool, staff) {

    const state = {
      year: null,
      month: null,
      selectedDate: null,
      assignments: loadAssignments()
    };

    // ---------- STORAGE ----------

    function loadAssignments() {
      try {
        return JSON.parse(
          localStorage.getItem("duty.assignments")
        ) || {};
      } catch {
        return {};
      }
    }

    function saveAssignments() {
      localStorage.setItem(
        "duty.assignments",
        JSON.stringify(state.assignments)
      );
    }

    // ---------- DATE HELPERS ----------

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function makeKey(year, month, day) {
      return `${year}-${pad(month + 1)}-${pad(day)}`;
    }

    function extractDay(key) {
      return Number(key.split("-")[2]);
    }

    // ---------- MODEL ----------

    function buildDaysIndex() {
      const map = {};

      for (const [date, id] of Object.entries(state.assignments)) {
        if (!map[id]) map[id] = [];
        map[id].push(extractDay(date));
      }

      return map;
    }

    function getCalendarModel() {
      const { year, month } = state;

      const firstDay = new Date(year, month, 1);
      const startWeekDay = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const totalCells =
        Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

      const cells = [];

      for (let i = 0; i < totalCells; i++) {
        const day = i - startWeekDay + 1;

        if (day < 1 || day > daysInMonth) {
          cells.push({ type: "out" });
          continue;
        }

        const key = makeKey(year, month, day);

        cells.push({
          type: "day",
          day,
          key,
          assigned: Boolean(state.assignments[key]),
          selected: key === state.selectedDate
        });
      }

      return cells;
    }

    function getCalendarDate() {
      const { year, month } = state;
      const date = new Date(year, month, 1);
      return new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric"
      }).format(date);
    }

    // ---------- RENDER ----------

    function renderCalendar() {
      const root = document.getElementById("duty-calendar");
      root.innerHTML = "";

      const tag = document.createElement("div");
      tag.className = "calendar"

      const header = document.createElement("div");
      header.className = "calendar-header"
      header.innerHTML = getCalendarDate();
      root.appendChild(header);

      const model = getCalendarModel();

      model.forEach(cell => {
        const el = document.createElement("div");
        el.className = "day";

        if (cell.type === "out") {
          el.classList.add("out");
          tag.appendChild(el);
          return;
        }

        el.textContent = cell.day;

        if (cell.assigned) el.classList.add("assigned");
        if (cell.selected) el.classList.add("selected");
        if (state.selectedDate && !cell.selected) {
          el.classList.add("dim");
        }

        el.onclick = () => {
          state.selectedDate = cell.key;
          render();
        };

        tag.appendChild(el);
      });
      root.appendChild(tag);

      const nav = document.createElement("div");
      nav.className = "assistants-nav";

      nav.innerHTML = `
        <button data-dir="left">&lt;</button>
        <button data-dir="right">&gt;</button>
      `;
      root.appendChild(nav);
    }

    function renderPeople() {
      const root = document.getElementById("duty-people");
      root.innerHTML = "";

      // if (!state.selectedDate) return;

      const assignedId = state.assignments[state.selectedDate];
      const daysIndex = buildDaysIndex();

      dutyPool.forEach(id => {
        const person = staff.find(s => s.id === id);
        if (!person) return;

        const el = document.createElement("div");
        el.className = "duty-person";

        if (assignedId === id) el.classList.add("active");
        else if (assignedId) el.classList.add("dim");

        const days = daysIndex[id] || [];

        el.innerHTML = `
        <strong>${utils.fioToShort(person.fio)}</strong><br>
        ${days.length ? `<span>${days.join(", ")}</span>` : ""}
      `;

        el.onclick = () => {
          if (!state.selectedDate) return;
          state.assignments[state.selectedDate] = id;
          saveAssignments();
          render();
        };

        root.appendChild(el);
      });
    }

    function nextMonth() {
      const date = new Date(state.year, state.month + 1, 1);

      state.year = date.getFullYear();
      state.month = date.getMonth();

      render();
    }

    function prevMonth() {
      const date = new Date(state.year, state.month - 1, 1);

      state.year = date.getFullYear();
      state.month = date.getMonth();

      render();
    }

    function bindKeys() {
      handleClick = function(e) {
        const button = e.target.closest("button");
        if (!button) return;
        const dir = button.dataset.dir;
        if (dir === "left") {
          prevMonth();
        }
        if (dir === "right") {
          nextMonth();
        }
      }
      document.addEventListener("click", handleClick);
    }

    function render() {
      renderCalendar();
      renderPeople();
    }

    function init() {
      const now = new Date();
      state.year = now.getFullYear();
      state.month = now.getMonth();
      render();
      bindKeys();
    }

    return { init };
  }

  function unmount() {
    root.innerHTML = "";
    if (handleClick) {
      document.removeEventListener("click", handleClick);
      handleClick = null;
    }
  }

  return { mount, unmount };
};
