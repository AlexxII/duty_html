window.DocsManager = function() {

  let root = null;
  let documents = [];
  let editingId = null;

  async function load() {
    docsData = await Data.getDocs();
    documents = docsData.documents;
  }

  async function save() {
    await Data.setDocs({
      documents,
      updated_at: new Date().toISOString()
    });
  }

  function render() {
    root.innerHTML = `
      <div class="docs-admin-layout">
        <aside class="docs-admin-sidebar">
          <div class="docs-admin-toolbar">
            <button id="new-doc" class="button button--primary small">
              Новый
            </button>
            <button id="export-docs" class="button button--secondary small">
              Экспорт
            </button>
            <span class="export-alert">Внимание! Изменения храняться в памяти браузера, перед закрытием вкладки Экспортируйте данные!</span>
          </div>
          <div id="docs-list" class="docs-admin-list"></div>
        </aside>

        <main class="docs-content">
          <form id="doc-form" class="docs-admin-form"></form>
        </main>
      </div>
    `;

    renderList();
    renderForm();
    bindEvents();
  }

  function renderList() {
    const container = root.querySelector("#docs-list");
    container.innerHTML = "";

    documents.forEach(doc => {
      const el = document.createElement("div");
      el.className = "doc-item";

      if (doc.active === false) {
        el.classList.add("archived");
      }

      if (doc.id === editingId) {
        el.classList.add("active-doc");
      }

      el.textContent = doc.title;
      el.onclick = () => {
        el.classList.add("active");
        editDocument(doc.id);
      }

      container.appendChild(el);
    });
  }

  function renderForm(doc = {}) {

    const categories = unique("category");
    const cabinets = unique("location.cabinet");
    const folders = unique("location.folder");
    const sections = unique("location.section");
    const keywordsAll = new Set();

    documents.forEach(d => {
      (d.keywords || []).forEach(k => keywordsAll.add(k));
    });

    root.querySelector("#doc-form").innerHTML = `
    <div class="doc-card">

      <div class="doc-grid-3">
        <input class="input" name="id" placeholder="ID"
          value="${doc.id || ""}">

        <input class="input" name="number" placeholder="Номер"
          value="${doc.number || ""}">

        <input class="input" type="date" name="date"
          value="${doc.date || ""}">
      </div>

      <input class="input full" name="title"
        placeholder="Название"
        value="${doc.title || ""}">

      <input class="input full"
        list="category-list"
        name="category"
        placeholder="Категория"
        value="${doc.category || ""}">
      <datalist id="category-list">
        ${categories.map(c => `<option value="${c}">`).join("")}
      </datalist>

      <input class="input full"
        list="keywords-list"
        name="keywords"
        placeholder="Ключевые слова через запятую"
        value="${(doc.keywords || []).join(", ")}">
      <datalist id="keywords-list">
        ${[...keywordsAll].map(k => `<option value="${k}">`).join("")}
      </datalist>

    </div>

    <div class="doc-card">
      <h4>Краткое описание</h4>
      <textarea class="input full" name="short">
${doc.short || ""}
      </textarea>
    </div>

    <div class="doc-card">
      <h4>Расположение</h4>

      <div class="doc-grid-3">

        <input class="input"
          list="cabinet-list"
          name="cabinet"
          placeholder="Хранилище или стойка"
          value="${doc.location?.cabinet || ""}">
        <datalist id="cabinet-list">
          ${cabinets.map(c => `<option value="${c}">`).join("")}
        </datalist>

        <input class="input"
          list="folder-list"
          name="folder"
          placeholder="Папка"
          value="${doc.location?.folder || ""}">
        <datalist id="folder-list">
          ${folders.map(f => `<option value="${f}">`).join("")}
        </datalist>

        <input class="input"
          list="section-list"
          name="section"
          placeholder="Раздел"
          value="${doc.location?.section || ""}">
        <datalist id="section-list">
          ${sections.map(s => `<option value="${s}">`).join("")}
        </datalist>

      </div>

      <label class="doc-checkbox">
        <input type="checkbox" name="active"
          ${doc.active !== false ? "checked" : ""}>
        Активен
      </label>

      <button type="submit"
        class="button button--primary">
        Сохранить
      </button>
    </div>
  `;
  }

  function unique(path) {
    const values = new Set();
    documents.forEach(d => {
      const val = path.split(".").reduce((o, k) => o?.[k], d);
      if (val) values.add(val);
    });
    return [...values];
  }

  function bindEvents() {

    root.querySelector("#new-doc").onclick = () => {
      editingId = null;
      renderForm();
    };

    root.querySelector("#export-docs").onclick = exportJson;

    root.querySelector("#doc-form").onsubmit = async e => {
      e.preventDefault();
      await saveForm(e.target);
    };
  }

  function editDocument(id) {
    editingId = id;
    const doc = documents.find(d => d.id === id);
    renderForm(doc);
    renderList();
  }

  async function saveForm(form) {

    const formData = new FormData(form);

    const doc = {
      id: formData.get("id").trim(),
      title: formData.get("title").trim(),
      number: formData.get("number").trim(),
      date: formData.get("date"),
      category: formData.get("category").trim(),
      keywords: formData.get("keywords")
        .split(",")
        .map(k => k.trim())
        .filter(Boolean),
      short: formData.get("short").trim(),
      location: {
        cabinet: formData.get("cabinet").trim(),
        folder: formData.get("folder").trim(),
        section: formData.get("section").trim()
      },
      active: formData.get("active") === "on"
    };

    if (!doc.id || !doc.title || !doc.date) {
      alert("ID, название и дата обязательны");
      return;
    }

    if (!editingId && documents.some(d => d.id === doc.id)) {
      alert("Документ с таким ID уже существует");
      return;
    }

    if (editingId) {
      const index = documents.findIndex(d => d.id === editingId);
      documents[index] = doc;
    } else {
      documents.push(doc);
    }

    await save();
    renderList();
  }

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ documents }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "docs.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function mount() {
    root = document.getElementById("docs-manager");
    await load();
    render();
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
