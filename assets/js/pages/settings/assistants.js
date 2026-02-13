window.SettingsAssistants = function(staff, roles) {

  let root = null;

  function mount() {
    root = document.getElementById("assistants");

    root.innerHTML = `
      <h2>Помощники</h2>
      <p>Логика назначения помощников здесь.</p>
    `;

    const extra = document.createElement("div");
    extra.className = "extra";
    const assistPool = roles.duty_assistant.staffIds;
    assistPool.forEach(id => {
      const person = getStaffById(staff, id);
      const row = document.createElement("div");
      row.className = "assistants-person";
      row.innerHTML = `
        <div>
          <p>${person.fio}</p>
        </div>
      `;
      root.appendChild(row);
    });
  }

  function getStaffById(staff, id) {
    return staff.find(p => p.id === id);
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
