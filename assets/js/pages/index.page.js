window.IndexPage = function() {

  let root;

  async function mount(container) {
    root = container;
    renderLayout();
    try {
      Clock.start();
      await Data.init();
      const scenarios = await Data.getIndex();
      if (!scenarios || !scenarios.length) {
        renderEmptyState();
        return;
      }
      renderGrid(scenarios);
    } catch (e) {
      console.error(e);
      renderFatal(e);
    }
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-index">

        <div class="header">
          <h1>Документация дежурного</h1>
          <div>
            <a class="nav" href="#/settings">
              <img src="assets/icons/config.svg" alt="Настройки" class="icon">
            </a>
            <a class="nav" href="#/staff">
              <img src="assets/icons/staff.svg" alt="Люди" class="icon">
            </a>
            <p id="clock"></p>
          </div>
        </div>

        <div class="grid" id="grid"></div>

      </div>
    `;
  }

  function renderGrid(scenarios) {
    const grid = root.querySelector("#grid");
    grid.innerHTML = "";

    scenarios
      .sort((a, b) => a.order - b.order)
      .forEach(s => {
        const a = document.createElement("a");
        a.className = "tile " + s.color;
        a.href = `#/scenario?id=${s.id}`;
        a.innerHTML = `
          <div class="title">${s.title}</div>
        `;
        grid.appendChild(a);
      });
  }

  function renderFatal(error) {
    Clock.stop();

    root.innerHTML = `
      <div class="fatal-error">
        <h2>Ошибка приложения</h2>
        <pre>${escapeHtml(error?.message || error)}</pre>
        <a href="#/" class="back-btn">На главную</a>
      </div>
    `;
  }

  function renderEmptyState() {
    const grid = root.querySelector("#grid");
    grid.innerHTML = `
      <div class="fallback">
        <h2>Нет данных</h2>
        <p>Необходимо импортировать конфигурацию.</p>
      </div>
    `;
  }

  function renderFatal(error) {
    Clock.stop();

    root.innerHTML = `
      <div class="fatal-error">
        <h2>Ошибка приложения</h2>
        <pre>${escapeHtml(error?.message || error)}</pre>
        <a href="#/" class="back-btn">На главную</a>
      </div>
    `;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function unmount() {
    Clock.stop();
    root.innerHTML = "";
  }

  return { mount, unmount };
};
