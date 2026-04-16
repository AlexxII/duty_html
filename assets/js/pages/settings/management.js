window.SettingsManagement = function(staff, roles) {
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
          status.absent = false;
          status.absentUntil = null;
          status.actingStaffId = null;
        }
        saveStatus(roleKey, status);
        render();
      }

      // дата
      if (e.target.matches("input[data-absent-until]")) {
        const roleKey = e.target.dataset.absentUntil;
        const status = loadStatus(roleKey);
        status.absentUntil = e.target.value || null;
        saveStatus(roleKey, status);
      }

      // выбор И.О.
      if (e.target.matches("select[data-acting]")) {
        const roleKey = e.target.dataset.acting;
        const status = loadStatus(roleKey);
        status.actingStaffId = Number(e.target.value);
        saveStatus(roleKey, status);
      }

    });
  }

  function render() {
    root.innerHTML = "";

    const header = document.createElement("h2");
    header.className = "management-header";
    header.innerText = "Должностные лица, участвующие в сценариях";
    root.appendChild(header);

    Object.entries(roles).forEach(([roleKey, role]) => {
      const person = StaffService.getStaffByRole(staff, roles, roleKey);
      if (!person) return;

      const status = loadStatus(roleKey);

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

          <label class="absent-date ${status.absent ? "" : "hidden"}">
            до:
            <input type="date"
              data-absent-until="${roleKey}"
              value="${status.absentUntil || ""}">
          </label>
        </div>
      `;
      // блок И.О.
      if (status.absent) {
        const actingBlock = renderActingSelect(
          person,
          roleKey,
          staff,
          roles,
          status.actingStaffId
        );
        row.appendChild(actingBlock);
      }

      root.appendChild(row);
    });
  }

  // ===== ACTING SELECT =====

  function renderActingSelect(person, roleKey, staff, roles, activeId) {
    const wrapper = document.createElement("div");
    wrapper.className = "acting-block";

    const title = document.createElement("div");
    title.className = "acting-title";
    title.textContent = "Исполняет обязанности:";
    wrapper.appendChild(title);

    const select = document.createElement("select");
    select.dataset.acting = roleKey;
    select.className = "users-select"

    const priorityIds = roles[roleKey].actingPriority || [];
    const { priority, rest } = splitStaff(person, staff, priorityIds);

    if (priority.length) {
      const group = document.createElement("optgroup");
      group.label = "Рекомендуемые";

      priority.forEach(p => {
        group.appendChild(new Option(p.fio, p.id));
      });

      select.appendChild(group);
    }

    const groupAll = document.createElement("optgroup");
    groupAll.label = "Все сотрудники";

    rest.forEach(p => {
      groupAll.appendChild(new Option(p.fio, p.id));
    });

    select.appendChild(groupAll);

    select.value = activeId || "";

    wrapper.appendChild(select);
    return wrapper;
  }

  function splitStaff(person, staff, priorityIds) {
    const set = new Set(priorityIds);

    const priority = [];
    const rest = [];

    staff.filter(p => p.id != person.id).forEach(p => {
      if (set.has(p.id)) {
        priority.push(p);
      } else {
        rest.push(p);
      }
    });

    return { priority, rest };
  }

  // ===== STORAGE =====

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

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
