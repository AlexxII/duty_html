(function() {
  const routes = {
    "/": window.IndexPage,
    "/scenario": window.ScenarioPage,
    "/settings": window.SettingsPage,
    "/staff": window.StaffPage
  };

  let currentInstance = null;

  function parseRoute() {
    const hash = location.hash.slice(1) || "/";
    const [path, query] = hash.split("?");
    const params = new URLSearchParams(query || "");
    return { path, params };
  }

  function navigate() {
    const { path, params } = parseRoute();

    if (currentInstance?.unmount) {
      currentInstance.unmount();
    }

    const Page = routes[path];

    if (!Page) {
      document.getElementById("app").innerHTML = "404";
      return;
    }

    currentInstance = Page();
    currentInstance.mount(document.getElementById("app"), params);
  }

  window.addEventListener("hashchange", navigate);
  window.addEventListener("load", navigate);

})();
