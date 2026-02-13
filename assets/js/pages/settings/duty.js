window.SettingsDuty = function(dutyPool, staff) {

  let root = null;
  let appInstance = null;

  function mount() {
    root = document.getElementById("duty");

    root.innerHTML = `
      <div class="duty-layout">
        <aside class="calendar" id="duty-calendar"></aside>
        <main class="duty-people" id="duty-people"></main>
      </div>
    `;

    appInstance = createDutyApp(dutyPool, staff);
    appInstance.init();
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
