window.StaffPage = function() {

  let root = null;
  let staffData = [];
  let filterHandler = null;
  let showHandler = null;
  let fioWindow = null;

  function formatAts(phone) {
    return phone?.ats_ogv?.length
      ? phone.ats_ogv.join("<br>")
      : "—";
  }

  function formatMobile(phone) {
    return phone?.mobile?.length
      ? phone.mobile.join("<br>")
      : "—";
  }

  function formatWeapons(weapons) {
    if (!weapons) return "—";
    const parts = [];
    if (weapons.personal_number) {
      parts.push(`ПМ: ${weapons.personal_number}`);
    }
    if (weapons.individual_number) {
      parts.push(`АК: ${weapons.individual_number}`);
    }
    return parts.length ? parts.join("<br>") : "—";
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function mount(container) {
    root = container;
    renderLayout();
    try {
      await Data.init();
      staffData = await Data.getStaff();

      if (!Array.isArray(staffData)) {
        throw new Error("Некорректная структура staff");
      }

      renderTable(staffData);
      bindEvents();

    } catch (e) {
      console.error(e);
      renderFatal(e);
    }
  }

  function renderLayout() {
    root.innerHTML = `
      <div class="page-staff">
        <div class="header">
          <h1>Справочник</h1>
          <a href="#/" class="back-btn">← На главную</a>
        </div>
        <div class="table-header">
          <input id="personnel-filter"
                 type="text"
                 placeholder="Поиск по ФИО, званию, телефону..." />
          <a href="#" id="show-staff">Список</a>
        </div>
        <div>
          <table id="staff-table">
            <thead>
              <tr>
                <th>№</th>
                <th>ФИО</th>
                <th>Звание</th>
                <th>Должность</th>
                <th>Адрес проживания</th>
                <th>Оружие</th>
                <th>АТС-ОГВ</th>
                <th>Сотовый</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderTable(data) {
    const tbody = root.querySelector("#staff-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const people = [...data].sort((a, b) =>
      (a.unit || "").localeCompare(b.unit || "")
    );

    let currentUnit = null;

    people.forEach(person => {

      if (person.unit !== currentUnit) {
        currentUnit = person.unit;

        const groupRow = document.createElement("tr");
        groupRow.className = "group-row";

        const td = document.createElement("td");
        td.colSpan = 8;
        td.textContent = currentUnit || "—";

        groupRow.appendChild(td);
        tbody.appendChild(groupRow);
      }

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(person.id)}</td>
        <td>${escapeHtml(person.fio)}</td>
        <td>${escapeHtml(person.rank)}</td>
        <td>${escapeHtml(person.position)}</td>
        <td>${escapeHtml(person.address)}</td>
        <td>${formatWeapons(person.weapons)}</td>
        <td>${formatAts(person.phone)}</td>
        <td>${formatMobile(person.phone)}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  function openFioOnlyView(staff) {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Браузер заблокировал открытие вкладки");
      return;
    }
    // группировка по подразделениям
    const groups = {};
    for (const person of staff) {
      if (!groups[person.unit]) {
        groups[person.unit] = [];
      }
      groups[person.unit].push(person.fio);
    }
    const rawStaff = Object.entries(groups)
      .map(([_, fios]) => {
        const list = fios.map(f => `<li>${window.utils.fioToShort(f)}</li>`).join("");
        return `
        <section>
          <ul>
            ${list}
          </ul>
        </section>
      `;
      })
      .join("");

    const staffByUnits = Object.entries(groups)
      .map(([unit, fios]) => {
        const list = fios.map(f => `<li>${window.utils.fioToShort(f)}</li>`).join("");
        return `
        <section>
          <h2>${unit}</h2>
          <ul>
            ${list}
          </ul>
        </section>
      `;
      })
      .join("");

    win.document.write(`
    <!doctype html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <title>ФИО по подразделениям</title>
      <style>
        body {
          font-family: sans-serif;
          background: #121212;
          color: #e0e0e0;
          padding: 20px;
        }
        section {
          margin-bottom: 30px;
        }
        h2 {
          margin-bottom: 10px;
          padding-bottom: 4px;
          border-bottom: 1px solid #444;
        }
        li {
          margin-bottom: 6px;
          font-size: 18px;
        }
        .stuff-list {
          min-width: 600px;
          display: flex;
          gap: 30px;
        }
      </style>
    </head>
    <body>
      <div class="stuff-list">
        <div>
          ${staffByUnits}
        </div>
        <div>
          <ul>
            ${rawStaff}
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);

    win.document.close();
  }

  function bindEvents() {
    const input = root.querySelector("#personnel-filter");
    const showBtn = root.querySelector("#show-staff");

    filterHandler = () => {
      const value = input.value.trim().toLowerCase();

      if (!value) {
        renderTable(staffData);
        return;
      }

      const filtered = staffData.filter(person => {
        const blob = `
          ${person.fio || ""}
          ${person.rank || ""}
          ${person.position || ""}
          ${person.address || ""}
          ${(person.phone?.mobile || []).join(" ")}
          ${(person.phone?.ats_ogv || []).join(" ")}
        `.toLowerCase();

        return blob.includes(value);
      });

      renderTable(filtered);
    };

    showHandler = (e) => {
      e.preventDefault();
      openFioOnlyView(staffData);
    };

    input.addEventListener("input", filterHandler);
    showBtn.addEventListener("click", showHandler);
  }

  function renderFatal(error) {
    root.innerHTML = `
      <div class="fatal-error">
        <h2>Ошибка загрузки справочника</h2>
        <pre>${escapeHtml(error?.message || error)}</pre>
        <a href="#/" class="back-btn">На главную</a>
      </div>
    `;
  }

  function unmount() {

    const input = root?.querySelector("#personnel-filter");
    const showBtn = root?.querySelector("#show-staff");

    if (input && filterHandler) {
      input.removeEventListener("input", filterHandler);
    }

    if (showBtn && showHandler) {
      showBtn.removeEventListener("click", showHandler);
    }

    if (fioWindow && !fioWindow.closed) {
      fioWindow.close();
    }

    root.innerHTML = "";
  }

  return { mount, unmount };
};
