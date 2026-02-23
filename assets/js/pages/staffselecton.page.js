window.StaffSelectionPage = function() {

  let root = null;

  async function mount(container) {
    root = container;
    await Data.init();
    const staff = await Data.getStaff();
    const ids = JSON.parse(
      sessionStorage.getItem("staff.temp.selection") || "[]"
    );
    const selected = staff.filter(p => ids.includes(p.id));
    render(selected);
  }

  function render(selected) {
    const groups = {};
    selected.forEach(person => {
      if (!groups[person.unit]) groups[person.unit] = [];
      groups[person.unit].push(person);
    });

    root.innerHTML = `
      <div class="page-staff-selection">
        <div class="header">
          <div class="title-block">
            <input 
              id="custom-tab-title" 
              class="input small" 
              type="text" 
              placeholder="Название вкладки..."
            />
          </div>
        </div>

        <div id="list-container"></div>
      </div>
    `;

    const container = root.querySelector("#list-container");

    Object.entries(groups).forEach(([unit, people]) => {

      const section = document.createElement("div");
      section.innerHTML = `
        <h2>${unit}</h2>
        <ul>
          ${people.map(p => `
            <li>
              ${utils.fioToShort(p.fio)}
              — ${p.phone?.mobile?.[0] || p.phone?.ats_ogv?.[0] || "—"}
            </li>
          `).join("")}
        </ul>
      `;

      container.appendChild(section);
    });

    // ввод названия
    const titleInput = root.querySelector("#custom-tab-title");
    titleInput.value = document.title;

    titleInput.addEventListener("input", () => {
      const value = titleInput.value.trim();

      if (!value) {
        document.title = `Дежурство`;
      } else {
        document.title = value;
      }
    });
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
