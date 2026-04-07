window.StaffFioPage = function() {

  let root = null;
  async function mount(container) {
    root = container;
    await Data.init();
    const staff = await Data.getStaff();
    render(staff);
  }

  function render(staff) {
    const groups = {};
    staff.forEach(person => {
      if (!groups[person.unit]) {
        groups[person.unit] = [];
      }
      groups[person.unit].push(person.fio);
    });

    // текст для копирования
    const rawText = Object.entries(groups)
      .map(([_, fios]) =>
        fios.map(f => utils.fioToShort(f)).join("\n")
      )
      .join("\n\n");

    root.innerHTML = `
      <div class="page-fio-only">
        <div class="header">
          <h1>ФИО по подразделениям</h1>
        </div>

        <div class="stuff-list">
          <div id="with-units"></div>

          <div id="raw-wrapper">
            <button id="copy-raw" class="button small">
              Копировать список
            </button>
            <div id="raw-list"></div>
          </div>
        </div>
      </div>
    `;

    const withUnits = root.querySelector("#with-units");
    const rawList = root.querySelector("#raw-list");

    Object.entries(groups).forEach(([unit, fios]) => {
      const sectionWithHeader = document.createElement("section");
      sectionWithHeader.innerHTML = `
        <h2>${unit || "—"}</h2>
        <ul>
          ${fios.map(f => `
            <li>${utils.fioToShort(f)}</li>
          `).join("")}
        </ul>
      `;

      withUnits.appendChild(sectionWithHeader);
      const sectionRaw = document.createElement("section");
      sectionRaw.innerHTML = `
        <ul>
          ${fios.map(f => `
            <li>${utils.fioToShort(f)}</li>
          `).join("")}
        </ul>
      `;
      rawList.appendChild(sectionRaw);
    });

    const copyBtn = root.querySelector("#copy-raw");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(rawText);
        copyBtn.textContent = "Скопировано";
        setTimeout(() => {
          copyBtn.textContent = "Копировать список";
        }, 1200);
      } catch (err) {
        alert("Не удалось скопировать");
      }
    });
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
