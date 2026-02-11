// =====================
// DUTY MODULE
// =====================

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

  // ---------- RENDER ----------

  function renderCalendar() {
    const root = document.getElementById("duty-calendar");
    root.innerHTML = "";

    const model = getCalendarModel();

    model.forEach(cell => {
      const el = document.createElement("div");
      el.className = "day";

      if (cell.type === "out") {
        el.classList.add("out");
        root.appendChild(el);
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

      root.appendChild(el);
    });
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
        <strong>${window.utils.fioToShort(person.fio)}</strong><br>
        ${days.length ? `<span>${days.join(", ")}</span>` : ""}
      `;

      el.onclick = () => {
        state.assignments[state.selectedDate] = id;
        saveAssignments();
        render();
      };

      root.appendChild(el);
    });
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
  }

  return { init };
}

(async () => {
  try {
    await Data.init();

    const dutyPoolData = await Data.getDutyPool();
    const staff = await Data.getStaff();

    const app = createDutyApp(
      dutyPoolData.duty_pool,
      staff
    );

    app.init();

  } catch (e) {
    console.log(e);
    window.utils.showFatalError(e);
  }
})();
