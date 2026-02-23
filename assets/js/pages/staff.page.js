window.StaffPage = function() {

  let root = null;
  let staffData = [];
  let filterHandler = null;
  let keyHandler = null;
  let selectHandler = null;
  let selectHandlerEx = null;
  let showHandler = null;
  let fioWindow = null;
  // выбор и отображение выбранных
  let selectedIds = new Set();

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
                 class="input"
                 type="text"
                 placeholder="Поиск по ФИО, званию, телефону..." />
          <div>
            <!-- <a class="nav" id="save-selected"  -->
            <!--       style="display: ${selectedIds.size === 0 ? "none" : ""}"> -->
            <!--   <img src="assets/icons/save.svg" id="save-selected" class="icon"> -->
            <!-- </a> -->
            <a class="nav" id="reset"
                      data-tooltip="Сбросить выделение"
                      style="display: ${selectedIds.size === 0 ? "none" : ""}">
                <img src="assets/icons/clear.svg" id="reset-section" class="icon">
            </a>
            <button class="button small xl nav" id="show-selected" 
                      data-tooltip="Отобразить выделенное"
                  style="display: ${selectedIds.size === 0 ? "none" : ""}" >Отобразить</button>
            <button class="button small xl nav" id="show-all-staff"
                      data-tooltip="Отобразить весь список"
                    >Показать всех</button>
          </div>
        </div>
        <div>
          <table id="staff-table">
            <thead>
              <tr>
                <th></th>
                <th>ID</th>
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
        td.colSpan = 9;
        td.textContent = currentUnit || "—";

        groupRow.appendChild(td);
        tbody.appendChild(groupRow);
      }

      const tr = document.createElement("tr");
      const checked = selectedIds.has(person.id) ? "checked" : "";

      tr.innerHTML = `
        <td class="check-cell"><input type="checkbox" data-id="${person.id}" ${checked}></td>
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

  function updateButtonVisibility() {
    const showBtn = document.getElementById('show-selected');
    const resetBtn = document.getElementById('reset');
    // сохранение списков - в разработке (или нет)
    // const saveBtn = document.getElementById('save-selected');
    // saveBtn.style.display = selectedIds.size === 0 ? 'none' : 'inline-block';
    showBtn.style.display = selectedIds.size === 0 ? 'none' : 'inline-block';
    resetBtn.style.display = selectedIds.size === 0 ? 'none' : 'inline-block';
  }

  function bindEvents() {
    // TODO - разобраться с удалением событий, может и не надо если они на root
    const input = root.querySelector("#personnel-filter");
    const showBtn = root.querySelector("#show-all-staff");
    const tbody = root.querySelector("#staff-table tbody");

    root.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'show-selected') {
        if (!selectedIds.size) return;

        sessionStorage.setItem(
          "staff.temp.selection",
          JSON.stringify([...selectedIds])
        );

        window.open(
          location.pathname + "#/staff-selection",
          "_blank"
        );
      }

      if (e.target && e.target.id === "reset-section") {
        selectedIds.clear();
        updateButtonVisibility();
        renderTable(staffData);
      }

      // функционал приостановлен
      if (e.target && e.target.id === "save-selected") {
        // сохранение списков в localStorage
      }
    });

    selectHandlerEx = (e) => {
      const tr = e.target.closest("tr");
      if (!tr || tr.classList.contains("group-row")) return;
      // если кликнули прямо по checkbox — ничего не делаем
      if (e.target.matches("input[type='checkbox']")) return;
      const checkbox = tr.querySelector("input[type='checkbox']");
      if (!checkbox) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    };

    selectHandler = (e) => {
      const checkbox = e.target;
      if (!checkbox.matches("input[type='checkbox'][data-id]")) return;
      const id = Number(checkbox.dataset.id);
      if (checkbox.checked) {
        selectedIds.add(id);
        updateButtonVisibility();
      } else {
        selectedIds.delete(id);
        updateButtonVisibility();
      }
    };

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
          ${person.unit || ""}
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
      window.open(
        location.pathname + "#/staff-fio-only",
        "_blank"
      );
    };

    keyHandler = (e) => {
      if (e.code !== "Escape") return;
      if (!selectedIds.size) return;
      e.preventDefault();
      e.stopPropagation();
      selectedIds.clear();
      updateButtonVisibility();
      renderTable(staffData);
    };

    document.addEventListener("keydown", keyHandler);
    input.addEventListener("input", filterHandler);
    showBtn.addEventListener("click", showHandler);
    tbody.addEventListener("change", selectHandler);
    tbody.addEventListener("click", selectHandlerEx);
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
    const showBtn = root?.querySelector("#show-all-staff");

    if (input && filterHandler) {
      input.removeEventListener("input", filterHandler);
    }

    if (showBtn && showHandler) {
      showBtn.removeEventListener("click", showHandler);
    }

    if (fioWindow && !fioWindow.closed) {
      fioWindow.close();
    }

    // TODO разобраться со слушателями

    if (selectHandler) {
      document.removeEventListener("change", selectHandler);
    }

    if (selectHandlerEx) {
      document.removeEventListener("click", selectHandlerEx);
    }

    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
    }

    root.innerHTML = "";
  }

  return { mount, unmount };
};
