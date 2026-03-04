window.StaffManager = function() {

  let root = null
  let staff = []
  let roles = {}
  let editingId = null

  async function load() {
    await Data.init()
    staff = await Data.getStaff()
    roles = await Data.getRoles()
  }

  async function save() {
    await Data.setStaff(staff)
  }

  function render() {

    root.innerHTML = `
      <div class="staff-admin-layout">
        <aside class="staff-admin-sidebar">
          <div class="staff-admin-toolbar">
            <button id="staff-new"
              class="button button--primary small">
              Новый
            </button>
            <button id="staff-export"
              class="button small">
              Экспорт JSON
            </button>
          </div>
          <div id="staff-list" class="staff-admin-list"></div>
        </aside>
        <main class="staff-admin-content">
          <form id="staff-form" class="staff-admin-form"></form>
        </main>
      </div>
    `

    renderList()
    renderForm()
    bindEvents()
  }

  function renderList() {

    const container = root.querySelector("#staff-list")
    container.innerHTML = ""

    staff.forEach(person => {

      const el = document.createElement("div")
      el.className = "staff-admin-item"

      if (person.id === editingId) {
        el.classList.add("active")
      }

      el.textContent = person.fio

      el.onclick = () => {
        editingId = person.id
        renderForm(person)
        renderList()
      }

      container.appendChild(el)

    })
  }

  function renderForm(person = {}) {

    const form = root.querySelector("#staff-form")

    form.innerHTML = `
      <datalist id="rank-list"></datalist>
      <datalist id="position-list"></datalist>
      <datalist id="unit-list"></datalist>

      <div class="staff-admin-card">

        <div class="staff-admin-grid">

          <input class="input"
            name="fio"
            placeholder="ФИО"
            value="${person.fio || ""}">

          <input class="input"
            name="rank"
            list="rank-list"
            placeholder="Звание"
            value="${person.rank || ""}">

          <input class="input"
            name="position"
            list="position-list"
            placeholder="Должность"
            value="${person.position || ""}">

          <input class="input"
            name="unit"
            list="unit-list"
            placeholder="Подразделение"
            value="${person.unit || ""}">

        </div>

        <input class="input full"
          name="address"
          placeholder="Адрес проживания"
          value="${person.address || ""}">

      </div>


      <div class="staff-admin-card">

        <h4>Телефоны</h4>

        <div class="staff-admin-grid">

          <input class="input"
            name="mobile"
            placeholder="Мобильные через запятую, в формате 8-921-000-11-22"
            value="${(person.phone?.mobile || []).join(", ")}">

          <input class="input"
            name="ats"
            placeholder="АТС-ОГВ, в формате 22-00"
            value="${(person.phone?.ats_ogv || []).join(", ")}">

          <input class="input"
            name="home"
            placeholder="Домашний, в формате 45-30-99"
            value="${(person.phone?.home || []).join(", ")}">

        </div>

      </div>


      <div class="staff-admin-card">

        <h4>Оружие</h4>

        <div class="staff-admin-grid">

          <input class="input"
            name="pm"
            placeholder="ПМ"
            value="${person.weapons?.personal_number || ""}">

          <input class="input"
            name="ak"
            placeholder="АК"
            value="${person.weapons?.individual_number || ""}">

        </div>

        <button type="submit"
          class="button button--primary">
          Сохранить
        </button>

      </div>
    `
    fillAutoComplete();
  }

  function fillAutoComplete() {
    const ranks = new Set()
    const positions = new Set()
    const units = new Set()
    staff.forEach(p => {
      if (p.rank) ranks.add(p.rank)
      if (p.position) positions.add(p.position)
      if (p.unit) units.add(p.unit)
    })
    fillList("rank-list", ranks)
    fillList("position-list", positions)
    fillList("unit-list", units)
  }

  function fillList(id, values) {
    const el = root.querySelector("#" + id)
    el.innerHTML = ""
    Array.from(values)
      .sort()
      .forEach(v => {
        const opt = document.createElement("option")
        opt.value = v
        el.appendChild(opt)
      })
  }

  function exportStaff() {
    const json = JSON.stringify(staff, null, 2)
    const blob = new Blob([json], {
      type: "application/json"
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "staff.json"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function bindEvents() {
    root.querySelector("#staff-new").onclick = () => {
      editingId = null
      renderForm()
    }

    root.querySelector("#staff-export").onclick = exportStaff

    root.querySelector("#staff-form").onsubmit = async e => {
      e.preventDefault()
      const form = new FormData(e.target)
      const record = buildStaffRecord(form)
      if (editingId) {
        const index = staff.findIndex(p => p.id === editingId)
        staff[index] = { ...staff[index], ...record }
      } else {
        record.id = generateId()
        staff.push(record)
      }
      await save()
      editingId = record.id
      renderList()
      renderForm(record)
    }
  }

  function buildStaffRecord(form) {

    const split = v =>
      (v || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)

    const phones = {}

    const mobile = split(form.get("mobile"))
    const ats = split(form.get("ats"))
    const home = split(form.get("home"))

    if (mobile.length) phones.mobile = mobile
    if (ats.length) phones.ats_ogv = ats
    if (home.length) phones.home = home

    const weapons = {}

    if (form.get("pm")) {
      weapons.personal_number = form.get("pm").trim()
    }

    if (form.get("ak")) {
      weapons.individual_number = form.get("ak").trim()
    }

    const record = {
      fio: form.get("fio").trim(),
      rank: form.get("rank").trim(),
      position: form.get("position").trim(),
      unit: form.get("unit").trim(),
      address: form.get("address").trim(),
      phone: phones
    }

    if (Object.keys(weapons).length) {
      record.weapons = weapons
    }

    return record
  }

  function generateId() {
    if (!staff.length) return 1
    return Math.max(...staff.map(p => p.id)) + 1
  }

  function unmount() {
    root.innerHTML = ""
  }

  async function mount() {
    root = document.getElementById("staff-manager")
    await load()
    render()
  }

  return { mount, unmount }

}
