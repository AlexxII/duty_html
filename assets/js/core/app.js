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

        function isStepFullyConfirmed(stepIndex) {
          const state = confirmations[stepIndex];
          if (!state) return false;
          const values = Object.values(state);
          if (values.length === 0) return false;
          return values.every(v => v?.checked === true);
        }

        function isStepPartiallyConfirmed(stepIndex) {
          const state = confirmations[stepIndex];
          if (!state) return false;
          const values = Object.values(state);
          if (values.length === 0) return false;
          const someChecked = values.some(v => v?.checked === true);
          const allChecked = values.every(v => v?.checked === true);
          return someChecked && !allChecked;
        }

        // смотрим есть ли в строке сценария переменные
        function parseLine(text) {
          const match = text.match(/\{\{notify\.([a-z0-9_]+)\}\}/);
          if (!match) {
            return {
              type: "text",
              value: text
            };
          }
          return {
            type: "notify",
            roleKey: match[1]
          };
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
              <div class="step-title ${i === current ? "current" : ""}"> ${step.title}</div >
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

        // отрисовка самих действий справа
        function renderStepContent() {
          const container = document.getElementById("step-text");
          container.innerHTML = "";

          const step = scenario.steps[current];
          const actions = normalizeStepText(step);

          const hasConfirmLines = actions.some(a => a.confirm);

          if (hasConfirmLines) {
            confirmations[current] ??= {};
          }

          actions.forEach((action, index) => {

            if (action.type === "text") {
              renderPlainLine(action, container, index, action.confirm);
              return;
            }

            if (action.type === "notify") {
              const info = StaffService.resolveNotify(staff, roles, action.roleKey);

              if (Array.isArray(info)) {
                info.forEach((p, i) => {
                  renderPerson(p, container, `${index}_${i} `, action.confirm);
                });
              } else {
                renderSingle(info, container, `${index} _0`, action.confirm);
              }
            }
          });
          attachCheckboxHandlers(container);
        }

        function attachCheckboxHandlers(container) {
          container.querySelectorAll("input[type='checkbox']").forEach(cb => {
            cb.onchange = () => {
              const key = cb.dataset.line;
              confirmations[current] ??= {};
              if (cb.checked) {
                // сохраняем не только bool, но и время нажатия
                confirmations[current][key] = {
                  checked: true,
                  timestamp: Date.now()
                };
              } else {
                confirmations[current][key] = {
                  checked: false,
                  timestamp: null
                };
              }
              saveState();
              render();
            };
          });
        }

        function normalizeStepText(step) {
          return step.text.map(item => {
            // если строка
            if (typeof item === "string") {
              const parsed = parseLine(item);
              if (parsed.type === "notify") {
                return {
                  type: "notify",
                  roleKey: parsed.roleKey,
                  confirm: false
                };
              }
              return {
                type: "text",
                value: parsed.value,
                confirm: false
              };
            }
            // если объект
            const parsed = parseLine(item.value);
            if (parsed.type === "notify") {
              return {
                type: "notify",
                roleKey: parsed.roleKey,
                confirm: item.confirm === true
              };
            }
            return {
              type: "text",
              value: parsed.value,
              confirm: item.confirm === true
            };
          });
        }

        function renderPlainLine(info, container, confirmKey, requireConfirm) {
          let checkbox = null;
          const parent = document.createElement("div");
          parent.className = "step-line";
          const block = document.createElement("div");
          block.className = requireConfirm ? "confirm-line" : "plain-line";
          const label = document.createElement("label");

          if (requireConfirm) {
            checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.line = confirmKey;

            confirmations[current] ??= {};
            confirmations[current][confirmKey] ??= false;

            const state = confirmations[current][confirmKey];
            const checked = state?.checked === true;
            checkbox.checked = checked;
            block.classList.toggle("confirmed", checked);

            if (checked && state.timestamp) {
              const timeEl = document.createElement("div");
              timeEl.className = "confirm-time";
              timeEl.textContent = new Date(state.timestamp).toLocaleTimeString("ru-RU");
              label.appendChild(timeEl);
            }
          }

          if (checkbox) {
            label.appendChild(checkbox);
          }

          // если confirm — используем confirm-content, иначе просто текст
          if (requireConfirm) {
            const content = document.createElement("div");
            content.className = "confirm-content";
            content.textContent = info.value;
            label.appendChild(content);
          } else {
            block.textContent = info.value;
          }

          if (requireConfirm) {
            block.appendChild(label);
          }
          parent.appendChild(block);
          container.appendChild(parent);
        }

        function renderSingle(info, container, confirmKey, requireConfirm) {
          let checkbox = null;
          const parent = document.createElement("div");
          parent.className = "step-line"

          const block = document.createElement("div");
          block.className = "confirm-line";

          const label = document.createElement("label");

          // если в конфиге есть параметр confirm и он true
          if (requireConfirm) {
            checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.line = confirmKey;

            // восстановление из памяти состояние чекбокса
            confirmations[current] ??= {};
            confirmations[current][confirmKey] ??= false;

            const state = confirmations[current][confirmKey];
            const checked = state?.checked === true;
            checkbox.checked = checked;
            block.classList.toggle("confirmed", checked);

            if (checked && state.timestamp) {
              const timeEl = document.createElement("div");
              timeEl.className = "confirm-time";
              timeEl.textContent = new Date(state.timestamp).toLocaleTimeString("ru-RU");
              label.appendChild(timeEl);
            }
          }

          const content = document.createElement("div");
          content.className = "confirm-content";

          if (info.absent) {
            if (info.isChief) {
              // если это шеф
              content.innerHTML = StaffService.formatters.chiefAbsent(info);
            } else {
              content.innerHTML = StaffService.formatters.absent(info);
            }
          } else {
            content.innerHTML = StaffService.formatters.present(info.person);
          }

          if (checkbox) {
            label.appendChild(checkbox);
          }
          label.appendChild(content);
          block.appendChild(label);
          parent.appendChild(block)
          container.appendChild(parent);
        }

        // как правило для duty_assistant
        function renderPerson(personInfo, container, confirmKey, requireConfirm) {
          let checkbox = null;
          const parent = document.createElement("div");
          parent.className = "step-line"

          const block = document.createElement("div");
          block.className = "confirm-line";

          const label = document.createElement("label");

          if (requireConfirm) {
            checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.line = confirmKey;

            // восстановление из памяти состояние чекбокса
            confirmations[current] ??= {};
            confirmations[current][confirmKey] ??= false;

            const state = confirmations[current][confirmKey];
            const checked = state?.checked === true;
            checkbox.checked = checked;
            block.classList.toggle("confirmed", checked);

            if (checked && state.timestamp) {
              const timeEl = document.createElement("div");
              timeEl.className = "confirm-time";
              timeEl.textContent = new Date(state.timestamp).toLocaleTimeString("ru-RU");
              label.appendChild(timeEl);
            }
          }

          const content = document.createElement("div");
          content.className = "confirm-content";

          if (personInfo.absent) {
            content.innerHTML = StaffService.formatters.absent(personInfo);
          } else {
            content.innerHTML = StaffService.formatters.present(personInfo.person);
          }

          label.appendChild(checkbox);
          label.appendChild(content);
          block.appendChild(label);
          parent.appendChild(block);
          container.appendChild(parent);
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
