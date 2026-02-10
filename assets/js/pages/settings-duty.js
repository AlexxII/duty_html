// ===== INIT =====

let DUTY_ASSIGNMENTS = loadDutyAssignments();
let selectedDate = null;

// ===== STORAGE =====

function loadDutyAssignments() {
  return JSON.parse(
    localStorage.getItem("duty.assignments") || "{}"
  );
}

function saveDutyAssignments() {
  localStorage.setItem(
    "duty.assignments",
    JSON.stringify(DUTY_ASSIGNMENTS)
  );
}

// ===== RENDER =====

function renderCalendar(year, month, dutyPool, staff) {
  const root = document.getElementById("duty-calendar");
  root.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const startWeekDay = (firstDay.getDay() + 6) % 7; // пн=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "day";

    const dayNumber = i - startWeekDay + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cell.classList.add("out");
      root.appendChild(cell);
      continue;
    }

    const date = `${year}-${String(month + 1).padStart(2, "0")} -${String(dayNumber).padStart(2, "0")}`;

    cell.textContent = dayNumber;

    if (DUTY_ASSIGNMENTS[date]) {
      cell.classList.add("assigned");
    }

    if (date === selectedDate) {
      cell.classList.add("selected");
    } else if (selectedDate) {
      cell.classList.add("dim");
    }

    cell.onclick = () => {
      selectedDate = date;
      renderCalendar(year, month, dutyPool, staff);
      renderDutyPeople(dutyPool, staff);
    };

    root.appendChild(cell);
  }
}

function getDaysById(id) {
  return Object.entries(DUTY_ASSIGNMENTS)
    .reduce((acc, [date, value]) => {
      if (value == id) {

        acc.push(getDay(date));
        return acc;
      }
      return acc;
    }, [])
}

function getDay(str) {
  const clean = str.replace(/\s+/g, "");
  return clean.split("-")[2];
}

function renderDutyPeople(dutyPool, staff) {
  const root = document.getElementById("duty-people");
  root.innerHTML = "";

  const assignedId = DUTY_ASSIGNMENTS[selectedDate];

  dutyPool.forEach(id => {
    const p = staff.find(s => s.id === id);
    if (!p) return;

    const el = document.createElement("div");
    el.className = "duty-person";

    if (assignedId === id) el.classList.add("active");
    else if (assignedId) el.classList.add("dim");

    const dutyDays = getDaysById(id);

    el.innerHTML = `
      <strong>${window.utils.fioToShort(p.fio)}</strong><br>
      ${dutyDays.length ? `<span>${dutyDays.join(", ")}</span>` : ""}
    `;

    el.onclick = () => {
      DUTY_ASSIGNMENTS[selectedDate] = id;
      saveDutyAssignments();
      renderCalendar(
        currentYear,
        currentMonth,
        dutyPool,
        staff
      );
      renderDutyPeople(dutyPool, staff);
    };

    root.appendChild(el);
  });
}

// ===== START =====


(async () => {
  try {
    await Data.init();
    let dutyPool = await Data.getDutyPool();
    let staff = await Data.getStaff();
    start(dutyPool.duty_pool, staff);
  } catch (e) {
    console.log(e);
    window.utils.showFatalError(e);
  }
})();
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();


function start(dutyPool, staff) {
  renderCalendar(currentYear, currentMonth, dutyPool, staff);
  renderDutyPeople(dutyPool, staff);
}
