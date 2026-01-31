const grid = document.getElementById("grid");

function get_time() {
  let time = new Date();
  let hour = time.getHours().toString().padStart(2, "0");
  let minute = time.getMinutes().toString().padStart(2, "0");
  let seconds = time.getSeconds().toString().padStart(2, "0");
  let timeString = hour + ":" + minute + ":" + seconds;

  const clock = document.getElementById("clock");
  clock.innerHTML = `${timeString}`;
  clock.className = "";
}

get_time()
setInterval(get_time, 1000);

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
