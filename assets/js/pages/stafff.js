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

  if (weapons.service_number) {
    parts.push(`АК: ${weapons.service_number}`);
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
      td.colSpan = 7;
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
