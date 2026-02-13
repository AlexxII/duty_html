window.SettingsAssistants = function (staff) {

  let root = null;

  function mount() {
    root = document.getElementById("assistants");

    root.innerHTML = `
      <h2>Помощники</h2>
      <p>Логика назначения помощников здесь.</p>
    `;
  }

  function unmount() {
    root.innerHTML = "";
  }

  return { mount, unmount };
};
