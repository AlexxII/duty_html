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

        // логика работы с переменными в сценариях 
        function interpolateNotify(text) {
          return text.replace(/\{\{notify\.([a-z0-9_]+)\}\}/g, (_, roleKey) => {
            const info = StaffService.resolveNotify(staff, roles, roleKey);
            if (!info) return "";

            const { formatters } = StaffService;

            if (Array.isArray(info)) {
              return info.map(item => {
                if (item.absent && item.absent.absent) {
                  return formatters.absent(item);
                }
                return formatters.present(item.person);
              }).join("|||SPLIT|||");
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
          const state = confirmations[stepIndex];
          if (!state) return false;
          const values = Object.values(state);
          if (values.length === 0) return false;
          return values.every(v => v === true);
        }

        function isStepPartiallyConfirmed(stepIndex) {
          const state = confirmations[stepIndex];
          if (!state) return false;
          const values = Object.values(state);
          if (values.length === 0) return false;
          return values.some(Boolean) && !values.every(Boolean);
        }

        // отрисовываем status-line слева
        function renderSteps() {
          const stepsEl = document.getElementById("steps");
          stepsEl.innerHTML = "";
          scenario.steps.forEach((step, i) => {
            const el = document.createElement("div");
            let state = "";
            if (completed.has(i)) {
              state = "done";
            } else if (scenario.steps[i].confirm === true && isStepFullyConfirmed(i)) {
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
        }

        function renderStepContent() {
          const container = document.getElementById("step-text");
          container.innerHTML = "";

          const step = scenario.steps[current];
          // проверяем есть ли параметры, требующие подтверждения
          const hasConfirmLines = step.text.some(item =>
            typeof item === "object" && item.confirm === true
          );

          if (hasConfirmLines && !confirmations[current]) {
            confirmations[current] = {};
          }

          step.text.forEach((item, index) => {
            // определяем являеся ли запись строкой или массивом
            const isObject = typeof item === "object";
            const line = isObject ? item.value : item;
            // нужно ли подтверждение (т.е. наличие чекбоксов)
            const requireConfirm = isObject && item.confirm === true;

            const result = interpolateNotify(line);
            const items = result.includes("|||SPLIT|||")
              ? result.split("|||SPLIT|||")
              : [result];

            items.forEach((html, subIndex) => {

              const block = document.createElement("div");
              block.className = "step-line";

              if (requireConfirm) {
                const confirmIndex = `${index}_${subIndex}`;
                if (!confirmations[current]) confirmations[current] = {};

                const checked = confirmations[current][confirmIndex] || false;

                block.innerHTML = `
                  <div class="confirm-line ${checked ? "confirmed" : ""}">
                    <label>
                      <input type="checkbox"
                             data-line="${confirmIndex}"
                             ${checked ? "checked" : ""}>
                      <div class="confirm-content">
                        ${html}
                      </div>
                    </label>
                  </div>
                `;
              } else {
                block.innerHTML = `
                  <div class="plain-line">
                    ${html}
                  </div>
                `;
              }

              if (requireConfirm) {
                const confirmKey = `${index}_${subIndex}`;
                if (!confirmations[current]) {
                  confirmations[current] = {};
                }
                if (!(confirmKey in confirmations[current])) {
                  confirmations[current][confirmKey] = false;
                }
              }

              container.appendChild(block);
            });
          });
          // обрабока событий чекбоксов
          if (hasConfirmLines) {
            container.querySelectorAll("input[type='checkbox']").forEach(cb => {
              cb.onchange = () => {
                const key = cb.dataset.line;
                confirmations[current][key] = cb.checked;
                saveState();
                render();
              };
            });
          }
        }

        // основное отображение
        function render() {
          renderSteps()
          //заголовок шага
          document.getElementById("step-title").textContent =
            scenario.steps[current].title;

          renderStepContent();
          saveState();
        }

        document.getElementById("next").onclick = () => {
          const step = scenario.steps[current];
          // если confirm не используется — шаг считается выполненным
          if (step.confirm !== true) {
            completed.add(current);
          }
          // если используется confirm — считаем выполненным только при полном подтверждении
          if (step.confirm === true && isStepFullyConfirmed(current)) {
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
