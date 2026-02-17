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
          return values.every(v => v === true);
        }

        function isStepPartiallyConfirmed(stepIndex) {
          const state = confirmations[stepIndex];
          if (!state) return false;
          const values = Object.values(state);
          if (values.length === 0) return false;
          return values.some(Boolean) && !values.every(Boolean);
        }

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
            const requireConfirm = isObject && item.confirm === true;

            const parsed = parseLine(line);
            if (parsed.type === "text") {
              renderPlainLine(parsed.value, container);
            }

            if (parsed.type === "notify") {
              const info = StaffService.resolveNotify(staff, roles, parsed.roleKey);
              if (Array.isArray(info)) {
                info.forEach((p, i) => {
                  renderPerson(p, container, `${index}_${i}`);
                });
              } else {
                renderSingle(info, container, `${index}_0`);
              }
            }
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

        function renderPlainLine(text, container) {
          const block = document.createElement("div");
          block.className = "step-line";
          const line = document.createElement("div");
          line.className = "plain-line";
          line.textContent = text;
          block.appendChild(line);
          container.appendChild(block);
        }

        function renderSingle(info, container, confirmKey) {
          const parent = document.createElement("div");
          parent.className = "step-line"

          const block = document.createElement("div");
          block.className = "confirm-line";

          const label = document.createElement("label");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.line = confirmKey;

          // восстановление из памяти
          if (!confirmations[current]) {
            confirmations[current] = {};
          }
          if (!(confirmKey in confirmations[current])) {
            confirmations[current][confirmKey] = false;
          }
          checkbox.checked = confirmations[current][confirmKey];

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

          label.appendChild(checkbox);
          label.appendChild(content);
          block.appendChild(label);
          parent.appendChild(block)
          container.appendChild(parent);
        }

        // как правило для duty_assistant
        function renderPerson(personInfo, container, confirmKey) {
          const parent = document.createElement("div");
          parent.className = "step-line"

          const block = document.createElement("div");
          block.className = "confirm-line";

          const label = document.createElement("label");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.line = confirmKey;

          // восстановление из памяти
          if (!confirmations[current]) {
            confirmations[current] = {};
          }
          if (!(confirmKey in confirmations[current])) {
            confirmations[current][confirmKey] = false;
          }
          checkbox.checked = confirmations[current][confirmKey];

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
