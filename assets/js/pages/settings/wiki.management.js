window.WikiManagement = function() {

  let root = null;
  let wiki = [];
  let selectedId = null;
  let editor = null;

  async function mount() {
    root = document.querySelector("#wiki-manager");
    const data = await Data.getWiki?.();
    wiki = data?.pages || [];
    normalizeOrder();
    render();
  }

  function unmount() {
    destroyEditor();
    if (root) {
      root.innerHTML = "";
    }
  }

  function render() {
    root.innerHTML = `
      <div class="admin-layout admin-layout--fullheight">
        <aside class="admin-sidebar">
          <div class="admin-toolbar">
            <button
              class="button small"
              id="wiki-create"
            >
              Новый
            </button>
            <button
              class="button small"
              id="wiki-export"
            >
              Экспорт
            </button>
            <span class="export-alert">
              Внимание! Изменения хранятся в памяти браузера,
              перед закрытием вкладки Экспортируйте данные!
            </span>
          </div>
          <div
            id="wiki-list"
            class="admin-list"
          ></div>
        </aside>
        <section class="admin-content">
          <div id="wiki-content"></div>
        </section>
      </div>
    `;

    renderList();
    renderEditor();
    bindGlobal();
  }

  function renderList() {
    const list =
      root.querySelector("#wiki-list");

    list.innerHTML = "";
    if (!wiki.length) {
      list.innerHTML = `
        <div class="admin-list-empty">
          ПУСТО
        </div>
      `;
      return;
    }
    getSortedWiki().forEach((page, index) => {
      const item =
        document.createElement("div");
      item.className =
        "admin-item " +
        (
          selectedId === page.id
            ? "active"
            : ""
        );
      item.dataset.id = page.id;
      item.innerHTML = `
        <div class="admin-item__inner">

          <div class="wiki-item-title">
            ${escapeHTML(
        page.title || "Без названия"
      )}
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
              ${index === wiki.length - 1
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

        await movePage(
          page.id,
          "up"
        );
      };

      item.querySelector(
        '[data-action="down"]'
      ).onclick = async e => {
        e.stopPropagation();

        await movePage(
          page.id,
          "down"
        );
      };

      item.onclick = () => {
        selectedId = page.id;
        render();
      };

      list.appendChild(item);
    });
  }

  function renderEditor() {
    destroyEditor();
    const container =
      root.querySelector("#wiki-content");

    if (!selectedId) {
      container.innerHTML = `
        <div class="admin-empty">
          Выберите заметку
        </div>
      `;
      return;
    }

    const page = wiki.find(p => {
      return p.id === selectedId;
    });

    if (!page) {
      container.innerHTML = `
        <div class="admin-card">
          Заметкa не найдена
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <form id="wiki-form">
        <div class="admin-card">
          <div class="admin-grid-3">
            <div>
              <label>ID</label>
              <input
                class="input full"
                type="text"
                name="id"
                value="${escapeHTML(page.id)}"
                required
              >

            </div>
            <div>
              <label>Название</label>
              <input
                class="input full"
                type="text"
                id="wiki-title"
                name="title"
                value="${escapeHTML(page.title)}"
                required
              >
            </div>
          </div>
        </div>
        <div class="admin-card">
          <textarea
            id="wiki-markdown"
            name="content"
          >${escapeHTML(
      page.content || ""
    )}</textarea>
        </div>
        <div class="admin-form__actions">
          <button
            class="button button--primary"
            type="submit"
          >
            Сохранить
          </button>
          <button
            class="button button--warning"
            type="button"
            id="wiki-delete"
          >
            Удалить
          </button>
        </div>
      </form>
    `;
    initEditor();
    bindForm(page);
  }

  function initEditor() {
    editor = new EasyMDE({
      element:
        root.querySelector(
          "#wiki-markdown"
        ),

      spellChecker: false,
      status: false,
      autofocus: false,
      minHeight: "600px",

      previewClass:
        "markdown-preview",
      toolbar: [
        {
          name: "bold",
          action: EasyMDE.toggleBold,
          className: "toolbar-text",
          title: "Жирный",
          text: "Ж"
        },
        {
          name: "italic",
          action: EasyMDE.toggleItalic,
          className: "toolbar-text",
          title: "Курсив",
          text: "К"
        },
        "|",
        {
          name: "heading",
          action: EasyMDE.toggleHeadingSmaller,
          className: "toolbar-text",
          title: "Заголовок",
          text: "H"
        },
        {
          name: "unordered-list",
          action: EasyMDE.toggleUnorderedList,
          className: "toolbar-text",
          title: "Список",
          text: "•"
        },
        {
          name: "ordered-list",
          action: EasyMDE.toggleOrderedList,
          className: "toolbar-text",
          title: "Нумерация",
          text: "1."
        },
        "|",
        {
          name: "table",
          action: EasyMDE.drawTable,
          className: "toolbar-text",
          title: "Таблица",
          text: "#"
        },
        "|",
        {
          name: "fullscreen",
          action: EasyMDE.toggleFullScreen,
          className: "toolbar-text",
          title: "Полный экран",
          text: "⛶"
        }
      ]
    });
  }

  function destroyEditor() {
    if (!editor) return;
    editor.toTextArea();
    editor = null;
  }

  function bindGlobal() {

    root.querySelector("#wiki-create").onclick = () => {

      const page = {
        id: generateId(),
        title: "",
        content: "",
        order: wiki.length,
        updated_at:
          new Date().toISOString()
      };

      wiki.push(page);
      selectedId = page.id;
      render();
    };

    root.querySelector("#wiki-export").onclick = exportJson;
  }

  async function exportJson() {
    const file = await Data.exportWikiFile(wiki)

    const blob = new Blob(
      [JSON.stringify(file.content, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wiki.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  function bindForm(page) {
    const form =
      root.querySelector("#wiki-form");

    const titleInput =
      form.querySelector("#wiki-title");

    titleInput.oninput = e => {

      const value =
        e.target.value.trim();
      page.title = value;
      const item = root.querySelector(
        `.admin-item[data-id="${page.id}"] .wiki-item-title`
      );
      if (item) {
        item.textContent =
          value || "Без названия";
      }
    };

    form.onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(form);
      const next = {
        id: f.get("id").trim(),
        title: f.get("title").trim(),
        content: editor.value(),
        order: page.order || 0,
        updated_at:
          new Date().toISOString()
      };

      const exists = wiki.some(p => {
        return (
          p.id === next.id &&
          p.id !== page.id
        );
      });

      if (exists) {
        alert(
          "Заметка с таким ID уже существует"
        );
        return;
      }
      const index =
        wiki.findIndex(p => {
          return p.id === page.id;
        });
      wiki[index] = next;
      selectedId = next.id;
      await save();
      renderList();
    };

    root.querySelector(
      "#wiki-delete"
    ).onclick = async () => {
      const ok = confirm(
        "Удалить заметку?"
      );
      if (!ok) return;
      wiki = wiki.filter(p => {
        return p.id !== page.id;
      });
      normalizeOrder();
      selectedId = null;
      await save();
      render();
    };
  }

  function getSortedWiki() {
    return wiki
      .slice()
      .sort((a, b) => {
        return (
          (a.order || 0)
          - (b.order || 0)
        );
      });
  }

  async function movePage(id, direction) {
    const sorted = getSortedWiki();
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

    sorted.forEach((page, i) => {
      page.order = i;
    });

    wiki = sorted;
    await save();
    renderList();
  }

  function normalizeOrder() {
    wiki
      .sort((a, b) => {
        return (
          (a.order || 0)
          - (b.order || 0)
        );
      })
      .forEach((page, index) => {
        page.order = index;
      });
  }

  async function save() {
    await Data.setWiki({
      pages: wiki,
      updated_at:
        new Date().toISOString()
    });
  }

  function generateId() {
    return (
      "wiki_" +
      Date.now().toString(36)
    );
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
  return {
    mount,
    unmount
  };
};
