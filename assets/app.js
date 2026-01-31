if (!window.SCENARIO) {
  throw new Error("SCENARIO is missing");
}
const scenario = window.SCENARIO;
// let current = Number(localStorage.getItem(scenario.id + ".step")) || 0;
let current = Number(localStorage.getItem(scenario.id + ".current")) || 0;

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

let completed = new Set(JSON.parse(localStorage.getItem(scenario.id + ".completed") || "[]"));
let viewed = new Set(JSON.parse(localStorage.getItem(scenario.id + ".viewed") || "[]"));

function resetScenario() {
  const prefix = scenario.id + ".";

  localStorage.removeItem(prefix + "current");
  localStorage.removeItem(prefix + "completed");
  localStorage.removeItem(prefix + "viewed");

  current = 0;
  completed.clear();
  viewed.clear();

  render();
}

function render() {
  const stepsEl = document.getElementById("steps");
  stepsEl.innerHTML = "";

  scenario.steps.forEach((step, i) => {
    const el = document.createElement("div");

    let state = "";
    if (completed.has(i)) {
      state = "done";
    } else if (i === current) {
      state = "active";
    } else if (viewed.has(i)) {
      state = "viewed";
    }
    el.className = "step " + state;

    el.innerHTML = `
      <div class="dot"></div>
      <div class="step-title">${step.title}</div>
    `;

    el.onclick = () => {
      current = i;
      viewed.add(i);
      saveState();
      render();
    };

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
  completed.add(current);
  viewed.add(current);

  if (current < scenario.steps.length - 1) {
    current++;
    viewed.add(current);
  }

  saveState();
  render();
};

document.getElementById("prev").onclick = () => {
  if (current > 0) {
    current--;
    viewed.add(current);
    saveState();
    render();
  }
};

document.getElementById("reset-storage").onclick = () => {
  if (confirm("Сбросить прогресс сценария?")) {
    resetScenario();
  }
}

function saveState() {
  localStorage.setItem(
    scenario.id + ".current",
    current
  );
  localStorage.setItem(
    scenario.id + ".completed",
    JSON.stringify([...completed])
  );
  localStorage.setItem(
    scenario.id + ".viewed",
    JSON.stringify([...viewed])
  );
}


render();
