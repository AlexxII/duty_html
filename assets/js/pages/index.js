const grid = document.getElementById("grid");

const used = new Set();
window.SCENARIOS.forEach(s => {
  if (used.has(s.hotkey)) {
    console.error("Дублируются hotkey:", s.hotkey);
  }
  used.add(s.hotkey);
})

document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;

  window.location.href = `scenario.html?name=${scenario}`;
});

window.SCENARIOS.forEach(s => {
  const a = document.createElement("a");
  a.className = "tile " + s.color;
  a.href = "scenario.html?name=" + s.id;
  const label = window.utils.hotkeyLabel(s.hotkey);

  a.innerHTML = `
    <div class="title">${s.title}</div>
    <div class="hint">
      <span class="kbd"><i>${label}</i></span>
    </div>
  `;

  grid.appendChild(a);
});
