window.StaffPage = function() {

  let root = null;
  let staffData = [];

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

  async function mount(container) {
    root = container;

    root.innerHTML = `
      <div class="page-staff">

        <div class="header">
          <h1>Справочник</h1>
          <a href="#/" class="back-btn">
            ← На главную
          </a>
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

    await Data.init();
    staffData = await Data.getStaff();

    renderTable(staffData);
    bindEvents();
  }

  // ==============================
  // РЕНДЕР
  // ==============================


  function renderTable(data) {
    const tbody = root.querySelector("#staff-table tbody");
    tbody.innerHTML = "";

    // сортируем по подразделению
    const people = [...data].sort((a, b) => {
      if (a.unit < b.unit) return -1;
      if (a.unit > b.unit) return 1;
      return 0;
    });

    let currentUnit = null;

    people.forEach(person => {
      // заголовок группы
      if (person.unit !== currentUnit) {
        currentUnit = person.unit;

        const groupRow = document.createElement("tr");
        groupRow.className = "group-row";

        const td = document.createElement("td");
        td.colSpan = 8;
        td.textContent = currentUnit;

        groupRow.appendChild(td);
        tbody.appendChild(groupRow);
      }

      // строка человека
      const tr = document.createElement("tr");

      let weapons = formatWeapons(person.weapons);
      let mobilePhone = formatMobile(person.phone);
      let atsOgv = formatAts(person.phone);

      tr.innerHTML = `
      <td>${person.id}</td>
      <td>${person.fio}</td>
      <td>${person.rank}</td>
      <td>${person.position}</td>
      <td>${person.address}</td>
      <td>${weapons}</td>
      <td>${atsOgv}</td>
      <td>${mobilePhone}</td>
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


  // ==============================
  // ФИЛЬТР
  // ==============================

  function bindEvents() {
    const input = root.querySelector("#personnel-filter");
    const showBtn = root.querySelector("#show-staff");

    input.addEventListener("input", () => {
      const value = input.value.trim().toLowerCase();

      if (!value) {
        renderTable(staffData);
        return;
      }

      const filtered = staffData.filter(person => {
        const mobile = person.phone?.mobile?.join(" ") || "";
        const ats = person.phone?.ats_ogv?.join(" ") || "";

        const blob = `
          ${person.fio || ""}
          ${person.rank || ""}
          ${person.position || ""}
          ${person.address || ""}
          ${mobile}
          ${ats}
        `.toLowerCase();

        return blob.includes(value);
      });

      renderTable(filtered);
    });

    showBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openFioOnlyView(staffData)
    });
  }

  // ==============================
  // LIFECYCLE
  // ==============================

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
