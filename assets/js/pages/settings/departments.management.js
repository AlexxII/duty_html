window.DepartmentsManagement = function() {

  let root = null;
  let departments = [];
  let selectedId = null;

  // ---------- INIT ----------

  async function mount() {
    root = document.querySelector("#departments");

    departments = await Data.getDepartments?.() || [];

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
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="admin-toolbar">
            <button id="org-add" class="button small">Новый</button>
            <button id="org-export" class="button small">Экспорт</button>
            <span class="export-alert">Внимание! Изменения хранятся в памяти браузера, перед закрытием вкладки Экспортируйте данные!</span>
          </div>
          <div id="org-list" class="admin-list"></div>
        </aside>
        <main class="admin-content">
          <div id="org-empty" class="org-empty">
            Выберите организацию или создайте новую
          </div>
          <div id="org-form" class="org-form hidden"></div>
        </main>
      </div>
    `;
  }

  // ---------- LIST ----------

  function renderList() {
    const list = root.querySelector("#org-list");
    list.innerHTML = "";

    if (!departments.length) {
      const empty = document.createElement("div");
      empty.className = "admin-list-empty";
      empty.innerText = "ПУСТО";
      list.appendChild(empty);
      return;
    }

    getSortedDeps().forEach((dep, index) => {
      const item = document.createElement("div");
      item.className = "admin-item";
      if (dep.id === selectedId) item.classList.add("active");

      item.innerHTML = `
        <div class="admin-item__inner">

          <div class="wiki-item-title">
            ${dep.title || "Без названия"}
          </div>
          <div class="admin-item__actions">
            <button
              class="button small"
              data-action="up"
              ${index === 0 ? "disabled" : ""}
            >
              ↑
            </button>

            <button
              class="button small"
              data-action="down"
              ${index === dep.length - 1
          ? "disabled"
          : ""
        }
            >
              ↓
            </button>
          </div>
        </div>
      `;

      item.querySelector(
        '[data-action="up"]'
      ).onclick = async e => {
        e.stopPropagation();

        await moveWiki(
          dep.id,
          "up"
        );
      };

      item.querySelector(
        '[data-action="down"]'
      ).onclick = async e => {
        e.stopPropagation();

        await moveWiki(
          dep.id,
          "down"
        );
      };

      item.onclick = () => {
        selectedId = dep.id;
        renderList();
        renderForm(dep);
      };

      list.appendChild(item);
    });
  }

  function getSortedDeps() {
    return departments.slice()
      .sort((a, b) => {
        return (
          (a.order || 0)
          - (b.order || 0)
        );
      });
  }

  async function moveWiki(id, direction) {
    const sorted = getSortedDeps();
    const index = sorted.findIndex(p => { return p.id === id; });
    if (index === -1) return;

    const target = direction === "up" ? index - 1 : index + 1;

    if (target < 0 || target >= sorted.length) return;
    [
      sorted[index],
      sorted[target]
    ] = [
        sorted[target],
        sorted[index]
      ];

    sorted.forEach((dep, i) => {
      dep.order = i;
    });

    departments = sorted;
    await save();
    renderList();
  }


  function formatPhones(dep) {
    return (dep.phones?.city || []).join(", ");
  }

  // ---------- FORM ----------

  function renderEmpty() {
    root.querySelector("#org-empty").classList.remove("hidden");
    root.querySelector("#org-form").classList.add("hidden");
  }

  function renderForm(dep) {
    const empty = root.querySelector("#org-empty");
    const form = root.querySelector("#org-form");

    empty.classList.add("hidden");
    form.classList.remove("hidden");

    form.innerHTML = `
      <div class="admin-grid-1">

        <label>ID</label>
        <input class="input" value="${dep.id}" disabled>

        <label>Название</label>
        <input id="f-title" class="input" value="${dep.title || ""}">

        <label>Телефоны</label>
        <input id="f-phones" class="input"
          value="${(dep.phones?.city || []).join(", ")}">

        <label>Комментарий</label>
        <textarea id="f-comment" class="input">${dep.comment || ""}</textarea>

      </div>

      <div class="admin-form__actions">
        <button id="org-save" class="button button--primary">Сохранить</button>
        <button id="f-delete" class="button button--warning">Удалить</button>
      </div>
    `;

    bindForm(dep);
  }

  function bindForm(dep) {
    const form = root.querySelector("#org-form");

    form.querySelector("#f-title").oninput = e => {
      dep.title = e.target.value;
      renderList();
    };

    form.querySelector("#f-phones").oninput = e => {
      dep.phones = {
        city: e.target.value
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
      };
      renderList();
    };

    form.querySelector("#f-comment").oninput = e => {
      dep.comment = e.target.value;
    };

    form.querySelector("#org-save").onclick = () => {
      save();
    };

    form.querySelector("#f-delete").onclick = () => {
      if (!confirm("Удалить организацию?")) return;

      departments = departments.filter(d => d.id !== dep.id);
      selectedId = null;

      save()
      renderList();
      renderEmpty();
    };
  }

  // ---------- ACTIONS ----------

  function bindGlobal() {
    root.querySelector("#org-add").onclick = () => {
      const id = generateId();

      const dep = {
        id,
        title: "",
        phones: { city: [] },
        comment: "",
        active: true
      };

      departments.push(dep);
      selectedId = id;

      renderList();
      renderForm(dep);
    };


    root.querySelector("#org-export").onclick = () => {
      const data = JSON.stringify(departments, null, 2);

      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "departments.json";
      a.click();

      URL.revokeObjectURL(url);
    };
  }

  function generateId() {
    return "dep_" + Date.now().toString(36);
  }

  async function save() {
    await Data.setDepartments(departments);
    isDirty = false;
  }

  return { mount, unmount };
};
