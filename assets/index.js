const grid = document.getElementById("grid");

window.SCENARIOS.forEach(s => {
  const a = document.createElement("a");
  a.className = "tile " + s.color;
  a.href = "scenario.html?name=" + s.id;

  a.innerHTML = `
    <div class="title">${s.title}</div>
    <div class="desc">${s.description}</div>
  `;

  grid.appendChild(a);
});
