window.SettingsPage = function() {

  let root = null;
  let activeModule = null;

  async function mount(container) {
    root = container;
    renderLayout();
    bindNavigation();

    try {
      await initDataAndMount("management");
    } catch (e) {
      console.log(e)
    }
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-settings">

        <div class="header">
          <h1>Настройки</h1>
          <a href="#/" class="back-btn">← На главную</a>
        </div>

        <div class="settings-layout">

          <nav class="settings-nav">
            <button data-section="management" class="active">Руководство</button>
            <button data-section="duty">Дежурные</button>
            <button data-section="assistants">Помощники</button>
          </nav>

          <main class="settings-content">
            <section id="management" class="settings-section active"></section>
            <section id="duty" class="settings-section"></section>
            <section id="assistants" class="settings-section"></section>
          </main>

        </div>
      </div>
    `;
  }

  async function initDataAndMount(section) {
    await Data.init();

    const staff = await Data.getStaff();
    const roles = await Data.getRoles();
    const dutyPool = await Data.getDutyPool();

    switchModule(section, { staff, roles, dutyPool });
  }

  function switchModule(section, data) {

    if (activeModule?.unmount) {
      activeModule.unmount();
    }

    if (section === "management") {
      activeModule = window.SettingsManagement(data.staff, data.roles);
    }

    if (section === "duty") {
      activeModule = window.SettingsDuty(data.dutyPool.duty_pool, data.staff);
    }

    if (section === "assistants") {
      activeModule = window.SettingsAssistants(data.staff, data.roles);
    }

    activeModule.mount();
  }

  function bindNavigation() {
    const buttons = root.querySelectorAll(".settings-nav button");

    buttons.forEach(btn => {
      btn.onclick = async () => {

        const section = btn.dataset.section;

        root.querySelectorAll(".settings-nav button")
          .forEach(b => b.classList.remove("active"));

        root.querySelectorAll(".settings-section")
          .forEach(s => s.classList.remove("active"));

        btn.classList.add("active");
        root.querySelector("#" + section).classList.add("active");

        await initDataAndMount(section);
      };
    });
  }

  function unmount() {
    activeModule?.unmount?.();
    root.innerHTML = "";
  }

  return { mount, unmount };
};
