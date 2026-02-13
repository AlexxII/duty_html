window.SettingsManagement = function(staff, roles) {

  let root = null;

  function mount() {
    root = document.getElementById("management");
    render();
  }

  function render() {
    root.innerHTML = "";

    Object.entries(roles).forEach(([roleKey, role]) => {

      if (!role.staffId) return;

      const person = staff.find(p => p.id === role.staffId);
      if (!person) return;

      const status = loadStatus(roleKey);

      const row = document.createElement("div");
      row.className = "leader-row";

      row.innerHTML = `
        <div class="leader-title">${role.title}</div>
        <div class="leader-name">
          ${person.fio}
          <span class="leader-status ${status.absent ? "off" : "on"}">
            ${status.absent ? "отсутствует" : "на месте"}
          </span>
        </div>

        <label>
          <input type="checkbox"
                 data-role="${roleKey}"
                 ${status.absent ? "checked" : ""}>
          отсутствует
        </label>
      `;

      root.appendChild(row);
    });

    bindEvents();
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
