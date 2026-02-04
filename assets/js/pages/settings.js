// ---------- НАВИГАЦИЯ СЛЕВА ----------
const navButtons = document.querySelectorAll(".settings-nav button");
const sections = document.querySelectorAll(".settings-section");

navButtons.forEach(btn => {
  btn.onclick = () => {
    const id = btn.dataset.section;

    navButtons.forEach(b => b.classList.remove("active"));
    sections.forEach(s => s.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(id).classList.add("active");
  };
});

// ---------- ЗАГРУЗКА НАСТРОЕК ----------
const inputs = document.querySelectorAll("input[data-key]");

inputs.forEach(input => {
  const key = "var." + input.dataset.key;
  const value = localStorage.getItem(key);
  if (value) {
    input.value = value;
  }
});

// ---------- СОХРАНЕНИЕ ----------
document.getElementById("save-management").onclick = () => {
  inputs.forEach(input => {
    const key = "var." + input.dataset.key;
    const value = input.value.trim();

    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  });

  alert("Настройки сохранены");
};


// ----------- ФОРМИРОВАНИЕ СПИСКА РУКОВОДИТЕЛЕЙ ----------

function loadStatus(roleKey) {
  return JSON.parse(
    localStorage.getItem("status." + roleKey) ||
    '{"vacation":false}'
  );
}

function saveStatus(roleKey, status) {
  localStorage.setItem(
    "status." + roleKey,
    JSON.stringify(status)
  );
}

function getStaffByRole(roleKey) {
  const role = ROLE_MAP[roleKey];
  return STAFF.find(p => p.id === role.staffId);
}

function renderManagementRoles() {
  const root = document.getElementById("management-list");
  root.innerHTML = "";

  Object.entries(ROLE_MAP).forEach(([roleKey, role]) => {
    const staff = getStaffByRole(roleKey);
    if (!staff) return;

    const status = loadStatus(roleKey);
    const isCenterChief = roleKey === CENTER_CHIEF_KEY;

    const row = document.createElement("div");
    row.className = "leader-row";

    row.innerHTML = `
      <div class="leader-main">
        <div class="leader-title">${role.title}</div>

        <div class="leader-name">
          ${staff.fio}
          <span class="leader-status ${status.vacation ? "off" : "on"}">
            ${status.vacation ? "в отпуске" : "на месте"}
          </span>
        </div>

        <label class="vacation-flag">
          <input type="checkbox"
            data-vacation="${roleKey}"
            ${status.vacation ? "checked" : ""}>
          отпуск
        </label>

      <label
          class="vacation-date ${status.vacation ? "" : "hidden"}"
      >до:
        <input type="date"
          data-vacation-until="${roleKey}"
          value="${status.vacationUntil || ""}">
      </label>
      </div>
      ${isCenterChief && status.vacation ? renderCenterActingBlock(status.actingRoleKey) : ""}
    `;

    root.appendChild(row);
  });
}

function renderCenterActingBlock(activeRoleKey) {
  return `
    <div class="acting-block">
      <div class="acting-title">
        Кто остаётся за начальника Центра:
      </div>
      ${CENTER_DEPUTIES.map(roleKey => {
    const staff = getStaffByRole(roleKey);
    return `
          <label class="acting-option
            ${roleKey === activeRoleKey ? "active" : ""}">
            <input type="radio"
              name="center-acting"
              value="${roleKey}"
              data-center-acting
              ${roleKey === activeRoleKey ? "checked" : ""}>
            ★ ${staff.fio} — ${ROLE_MAP[roleKey].title}
          </label>
        `;
  }).join("")}
    </div>
  `;
}

document.addEventListener("change", e => {
  // отпуск
  if (e.target.matches("input[data-vacation]")) {
    const roleKey = e.target.dataset.vacation;
    const status = loadStatus(roleKey);

    status.vacation = e.target.checked;

    if (!status.vacation) {
      status.vacationUntil = null;
      if (roleKey === CENTER_CHIEF_KEY) {
        status.actingRoleKey = null;
      }
    }

    saveStatus(roleKey, status);
    renderManagementRoles();
  }

  // дата отпуска
  if (e.target.matches("input[data-vacation-until]")) {
    const roleKey = e.target.dataset.vacationUntil;
    const status = loadStatus(roleKey);

    status.vacationUntil = e.target.value || null;
    saveStatus(roleKey, status);
  }

  // выбор замещающего начальника Центра
  if (e.target.matches("input[data-center-acting]")) {
    const status = loadStatus(CENTER_CHIEF_KEY);

    status.actingRoleKey = e.target.value;
    saveStatus(CENTER_CHIEF_KEY, status);

    renderManagementRoles();
  }
});

const CENTER_CHIEF_KEY = "chief";

const CENTER_DEPUTIES = [
  "vise_chief",
  "vise_chief_engineer",
  "vise_chief_iar"
];

renderManagementRoles();
