window.SettingsManagement = function(staff, roles) {

  const CENTER_CHIEF_KEY = "chief";

  const CENTER_DEPUTIES = [
    "vise_chief",
    "vise_chief_engineer",
    "vise_chief_iar"
  ];
  let root = null;

  function mount() {
    root = document.getElementById("management");
    render();

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
        render(staff, roles);
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

        render(staff, roles);
      }
    });
  }

  function render() {
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

    bindEvents();
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

  function bindEvents() {
    root.querySelectorAll("input[data-role]").forEach(input => {
      input.onchange = () => {
        const roleKey = input.dataset.role;
        const status = loadStatus(roleKey);

        status.absent = input.checked;
        saveStatus(roleKey, status);
        render();
      };
    });
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};

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
