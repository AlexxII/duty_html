// ---------- НАВИГАЦИЯ СЛЕВА ----------
const navButtons = document.querySelectorAll(".settings-nav button");
const sections = document.querySelectorAll(".settings-section");

navButtons.forEach(btn => {
  btn.onclick = () => {
    const id = btn.dataset.section;

    navButtons.forEach(b => b.classList.remove("active"));
    sections.forEach(s => s.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(id).classList.add("active");
  };
});

// ---------- ЗАГРУЗКА НАСТРОЕК ----------
const inputs = document.querySelectorAll("input[data-key]");

inputs.forEach(input => {
  const key = "var." + input.dataset.key;
  const value = localStorage.getItem(key);
  if (value) {
    input.value = value;
  }
});

// ---------- СОХРАНЕНИЕ ----------
document.getElementById("save-management").onclick = () => {
  inputs.forEach(input => {
    const key = "var." + input.dataset.key;
    const value = input.value.trim();

    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  });

  alert("Настройки сохранены");
};
