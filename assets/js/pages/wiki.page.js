window.WikiPage = function() {
  let root = null;
  let searchQuery = "";
  let pages = [];
  let filtered = [];
  let activeWiki = null;

  async function mount(container) {
    root = container;
    const data = await Data.getWiki?.();
    pages = data?.pages || [];

    renderLayout();
    bindEvents();
    render();
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-layout overflow">

        <div class="page-header">
          <h1>Wiki</h1>
          <a href="#/" class="back-btn">← На главную</a>
        </div>

        <div class="page-toolbar">
          <div class="page-search-wrapper">
            <input 
              id="wiki-search"
              class="input xl"
              placeholder="Поиск по названию и содержанию"
            />
            <button id="wiki-search-clear" class="page-clear-btn">✕</button>
          </div>
        </div>

        <div class="page-content">
          <aside class="page-sidebar" id="wiki-titles"></aside>
          <main class="page-list" id="wiki-list"></main>
        </div>

      </div>
    `;
  }

  function render() {
    filtered = getFilteredPages();

    if (!activeWiki && filtered.length) {
      activeWiki = filtered[0].id;
    }

    const exists = filtered.some(page => {
      return page.id === activeWiki;
    });

    if (!exists) {
      activeWiki = filtered[0]?.id || null;
    }
    renderTitles();
    renderWiki();
  }

  function renderTitles() {
    const container = root.querySelector("#wiki-titles");

    container.innerHTML = "";
    if (!filtered.length) {
      container.innerHTML = `
        <div class="page-empty">
          Ничего не найдено
        </div>
      `;
      return;
    }

    filtered.forEach(page => {
      container.appendChild(createTitleItem(page));
    });
  }

  function createTitleItem(page) {
    const item = document.createElement("div");
    item.className = "page-list-item";
    if (activeWiki === page.id) {
      item.classList.add("active");
    }
    item.textContent = page.title || "Без названия";

    item.onclick = () => {
      activeWiki = page.id;
      renderTitles();
      render();
    }
    return item
  }

  function renderWiki() {
    const container = root.querySelector("#wiki-list");
    container.innerHTML = "";

    if (!filtered.length) {
      container.innerHTML = `
        <div class="page-empty">
          Ничего не найдено
        </div>
      `;
      return;
    }

    const page = filtered.find(p => {
      return p.id === activeWiki;
    });

    if (!page) {
      container.innerHTML = `
      <div class="page-empty">
        Страница не найдена
      </div>
    `;
      return;
    }

    const article = document.createElement("article");
    article.className = "page-card markdown-body";
    article.id = `wiki-${page.id}`;
    article.innerHTML = `
      <div class="page-card-content">
        ${marked.parse(
      page.content || ""
    )}
      </div>
    `;
    container.appendChild(article);
  }

  function getFilteredPages() {
    const sorted = pages.slice()
      .sort((a, b) => {
        return (
          (a.order || 0)
          - (b.order || 0)
        );
      });
    if (!searchQuery) {
      return sorted;
    }

    return sorted.filter(page => {
      const title = (page.title || "").toLowerCase();
      const content = (page.content || "").toLowerCase();
      return (title.includes(searchQuery) || content.includes(searchQuery));
    });
  }

  function clearSearch() {
    searchQuery = "";
    const input = root.querySelector("#wiki-search");
    if (input) input.value = "";
    render();
  }

  function bindEvents() {
    const searchInput = root.querySelector("#wiki-search");
    const clearBtn = root.querySelector("#wiki-search-clear");

    searchInput.addEventListener("input", e => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    root.addEventListener("keydown", e => {
      if (e.code !== "Escape") return;
      if (!searchInput.value) return;
      e.preventDefault();
      e.stopPropagation();

      searchInput.value = "";
      searchQuery = "";
      render();
    });


    searchInput.addEventListener("input", e => {
      searchQuery = e.target.value.trim().toLowerCase();

      clearBtn.style.display = searchQuery ? "block" : "none";
      render();
    });

    clearBtn.addEventListener("click", () => {
      clearSearch();
      clearBtn.style.display = "none";
    });

  }

  function escapeHTML(str = "") {

    return String(str).replace(
      /[&<>"']/g,
      m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      }[m])
    );
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
