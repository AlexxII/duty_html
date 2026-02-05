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

function loadStatus(roleKey) {
  return JSON.parse(
    localStorage.getItem("status." + roleKey) ||
    '{"absent":false}'
  );
}

function getStaffById(id) {
  return window.STAFF.find(p => p.id === id) || null;
}

function getStaffByRole(role) {
  let staffId = window.ROLE_MAP[role].staffId;
  return window.STAFF.find(p => p.id == staffId);
}

// TODO выделить в utils!!?!?!?!?
//
function resolveNotify(roleKey) {
  const role = window.ROLE_MAP[roleKey];
  if (!role) return null;

  const status = loadStatus(roleKey);

  // начальник Центра
  if (
    // TODO привязать chief к глобальной переменной
    roleKey === "chief" &&
    status.absent === true &&
    status.actingRoleKey
  ) {
    return {
      absent: true,
      chief: true,
      until: status.absentUntil,
      person: getStaffById(role.staffId),
      reserve: getStaffByRole(status.actingRoleKey),
    }
  }

  // ОБЩИЙ СЛУЧАЙ
  if (status.absent === true) {
    return {
      absent: true,
      until: status.absentUntil,
      person: getStaffById(role.staffId),
    }
  }
  return {
    absent: false,
    person: getStaffById(role.staffId),
  };
}

function interpolateNotify(text) {
  return text.replace(/\{\{notify\.([a-z0-9_]+)\}\}/g,
    (_, roleKey) => {
      const person = resolveNotify(roleKey);

      if (person.absent && person.chief) {
        return formatChiefPersonAbsent(person)
      } else if (person.absent) {
        return formatPersonAbsent(person)
      } else {
        return formatPerson(person.person);
      }
    }
  );
}

function formatPersonAbsent(p) {
  const phone =
    p.person.phone?.mobile?.[0] ||
    p.person.phone?.ats_ogv?.[0] ||
    "—";
  const date = p.until ? `до ${window.utils.formatDate(p.until)}` : "";
  return `
    <div>
      ${window.utils.fioToShort(p.person.fio)},
        тел. ${phone} отсутствует ${date}
    </div>
  `
}

function formatChiefPersonAbsent(p) {
  const phone =
    p.person.phone?.mobile?.[0] ||
    p.person.phone?.ats_ogv?.[0] ||
    "—";
  return `
    <div class="chief-info">
      ${window.utils.fioToShort(p.person.fio)}, 
        тел. ${phone} не на месте || 
        вместо него - ${window.utils.fioToShort(p.reserve.fio)}
    </div >`
}

function formatPerson(p) {
  const phone =
    p.phone?.mobile?.[0] ||
    p.phone?.ats_ogv?.[0] ||
    "—";

  return `${p.fio}, тел. ${phone}`;
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
    li.innerHTML = interpolateNotify(line);
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
