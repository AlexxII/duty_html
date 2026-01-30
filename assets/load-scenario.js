(function() {
  const fallback = document.getElementById("fallback");
  const app = document.getElementById("app");
  const message = document.getElementById("fallback-message");

  function showFallback(text) {
    if (text) {
      message.textContent = text;
    }
    fallback.classList.remove("hidden");
    app.classList.add("hidden");
  }

  function showApp() {
    fallback.classList.add("hidden");
    app.classList.remove("hidden");
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

    // Грузим app.js ТОЛЬКО ПОСЛЕ сценария
    const appScript = document.createElement("script");
    appScript.src = "assets/app.js";
    document.head.appendChild(appScript);

    showApp();
  };

  document.head.appendChild(scenarioScript);
})();
