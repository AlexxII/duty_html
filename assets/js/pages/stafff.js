const filterInput = document.getElementById("personnel-filter");
const tbody = document.querySelector("#staff-table tbody");

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

function renderPersonnelTable(data) {
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

function fioToShort(fio) {
  const m = fio.match(/^(\S+)\s+(\S)\S*\s+(\S)\S*/);
  if (!m) return fio; // на случай, если кто-то сломал данные
  return `${m[1]} ${m[2]}.${m[3]}.`;
}

function openFioOnlyView() {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Браузер заблокировал открытие вкладки");
    return;
  }

  // группировка по подразделениям
  const groups = {};
  for (const person of window.STAFF) {
    if (!groups[person.unit]) {
      groups[person.unit] = [];
    }
    groups[person.unit].push(person.fio);
  }

  const rawStaff = Object.entries(groups)
    .map(([unit, fios]) => {
      const list = fios.map(f => `<li>${fioToShort(f)}</li>`).join("");
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
      const list = fios.map(f => `<li>${fioToShort(f)}</li>`).join("");
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

document.getElementById("show-staff").onclick = (e) => {
  openFioOnlyView();
}


function applyFilter() {
  const value = filterInput.value.toLowerCase().trim();
  const rows = tbody.querySelectorAll("tr");

  // меньше 3 символов — показать всё
  if (value.length < 3) {
    rows.forEach(row => {
      row.style.display = "";
    });
    return;
  }

  let currentGroup = null;
  let groupHasVisibleRows = false;

  rows.forEach(row => {
    // если это заголовок группы
    if (row.classList.contains("group-row")) {
      // закрываем предыдущую группу
      if (currentGroup && !groupHasVisibleRows) {
        currentGroup.style.display = "none";
      }

      currentGroup = row;
      groupHasVisibleRows = false;
      row.style.display = "none";
      return;
    }

    // обычная строка человека
    const text = row.textContent.toLowerCase();
    const match = text.includes(value);

    row.style.display = match ? "" : "none";

    if (match) {
      groupHasVisibleRows = true;
      if (currentGroup) {
        currentGroup.style.display = "";
      }
    }
  });

  // последняя группа
  if (currentGroup && !groupHasVisibleRows) {
    currentGroup.style.display = "none";
  }
}

renderPersonnelTable(window.STAFF);

filterInput.addEventListener("input", applyFilter);
