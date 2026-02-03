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
  const container = document.getElementById("management-list");
  container.innerHTML = "";

  Object.entries(ROLE_MAP).forEach(([roleKey, role]) => {
    const staff = getStaffById(role.staffId);
    if (!staff) return;

    const status = loadRoleStatus(roleKey);

    const row = document.createElement("div");
    row.className = "management-row";

    row.innerHTML = `
      <div class="role-title">${role.title}</div>

      <div class="person">
        <strong>${staff.fio}</strong>
        <div class="meta">
          ${staff.rank}
        </div>
      </div>

      <label class="present-flag">
        <input type="checkbox" data-role="${roleKey}"
          ${status.present !== false ? "checked" : ""}>
        На месте
      </label>

      <div class="substitute ${status.present === false ? "" : "hidden"}">
        <label>
          Замещает:
          <select data-substitute="${roleKey}">
            ${buildSubstituteOptions(roleKey, status.substituteStaffId)}
          </select>
        </label>
      </div>
    `;

    container.appendChild(row);
  });
}

function buildSubstituteOptions(roleKey, selectedId) {
  return STAFF.map(p => `
    <option value="${p.id}"
      ${p.id === selectedId ? "selected" : ""}>
      ${p.fio} (${p.position})
    </option>
  `).join("");
}

document.addEventListener("change", e => {
  // Чекбокс "На месте"
  if (e.target.matches("input[type=checkbox][data-role]")) {
    const roleKey = e.target.dataset.role;
    const present = e.target.checked;

    const status = loadRoleStatus(roleKey);
    status.present = present;

    localStorage.setItem(
      "status." + roleKey,
      JSON.stringify(status)
    );

    renderManagementRoles();
  }

  // Выбор заместителя
  if (e.target.matches("select[data-substitute]")) {
    const roleKey = e.target.dataset.substitute;
    const substituteStaffId = Number(e.target.value);

    const status = loadRoleStatus(roleKey);
    status.substituteStaffId = substituteStaffId;

    localStorage.setItem(
      "status." + roleKey,
      JSON.stringify(status)
    );
  }
});

renderManagementRoles();
