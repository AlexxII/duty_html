if (!window.SCENARIO) {
  throw new Error("SCENARIO is missing");
}
const scenario = window.SCENARIO;
let current = Number(localStorage.getItem(scenario.id + ".step")) || 0;

function applyMode(steps, mode) {
  let _steps = steps.filter(step =>
    !step.when || step.when.includes(mode)
  );
  return _steps;
}

// смотрим что за режим и применяем фильтр
if (window.APP_MODE != "all") {
  scenario.steps = applyMode(scenario.steps, window.APP_MODE);
}

function render() {
  const stepsEl = document.getElementById("steps");
  stepsEl.innerHTML = "";

  scenario.steps.forEach((step, i) => {
    const el = document.createElement("div");
    el.className =
      "step " +
      (i < current ? "done" : i === current ? "active" : "");

    el.innerHTML = `
      <div class="dot"></div>
      <div class="step-title">${step.title}</div>
    `;

    stepsEl.appendChild(el);
  });

  document.getElementById("step-title").textContent =
    scenario.steps[current].title;

  const ul = document.getElementById("step-text");
  ul.innerHTML = "";

  scenario.steps[current].text.forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  });

  localStorage.setItem(
    scenario.id + ".step",
    current
  );
}

document.getElementById("next").onclick = () => {
  if (current < scenario.steps.length - 1) {
    current++;
    render();
  }
};

document.getElementById("prev").onclick = () => {
  if (current > 0) {
    current--;
    render();
  }
};

render();
