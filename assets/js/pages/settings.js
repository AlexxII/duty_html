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

function getStaffById(id) {
  return STAFF.find(p => p.id === id) || null;
}

function loadRoleStatus(roleKey) {
  return JSON.parse(
    localStorage.getItem("status." + roleKey) ||
    '{"present":true}'
  );
}

function renderManagementRoles() {
  const root = document.getElementById("management-list");
  root.innerHTML = "";

  Object.entries(ROLE_MAP).forEach(([roleKey, role]) => {
    const staff = STAFF.find(p => p.id === role.staffId);
    if (!staff) return;

    const status = loadStatus(roleKey);

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
          <input type="checkbox" data-vacation="${roleKey}"
            ${status.vacation ? "checked" : ""}>
          отпуск
        </label>

        <input type="date"
          class="vacation-date ${status.vacation ? "" : "hidden"}"
          data-vacation-until="${roleKey}"
          value="${status.vacationUntil || ""}">
      </div>

      <div class="acting ${status.vacation ? "" : "hidden"}"
           data-acting-block="${roleKey}">
        <div class="acting-title">
          Кто замещает:
        </div>
        ${renderActingRadios(roleKey, role.staffId, status.actingStaffId)}
      </div>
    `;

    root.appendChild(row);
  });
}

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


function renderActingRadios(roleKey, excludeStaffId, activeId) {
  return STAFF
    .filter(p => p.id !== excludeStaffId)
    .map(p => `
      <label class="acting-option
        ${p.id === activeId ? "active" : ""}">
        <input type="radio"
          name="acting-${roleKey}"
          value="${p.id}"
          data-acting="${roleKey}"
          ${p.id === activeId ? "checked" : ""}>
        ★ ${p.fio}
      </label>
    `).join("");
}

document.addEventListener("change", e => {

  // Чекбокс "отпуск"
  if (e.target.matches("input[data-vacation]")) {
    const roleKey = e.target.dataset.vacation;
    const status = loadStatus(roleKey);

    status.vacation = e.target.checked;

    if (!status.vacation) {
      status.vacationUntil = null;
      status.actingStaffId = null;
    }

    saveStatus(roleKey, status);
    renderManagementRoles();
  }

  // Дата отпуска
  if (e.target.matches("input[data-vacation-until]")) {
    const roleKey = e.target.dataset.vacationUntil;
    const status = loadStatus(roleKey);

    status.vacationUntil = e.target.value || null;

    saveStatus(roleKey, status);
  }

  // Выбор замещающего (звёздочка)
  if (e.target.matches("input[data-acting]")) {
    const roleKey = e.target.dataset.acting;
    const status = loadStatus(roleKey);

    status.actingStaffId = Number(e.target.value);

    saveStatus(roleKey, status);
    renderManagementRoles();
  }
});

renderManagementRoles();
