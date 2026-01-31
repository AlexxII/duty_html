const grid = document.getElementById("grid");

document.addEventListener("keyup", (e) => {
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return;
  }
  const scenario = window.SCENARIOS.find(
    s => s.hotkey === e.code
  );
  if (!scenario) return;
  window.location.href = `scenario.html?name=${scenario.id}`;
})

const used = new Set();
window.SCENARIOS.forEach(s => {
  if (used.has(s.hotkey)) {
    console.error("Дублируются hotkey:", s.hotkey);
  }
  used.add(s.hotkey);
})


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
