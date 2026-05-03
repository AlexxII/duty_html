window.StaffManager = function() {

  let root = null;
  let staff = [];
  let positionsPool = [];
  let selectedId = null;

  // ---------- INIT ----------

  async function mount() {
    root = document.getElementById("staff-manager");

    staff = await Data.getStaff();
    positionsPool = await Data.getPositions();

    renderLayout();
    renderList();
    renderEmpty();
    bindGlobal();
  }

  function unmount() {
    root.innerHTML = "";
  }

  // ---------- LAYOUT ----------

  function renderLayout() {
    root.innerHTML = `
      <div class="admin-layout admin-layout--fullheight">

        <aside class="admin-sidebar">
          <div class="admin-toolbar">
            <button id="staff-new" class="button small">Новый</button>
            <button id="staff-export" class="button small">Экспорт</button>
          </div>
          <div id="staff-list" class="admin-list"></div>
        </aside>

        <main class="admin-content">
          <div id="staff-empty" class="org-empty">
            Выберите сотрудника или создайте нового
          </div>
          <form id="staff-form" class="hidden"></form>
        </main>

      </div>
    `;
  }

  // ---------- LIST ----------

  function renderList() {
    const container = root.querySelector("#staff-list");
    container.innerHTML = "";

    if (!staff.length) {
      const empty = document.createElement("div");
      empty.className = "admin-list-empty";
      empty.innerText = "ПУСТО";
      container.appendChild(empty);
      return;
    }

    const groups = window.utils.reorderStaff(staff, positionsPool);

    Object.entries(groups).forEach(([unit, unitStaff]) => {

      const unitDiv = document.createElement("div");
      unitDiv.className = "staff-admin-unit";
      unitDiv.innerText = unit;
      container.appendChild(unitDiv);

      unitStaff.forEach(person => {
        const el = document.createElement("div");
        el.className = "admin-item";

        if (person.id === selectedId) {
          el.classList.add("active");
        }

        el.textContent = person.fio;

        el.onclick = () => {
          selectedId = person.id;
          renderList();
          renderForm(person);
        };

        container.appendChild(el);
      });

    });
  }

  // ---------- EMPTY ----------

  function renderEmpty() {
    root.querySelector("#staff-empty").classList.remove("hidden");
    root.querySelector("#staff-form").classList.add("hidden");
  }

  // ---------- FORM ----------

  function renderForm(person = {}) {
    const empty = root.querySelector("#staff-empty");
    const form = root.querySelector("#staff-form");

    empty.classList.add("hidden");
    form.classList.remove("hidden");

    form.innerHTML = `
      <datalist id="rank-list"></datalist>
      <datalist id="position-list"></datalist>
      <datalist id="unit-list"></datalist>

      <div class="admin-card">

        <div class="admin-grid-2">
          <input class="input" name="fio" value="${person.fio || ""}" placeholder="ФИО">
          <input class="input" name="rank" list="rank-list" value="${person.rank || ""}" placeholder="Звание">
          <input class="input" name="position" list="position-list" value="${person.position || ""}" placeholder="Должность">
          <input class="input" name="unit" list="unit-list" value="${person.unit || ""}" placeholder="Подразделение">
        </div>

        <input class="input full" name="address"
          value="${person.address || ""}"
          placeholder="Адрес проживания">

      </div>

      <div class="admin-card">

        <div style="padding-bottom:10px">Телефоны</div>

        <div class="admin-grid-2">
          <input class="input" name="mobile"
            value="${(person.phone?.mobile || []).join(", ")}">
          <input class="input" name="ats"
            value="${(person.phone?.ats_ogv || []).join(", ")}">
          <input class="input" name="home"
            value="${(person.phone?.home || []).join(", ")}">
        </div>

      </div>

      <div class="admin-card">

        <div style="padding-bottom:10px">Оружие</div>

        <div class="admin-grid-2">
          <input class="input" name="pm"
            value="${person.weapons?.personal_number || ""}">
          <input class="input" name="ak"
            value="${person.weapons?.individual_number || ""}">
        </div>

        <div style="margin-top:20px">
          <button type="submit" class="button button--primary">Сохранить</button>
          <button type="button" id="staff-delete" class="button button--warning">Удалить</button>
        </div>

      </div>
    `;

    fillAutoComplete();
    bindForm(person);
  }

  function bindForm(person) {
    const form = root.querySelector("#staff-form");

    form.onsubmit = async (e) => {
      e.preventDefault();

      const f = new FormData(form);
      const record = buildStaffRecord(f);

      if (selectedId) {
        const index = staff.findIndex(p => p.id === selectedId);
        staff[index] = { ...staff[index], ...record };
      } else {
        record.id = generateId();
        staff.push(record);
        selectedId = record.id;
      }

      await save();

      renderList();
      renderForm(record);
    };

    form.querySelector("#staff-delete").onclick = async () => {
      if (!selectedId) return;
      if (!confirm("Удалить сотрудника?")) return;

      staff = staff.filter(p => p.id !== selectedId);
      selectedId = null;

      await save();

      renderList();
      renderEmpty();
    };
  }

  // ---------- GLOBAL ----------

  function bindGlobal() {
    root.querySelector("#staff-new").onclick = () => {
      selectedId = null;
      renderForm({});
    };

    root.querySelector("#staff-export").onclick = exportStaff;
  }

  async function save() {
    await Data.setStaff(staff);
  }

  // ---------- UTILS ----------

  function buildStaffRecord(form) {
    const split = v =>
      (v || "").split(",").map(s => s.trim()).filter(Boolean);

    const phones = {};
    if (split(form.get("mobile")).length) phones.mobile = split(form.get("mobile"));
    if (split(form.get("ats")).length) phones.ats_ogv = split(form.get("ats"));
    if (split(form.get("home")).length) phones.home = split(form.get("home"));

    const weapons = {};
    if (form.get("pm")) weapons.personal_number = form.get("pm").trim();
    if (form.get("ak")) weapons.individual_number = form.get("ak").trim();

    const record = {
      fio: form.get("fio").trim(),
      rank: form.get("rank").trim(),
      position: form.get("position").trim(),
      unit: form.get("unit").trim(),
      address: form.get("address").trim(),
      phone: phones
    };

    if (Object.keys(weapons).length) {
      record.weapons = weapons;
    }

    return record;
  }

  function fillAutoComplete() {
    const ranks = new Set();
    const positions = new Set();
    const units = new Set();

    staff.forEach(p => {
      if (p.rank) ranks.add(p.rank);
      if (p.position) positions.add(p.position);
      if (p.unit) units.add(p.unit);
    });

    fillList("rank-list", ranks);
    fillList("position-list", positions);
    fillList("unit-list", units);
  }

  function fillList(id, values) {
    const el = root.querySelector("#" + id);
    el.innerHTML = "";

    Array.from(values).sort().forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      el.appendChild(opt);
    });
  }

  async function exportStaff() {
    const file = await Data.exportStaffFile(staff);

    const blob = new Blob(
      [JSON.stringify(file.content, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function generateId() {
    if (!staff.length) return 1;
    return Math.max(...staff.map(p => p.id)) + 1;
  }

  return { mount, unmount };
};
