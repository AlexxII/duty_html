window.HealthUI = (function() {

  async function open() {
    const issues = await HealthCheck.run(true);
    showModal(issues);
  }

  function showModal(issues) {
    if (document.querySelector(".health-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "health-overlay";

    overlay.innerHTML = `
      <div class="health-modal">
        <h1>Состояние системы</h1>
        <div class="health-list"></div>
        <div class="health-actions">
          <button class="button button--secondary" id="health-close">
            Закрыть
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const list = overlay.querySelector(".health-list");

    if (!issues.length) {
      list.innerHTML = `
        <div class="health-item success">
          Система работает корректно. Нарушений не обнаружено.
        </div>
      `;
    } else {
      list.innerHTML = issues.map(issue => `
        <div class="health-item ${issue.level === "error" ? "error" : "warning"}">
          ${issue.level === "error" ? "Ошибка" : "Предупреждение"}:<br>
          ${escapeHtml(issue.message)}
        </div>
      `).join("");
    }

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", escHandler);
    }

    overlay.querySelector("#health-close").onclick = close;

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    function escHandler(e) {
      if (e.code === "Escape") close();
    }

    document.addEventListener("keydown", escHandler);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { open };

})();
