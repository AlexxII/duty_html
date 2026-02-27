(function() {
  const routes = {
    "/": window.IndexPage,
    "/scenario": window.ScenarioPage,
    "/settings": window.SettingsPage,
    "/staff": window.StaffPage,
    "/staff-selection": window.StaffSelectionPage,
    "/staff-fio-only": window.StaffFioPage,
    "/docs": window.DocsPage,
  };

  let currentInstance = null;

  function parseRoute() {
    const hash = location.hash.slice(1) || "/";
    const [path, query] = hash.split("?");
    const params = new URLSearchParams(query || "");
    return { path, params };
  }

  function startNotification() {
    ReminderService.start();

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }

  function navigate() {
    const { path, params } = parseRoute();

    startNotification();

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
