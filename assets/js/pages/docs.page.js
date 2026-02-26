window.DocsPage = function() {

  let root = null;
  let docs = [];
  let activeCategory = "ALL";
  let searchQuery = "";
  let statusFilter = "active"; // active | all | archive

  async function mount(container) {
    root = container;
    renderLayout();

    await Data.init();
    docs = await Data.getDocs() || [];

    render();
    bindEvents();
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-docs">

        <div class="header">
          <h1>Документы</h1>
          <a href="#/" class="back-btn">← На главную</a>
        </div>

        <div class="docs-toolbar">
          <input 
            id="docs-search"
            class="input"
            placeholder="Поиск по номеру, названию, ключевым словам..."
          />

          <select id="docs-status" class="input small">
            <option value="active">Действующие</option>
            <option value="all">Все</option>
            <option value="archive">Архив</option>
          </select>
        </div>

        <div class="docs-layout">
          <aside class="docs-categories" id="docs-categories"></aside>
          <main class="docs-list" id="docs-list"></main>
        </div>

      </div>
    `;
  }

  function bindEvents() {
    const searchInput = root.querySelector("#docs-search");
    const statusSelect = root.querySelector("#docs-status");

    searchInput.addEventListener("input", e => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    statusSelect.addEventListener("change", e => {
      statusFilter = e.target.value;
      render();
    });
  }

  function render() {
    renderCategories();
    renderDocs();
  }

  function renderCategories() {
    const container = root.querySelector("#docs-categories");
    container.innerHTML = "";

    const categories = new Map();

    docs.forEach(doc => {
      const cat = doc.category || "Без категории";
      categories.set(cat, (categories.get(cat) || 0) + 1);
    });

    const allItem = createCategoryItem("ALL", "Все", docs.length);
    container.appendChild(allItem);

    for (const [cat, count] of categories.entries()) {
      container.appendChild(createCategoryItem(cat, cat, count));
    }
  }

  function createCategoryItem(value, label, count) {
    const div = document.createElement("div");
    div.className = "docs-category";
    if (activeCategory === value) {
      div.classList.add("active");
    }
    div.textContent = `${label} (${count})`;
    div.onclick = () => {
      activeCategory = value;
      render();
    };
    return div;
  }

  function renderDocs() {
    const container = root.querySelector("#docs-list");
    container.innerHTML = "";

    let filtered = docs.slice();

    // статус
    if (statusFilter === "active") {
      filtered = filtered.filter(d => d.active === true);
    }

    if (statusFilter === "archive") {
      filtered = filtered.filter(d => d.active === false);
    }

    // категория
    if (activeCategory !== "ALL" && !searchQuery) {
      filtered = filtered.filter(d => d.category === activeCategory);
    }

    // поиск (глобальный)
    if (searchQuery) {
      filtered = filtered.filter(d => {
        const blob = `
          ${d.number || ""}
          ${d.title || ""}
          ${(d.keywords || []).join(" ")}
          ${d.short || ""}
        `.toLowerCase();

        return blob.includes(searchQuery);
      });
    }

    if (!filtered.length) {
      container.innerHTML = "<p>Ничего не найдено</p>";
      return;
    }

    filtered.forEach(doc => {
      container.appendChild(createDocCard(doc));
    });
  }

  function createDocCard(doc) {
    const div = document.createElement("div");
    div.className = "doc-card";

    const statusBadge = doc.active
      ? `<span class="doc-status active">🟢</span>`
      : `<span class="doc-status archive">🔴</span>`;

    div.innerHTML = `
      <div class="doc-header">
        <strong>${escape(doc.number || "")}</strong>
        ${statusBadge}
      </div>

      <div class="doc-title">${escape(doc.title || "")}</div>
      <div class="doc-date">${formatDate(doc.date)}</div>

      ${doc.short ? `<div class="doc-short">${escape(doc.short)}</div>` : ""}

      <div class="doc-location">
        ${renderLocation(doc.location)}
      </div>
    `;

    return div;
  }

  function renderLocation(location) {
    if (!location) return "";

    return `
      <div class="location-path">
        <div><strong>${escape(location.cabinet || "")}</strong></div>
        <div>└── ${escape(location.folder || "")}</div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;└── ${escape(location.section || "")}</div>
      </div>
    `;
  }

  function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ru-RU");
  }

  function escape(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
