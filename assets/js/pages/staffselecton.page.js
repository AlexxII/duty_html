window.StaffSelectionPage = function() {

  let root = null;
  let positionsPool = [];

  async function mount(container) {
    root = container;
    await Data.init();
    const staff = await Data.getStaff();
    const positionsPool = await Data.getPositions();
    const ids = JSON.parse(
      sessionStorage.getItem("staff.temp.selection") || "[]"
    );
    const selected = staff.filter(p => ids.includes(p.id));
    render(selected);
  }


  function render(selected) {
    const groups = window.utils.reorderStaff(selected, positionsPool)

    root.innerHTML = `
    <div class="page-staff-selection">

      <div class="staff-selection-header">
        <input 
          id="custom-tab-title"
          class="input small"
          type="text"
          placeholder="Название вкладки..."
        />
      </div>

      <div id="list-container" class="staff-selection-list"></div>

    </div>
  `;

    const container = root.querySelector("#list-container");

    Object.entries(groups).forEach(([unit, people]) => {
      const section = document.createElement("div");
      section.className = "staff-selection-unit";

      section.innerHTML = `
      <div class="staff-selection-unit-title">
        ${unit}
      </div>

      <div class="staff-selection-people">

        ${people.map(p => {

        const mobile = window.utils.formatMobile(p.phone, "<br>");
        const ats = window.utils.formatAts(p.phone, "<br>");

        return `
            <div class="staff-selection-person">

              <div class="staff-selection-name">
                ${utils.fioToShort(p.fio)}
              </div>
              <div>
                ${window.utils.formatWeapons(p.weapons)}
              </div>

              <div class="staff-selection-phones">

                ${mobile ? `
                  <span class="phone phone-mobile">
                    📱 ${mobile}
                  </span>
                ` : ""}

                ${ats ? `
                  <span class="phone phone-ats">
                    ☎ ${ats}
                  </span>
                ` : ""}

              </div>

            </div>
          `;

      }).join("")}

      </div>
    `;
      container.appendChild(section);
    });
    const titleInput = root.querySelector("#custom-tab-title");
    titleInput.value = document.title;
    titleInput.addEventListener("input", () => {
      const value = titleInput.value.trim();
      document.title = value || "Дежурство";
    });
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
