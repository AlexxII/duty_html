window.WikiManagement = function() {

  let root = null;
  let wiki = [];
  let selectedId = null;
  let editor = null;

  async function mount() {
    root = document.querySelector("#wiki-manager");
    const data = await Data.getWiki?.();
    wiki = data?.pages || [];
    render();
    bindGlobal();
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
              перед закрытием вкладки Экспортируйте данные.
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
  }

  function renderList() {
    const list = root.querySelector("#wiki-list");

    list.innerHTML = "";

    if (!wiki.length) {
      list.innerHTML = `
        <div class="admin-list-empty">
          ПУСТО
        </div>
      `;
      return;
    }

    wiki
      .slice()
      .sort((a, b) => {
        return (a.title || "")
          .localeCompare(b.title || "");
      })
      .forEach(page => {

        const item = document.createElement("div");

        item.className =
          "admin-item " +
          (selectedId === page.id
            ? "active"
            : "");

        item.dataset.id = page.id;

        item.innerHTML = `
          <div class="wiki-item-title">
            ${escapeHTML(
          page.title || "Без названия"
        )}
          </div>
        `;

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
        <div class="">
          Выберите страницу
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
          Страница не найдена
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
        "bold",
        "italic",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "table",
        "|",
        "fullscreen"
      ]
    });
  }

  function destroyEditor() {
    if (!editor) return;

    editor.toTextArea();
    editor = null;
  }

  function bindGlobal() {

    root.querySelector(
      "#wiki-create"
    ).onclick = () => {
      console.log('ssssssssssss')

      const page = {
        id: generateId(),
        title: "",
        content: "",
        updated_at:
          new Date().toISOString()
      };

      wiki.push(page);
      selectedId = page.id;

      render();
    };

    root.querySelector(
      "#wiki-export"
    ).onclick = () => {

      const blob = new Blob(
        [
          JSON.stringify(
            {
              pages: wiki,
              updated_at:
                new Date().toISOString()
            },
            null,
            2
          )
        ],
        {
          type: "application/json"
        }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;
      a.download = "wiki.json";

      a.click();

      URL.revokeObjectURL(url);
    };
  }

  function bindForm(page) {

    const form =
      root.querySelector("#wiki-form");

    const titleInput =
      form.querySelector("#wiki-title");

    // live update названия в sidebar
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
          "Страница с таким ID уже существует"
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
        "Удалить страницу?"
      );

      if (!ok) return;

      wiki = wiki.filter(p => {
        return p.id !== page.id;
      });

      selectedId = null;

      await save();

      render();
    };
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
