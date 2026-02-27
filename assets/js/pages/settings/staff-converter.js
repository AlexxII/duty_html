window.StaffConverter = function() {
  let root = null;
  let parsedRows = [];
  let generatedStaff = [];
  let delay = 300;

  const REQUIRED_HEADERS = [
    "id",
    "ФИО",
    "должность",
    "звание",
    "подразделение",
    "телефон АТС-ОГВ",
    "мобильный телефон",
    "адрес проживания",
    "номер личного оружия",
    "номер индивидуального оружия",
    "домашний городской телефон",
    "второй мобильный телефон"
  ];

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function render() {
    root.innerHTML = `
      <h2>Конвертер staff CSV → JSON</h2>

      <input type="file" id="csv-input" accept=".csv" class="input">

      <button id="start-convert" class="button button--primary">
        Запустить проверку
      </button>

      <button id="download-json" class="button button--secondary hidden">
        Скачать staff.json
      </button>

      <hr>

      <div id="log"></div>
    `;

    bindEvents();
  }

  function logStep(text, status = "pending") {
    const log = root.querySelector("#log");

    const row = document.createElement("div");
    row.className = "health-item";
    row.textContent = text;

    if (status === "success") row.classList.add("success");
    if (status === "error") row.classList.add("error");

    log.appendChild(row);

    return row;
  }


  function parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const rows = lines.map(line => {
      const values = line.split(";").map(v => v.trim());

      if (values.length < 12) {
        throw new Error("Некорректное количество колонок");
      }

      return {
        id: values[0],
        fio: values[1],
        rank: values[2],
        position: values[3],
        unit: values[4],
        ats: values[5],
        mobile: values[6],
        address: values[7],
        personalWeapon: values[8],
        individualWeapon: values[9],
        home: values[10],
        mobile2: values[11]
      };
    });
    return rows;
  }

  function splitPhones(value) {
    if (!value || value === "-") return [];
    return value
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
  }

  function normalize(value) {
    return (!value || value === "-") ? "" : value.trim();
  }

  function buildStaffRecord(row) {

    const ats = splitPhones(row.ats);
    const mobiles = [
      ...splitPhones(row.mobile),
      ...splitPhones(row.mobile2)
    ];
    const home = splitPhones(row.home);

    const record = {
      id: Number(row.id),
      fio: normalize(row.fio),
      rank: normalize(row.rank),
      position: normalize(row.position),
      unit: normalize(row.unit),
      phone: {},
      address: normalize(row.address)
    };

    if (ats.length) record.phone.ats_ogv = ats;
    if (mobiles.length) record.phone.mobile = mobiles;
    if (home.length) record.phone.home = home;

    const weapons = {};

    if (normalize(row.personalWeapon))
      weapons.personal_number = normalize(row.personalWeapon);

    if (normalize(row.individualWeapon))
      weapons.individual_number = normalize(row.individualWeapon);

    if (Object.keys(weapons).length)
      record.weapons = weapons;

    return record;
  }

  async function runValidation() {

    const logContainer = root.querySelector("#log");
    logContainer.innerHTML = "";

    generatedStaff = [];

    const rowsStep = logStep("Проверка строк...");
    await sleep(delay);

    const ids = new Set();

    for (let i = 0; i < parsedRows.length; i++) {

      const row = parsedRows[i];

      if (!row.id || isNaN(Number(row.id))) {
        rowsStep.classList.add("error");
        rowsStep.textContent = `Ошибка: некорректный id в строке ${i + 1}`;
        return;
      }

      if (ids.has(row.id)) {
        rowsStep.classList.add("error");
        rowsStep.textContent = `Ошибка: дублирующийся id ${row.id}`;
        return;
      }

      ids.add(row.id);

      if (!row.fio) {
        rowsStep.classList.add("error");
        rowsStep.textContent = `Ошибка: пустое ФИО в строке ${i + 1}`;
        return;
      }

      generatedStaff.push(buildStaffRecord(row));
    }

    rowsStep.classList.add("success");

    const finalStep = logStep("Формирование JSON...");
    await sleep(delay);
    finalStep.classList.add("success");

    root.querySelector("#download-json").classList.remove("hidden");
  }

  function downloadJson(data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    const fileInput = root.querySelector("#csv-input");
    const startBtn = root.querySelector("#start-convert");
    const downloadBtn = root.querySelector("#download-json");

    startBtn.onclick = async () => {
      if (!fileInput.files.length) return;

      const text = await fileInput.files[0].text();
      parsedRows = parseCSV(text);

      await runValidation();
    };

    downloadBtn.onclick = () => {
      downloadJson(generatedStaff);
    };
  }

  function mount() {
    root = document.getElementById("staff-converter");
    render();
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
