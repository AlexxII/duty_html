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

// ----------- ФОРМИРОВАНИЕ СПИСКА РУКОВОДИТЕЛЕЙ ----------

function loadStatus(roleKey) {
  return JSON.parse(
    localStorage.getItem("status." + roleKey) ||
    '{"absent":false}'
  );
}

function saveStatus(roleKey, status) {
  localStorage.setItem(
    "status." + roleKey,
    JSON.stringify(status)
  );
}

function getStaffByRole(staff, roles, roleKey) {
  const role = roles[roleKey];
  return staff.find(p => p.id === role.staffId);
}

function renderManagementRoles(staff, roles) {
  const root = document.getElementById("management-list");
  root.innerHTML = "";


  Object.entries(roles).forEach(([roleKey, role]) => {
    const person = getStaffByRole(staff, roles, roleKey);
    if (!person) return;

    const status = loadStatus(roleKey);
    const isCenterChief = roleKey === CENTER_CHIEF_KEY;

    const row = document.createElement("div");
    row.className = "leader-row";

    row.innerHTML = `
      <div class="leader-main">
        <div class="leader-title">${role.title}</div>

        <div class="leader-name">
          ${person.fio}
          <span class="leader-status ${status.absent ? "off" : "on"}">
            ${status.absent ? "отсутствует" : "на месте"}
          </span>
        </div>

        <label class="absent-flag">
          <input type="checkbox"
            data-absent="${roleKey}"
            ${status.absent ? "checked" : ""}>
          отсутствует
        </label>

      <label
          class="absent-date ${status.absent ? "" : "hidden"}"
      >до:
        <input type="date"
          data-absent-until="${roleKey}"
          value="${status.absent || ""}">
      </label>
      </div>
      ${isCenterChief && status.absent ? renderCenterActingBlock(staff, status.actingRoleKey, roles) : ""}
    `;
    root.appendChild(row);
  });
}

function renderCenterActingBlock(staff, activeRoleKey, roles) {
  return `
    <div class="acting-block">
      <div class="acting-title">
        Кто остаётся за начальника Центра:
      </div>
      ${CENTER_DEPUTIES.map(roleKey => {
    const person = getStaffByRole(staff, roles, roleKey);
    return `
          <label class="acting-option
            ${roleKey === activeRoleKey ? "active" : ""}">
            <input type="radio"
              name="center-acting"
              value="${roleKey}"
              data-center-acting
              ${roleKey === activeRoleKey ? "checked" : ""}>
            ★ ${person.fio} — ${roles[roleKey].title}
          </label>
        `;
  }).join("")}
    </div>
  `;
}

(async () => {
  try {
    await Data.init();
    const staff = await Data.getStaff();
    const roles = await Data.getRoles();

    console.log(staff)
    console.log(roles)

    renderManagementRoles(staff, roles);

    document.addEventListener("change", e => {
      // отсутствует
      if (e.target.matches("input[data-absent]")) {
        const roleKey = e.target.dataset.absent;
        const status = loadStatus(roleKey);

        status.absent = e.target.checked;

        if (!status.absent) {
          status.absent = null;
          if (roleKey === CENTER_CHIEF_KEY) {
            status.actingRoleKey = null;
          }
        }

        saveStatus(roleKey, status);
        renderManagementRoles(staff, roles);
      }

      // дата отпуска
      if (e.target.matches("input[data-absent-until]")) {
        const roleKey = e.target.dataset.absentUntil;
        const status = loadStatus(roleKey);

        status.absentUntil = e.target.value || null;
        saveStatus(roleKey, status);
      }

      // выбор замещающего начальника Центра
      if (e.target.matches("input[data-center-acting]")) {
        const status = loadStatus(CENTER_CHIEF_KEY);

        status.actingRoleKey = e.target.value;
        saveStatus(CENTER_CHIEF_KEY, status);

        renderManagementRoles(staff, roles);
      }
    });

  } catch (e) {
    console.log(e)
    window.utils.showFatalError(e);
  }

})();

const CENTER_CHIEF_KEY = "chief";

const CENTER_DEPUTIES = [
  "vise_chief",
  "vise_chief_engineer",
  "vise_chief_iar"
];
