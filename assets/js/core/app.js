(function() {
  function startScenario(scenario) {

    (async () => {
      try {
        await Data.init();
        const roles = await Data.getRoles();
        const staff = await Data.getStaff();

        const prefix = scenario.id + ".";

        let current = Number(localStorage.getItem(prefix + "current")) || 0;

        let completed = new Set(JSON.parse(localStorage.getItem(prefix + "completed") || "[]"));
        let viewed = new Set(JSON.parse(localStorage.getItem(prefix + "viewed") || "[]"));

        // состояние чекбоксов
        let confirmations = JSON.parse(localStorage.getItem(prefix + "confirmations") || "{}");

        function saveState() {
          localStorage.setItem(prefix + "current", current);
          localStorage.setItem(prefix + "completed", JSON.stringify([...completed]));
          localStorage.setItem(prefix + "viewed", JSON.stringify([...viewed]));
          localStorage.setItem(prefix + "confirmations", JSON.stringify(confirmations));
        }

        function resetScenario() {
          localStorage.removeItem(prefix + "current");
          localStorage.removeItem(prefix + "completed");
          localStorage.removeItem(prefix + "viewed");
          localStorage.removeItem(prefix + "confirmations");

          current = 0;
          completed.clear();
          viewed.clear();
          confirmations = {};

          render();
        }

        function applyMode(steps, mode) {
          return steps.filter(step =>
            !step.when || step.when.includes(mode)
          );
        }

        if (window.APP_MODE !== "all") {
          scenario.steps = applyMode(scenario.steps, window.APP_MODE);
        }

        function interpolateNotify(text) {
          return text.replace(/\{\{notify\.([a-z0-9_]+)\}\}/g, (_, roleKey) => {
            const info = StaffService.resolveNotify(staff, roles, roleKey);
            if (!info) return "";

            const { formatters } = StaffService;

            if (info.role === "duty_assistant") {
              return formatters.assistants(info.persons);
            }

            if (info.absent) {
              return info.isChief && info.reserve
                ? formatters.chiefAbsent(info)
                : formatters.absent(info);
            }

            return formatters.present(info.person);
          });
        }

        function isStepFullyConfirmed(stepIndex) {
          const step = scenario.steps[stepIndex];
          const lines = step.text.length;

          const state = confirmations[stepIndex] || [];
          if (!state.length) return false;

          return state.length === lines && state.every(Boolean);
        }

        function isStepPartiallyConfirmed(stepIndex) {
          const state = confirmations[stepIndex] || [];
          return state.some(Boolean) && !isStepFullyConfirmed(stepIndex);
        }

        function render() {
          const stepsEl = document.getElementById("steps");
          stepsEl.innerHTML = "";

          scenario.steps.forEach((step, i) => {

            const el = document.createElement("div");

            let state = "";

            if (completed.has(i)) {
              state = "done";
            } else if (isStepPartiallyConfirmed(i)) {
              state = "partial";
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

          const step = scenario.steps[current];

          const requireConfirm = step.confirm === true;

          if (requireConfirm && !confirmations[current]) {
            confirmations[current] = new Array(step.text.length).fill(false);
          }

          step.text.forEach((line, index) => {

            const li = document.createElement("li");

            if (requireConfirm) {

              const checked = confirmations[current][index];

              li.innerHTML = `
                <label style="cursor:pointer;">
                  <input type="checkbox"
                         data-line="${index}"
                         ${checked ? "checked" : ""}>
                  <span>${interpolateNotify(line)}</span>
                </label>
              `;

            } else {

              li.innerHTML = interpolateNotify(line);

            }

            ul.appendChild(li);
          });

          ul.querySelectorAll("input[type='checkbox']").forEach(cb => {
            cb.onchange = () => {
              const lineIndex = Number(cb.dataset.line);
              confirmations[current][lineIndex] = cb.checked;
              saveState();
              render();
            };
          });

          saveState();
        }

        document.getElementById("next").onclick = () => {

          //если полностью подтвержден — считаем выполненным
          if (isStepFullyConfirmed(current)) {
            completed.add(current);
          }

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
        };

        render();

      } catch (e) {
        console.log(e);
        utils.showFatalError(e);
      }
    })();

  }

  window.startScenario = startScenario;
})();
