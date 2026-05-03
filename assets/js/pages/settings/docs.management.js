window.DocsManager = function() {

  let root = null;
  let documents = [];
  let selectedId = null;

  // ---------- INIT ----------

  async function mount() {
    root = document.getElementById("docs-manager");

    const data = await Data.getDocs();
    documents = data?.documents || [];

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
            <button id="doc-add" class="button small">Новый</button>
            <button id="doc-export" class="button small">Экспорт</button>
            <span class="export-alert">Внимание! Изменения храняться в памяти браузера, перед закрытием вкладки Экспортируйте данные!</span>
          </div>
          <div id="doc-list" class="admin-list"></div>
        </aside>

        <main class="admin-content">
          <div id="doc-empty" class="org-empty">
            Выберите документ или создайте новый
          </div>
          <form id="doc-form" class="hidden"></form>
        </main>

      </div>
    `;
  }

  // ---------- LIST ----------

  function renderList() {
    const list = root.querySelector("#doc-list");
    list.innerHTML = "";

    if (!documents.length) {
      const empty = document.createElement("div");
      empty.className = "admin-list-empty";
      empty.innerText = "ПУСТО";
      list.appendChild(empty);
      return;
    }

    documents.forEach(doc => {

      const el = document.createElement("div");
      el.className = "admin-item";

      if (doc.id === selectedId) {
        el.classList.add("active");
      }

      if (doc.active === false) {
        el.classList.add("admin-item--archived");
      }

      el.textContent = doc.title || "Без названия";

      el.onclick = () => {
        selectedId = doc.id;
        renderList();
        renderForm(doc);
      };

      list.appendChild(el);
    });
  }

  // ---------- EMPTY ----------

  function renderEmpty() {
    root.querySelector("#doc-empty").classList.remove("hidden");
    root.querySelector("#doc-form").classList.add("hidden");
  }

  // ---------- FORM ----------

  function renderForm(doc = {}) {
    const empty = root.querySelector("#doc-empty");
    const form = root.querySelector("#doc-form");

    empty.classList.add("hidden");
    form.classList.remove("hidden");

    const keywordsAll = new Set();
    documents.forEach(d => (d.keywords || []).forEach(k => keywordsAll.add(k)));

    form.innerHTML = `
      <div class="admin-card">

        <div class="admin-grid-2">
          <input class="input" name="id" value="${doc.id || ""}" placeholder="ID" readonly>
          <input class="input" name="number" value="${doc.number || ""}" placeholder="Номер">
          <input class="input" type="date" name="date" value="${doc.date || ""}">
          <input class="input" name="number_six" value="${doc.number_six || ""}" placeholder="Рег.№">
        </div>

        <input class="input full" name="title"
          value="${escapeHTML(doc.title || "")}"
          placeholder="Название">

        <input class="input full"
          list="category-list"
          name="category"
          value="${doc.category || ""}"
          placeholder="Категория">

        <input class="input full"
          list="keywords-list"
          name="keywords"
          value="${(doc.keywords || []).join(", ")}"
          placeholder="Ключевые слова">

      </div>

      <div class="admin-card">
        <div style="padding-bottom: 10px">Краткое описание</div>
        <textarea style="margin-bottom: 0" class="input full" name="short">${doc.short || ""}</textarea>
      </div>

      <div class="admin-card">

        <div style="padding-bottom: 10px">Расположение</div>
        <div class="admin-grid-3">
          <input class="input" name="cabinet" value="${doc.location?.cabinet || ""}">
          <input class="input" name="folder" value="${doc.location?.folder || ""}">
          <input class="input" name="section" value="${doc.location?.section || ""}">
        </div>

        <label>
          <input type="checkbox" name="active"
            ${doc.active !== false ? "checked" : ""}>
          Активен
        </label>

        <div style="margin-top: 20px">
          <button type="submit" class="button button--primary">Сохранить</button>
          <button id="doc-delete" class="button button--warning">Удалить</button>
        </div>

      </div>
    `;

    bindForm(doc);
  }

  function bindForm(doc) {
    const form = root.querySelector("#doc-form");

    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = readForm(form);

      if (!data.id || !data.title || !data.date) {
        alert("ID, название и дата обязательны");
        return;
      }

      if (!selectedId && documents.some(d => d.id === data.id)) {
        alert("ID уже существует");
        return;
      }

      if (selectedId) {
        const index = documents.findIndex(d => d.id === selectedId);
        documents[index] = data;
      } else {
        documents.push(data);
        selectedId = data.id;
      }

      await save();
      isDirty = false;

      renderList();
    };

    form.querySelector("#doc-delete").onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (!selectedId) return;

      if (!confirm("Удалить документ?")) return;

      documents = documents.filter(d => {
        return d.id !== selectedId
      });
      selectedId = null;

      await save();

      renderList();
      renderEmpty();
    };

  }

  function readForm(form) {
    const f = new FormData(form);

    return {
      id: f.get("id").trim(),
      title: f.get("title").trim(),
      number: f.get("number").trim(),
      number_six: f.get("number_six").trim(),
      date: f.get("date"),
      category: f.get("category").trim(),
      keywords: f.get("keywords")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
      short: f.get("short").trim(),
      location: {
        cabinet: f.get("cabinet").trim(),
        folder: f.get("folder").trim(),
        section: f.get("section").trim()
      },
      active: f.get("active") === "on"
    };
  }

  // ---------- GLOBAL ----------

  function bindGlobal() {
    root.querySelector("#doc-add").onclick = () => {

      const id = generateId();
      const doc = {
        id,
      };

      selectedId = null;
      renderForm(doc);
    };

    root.querySelector("#doc-export").onclick = exportJson;
  }

  async function save() {
    await Data.setDocs({
      documents,
      updated_at: new Date().toISOString()
    });
  }

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify(documents, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "docs.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  // ---------- UTILS ----------

  function generateId() {
    return "dep_" + Date.now().toString(36);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  return { mount, unmount };
};
