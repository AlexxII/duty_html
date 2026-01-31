(function() {
  const fallback = document.getElementById("fallback");
  const app = document.getElementById("main-app");
  const message = document.getElementById("fallback-message");
  const modeSelector = document.getElementById("mode-select");
  const scenaioTitle = document.getElementById("scenario-title");

  function showFallback(text) {
    if (text) {
      message.textContent = text;
    }
    fallback.classList.remove("hidden");
    app.classList.add("hidden");
  }

  // Рабочее/ Не рабочее
  function showModeSelect() {
    fallback.classList.add("hidden");
    app.classList.add("hidden");
    modeSelector.classList.remove("hidden")
  }

  function showApp() {
    modeSelector.classList.add("hidden");
    fallback.classList.add("hidden");
    app.classList.remove("hidden");
  }

  function loadApp() {
    const appScript = document.createElement("script");
    appScript.src = "assets/app.js";
    document.head.appendChild(appScript);
  }

  const params = new URLSearchParams(location.search);
  const name = params.get("name");

  if (!name) {
    showFallback("Не указан сценарий.");
    return;
  }

  const scenarioScript = document.createElement("script");
  scenarioScript.src = "scenarios/" + name + ".js";

  scenarioScript.onerror = () => {
    showFallback("Сценарий не найден: " + name);
  };

  scenarioScript.onload = () => {
    if (!window.SCENARIO) {
      showFallback("Сценарий загружен с ошибкой.");
      return;
    }

    scenaioTitle.innerHTML = `
      <span>${window.SCENARIO.title}</span>
    `

    if (window.SCENARIO.mode) {
      showModeSelect();
      modeSelector.querySelectorAll("button").forEach(btn => {
        btn.onclick = () => {
          const mode = btn.dataset.mode;
          window.APP_MODE = mode;
          showApp();
          loadApp();
        }
      });
    } else {
      window.APP_MODE = "all";
      showApp();
      loadApp();
    }

  };

  document.head.appendChild(scenarioScript);
})();
