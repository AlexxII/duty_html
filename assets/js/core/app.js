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

        function isStepPartiallyConfirmed(stepIndex) {
          const state = confirmations[stepIndex];
          if (!state) return false;
          const values = Object.values(state);
          if (values.length === 0) return false;
          const someChecked = values.some(v => v?.checked === true);
          const allChecked = values.every(v => v?.checked === true);
          return someChecked && !allChecked;
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
            } else if (scenario.steps[i].confirm === true && isStepCompleted(current)) {
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

        // основные отрисовщики
        const blockRenderers = {
          info: renderInfoBlock,
          action: renderActionBlock,
          notify: renderNotifyBlock,
        };

        // отрисовка самих действий справа
        function renderStepContent() {
          const container = document.getElementById("step-text");
          container.innerHTML = "";

          const step = scenario.steps[current];
          const actions = normalizeStepText(step);

          console.log(actions)

          confirmations[current] ??= {
            persons: {},
            actions: {}
          };

          const seenPersons = new Set();

          actions.forEach((action, index) => {

            // ========= фильтр времени - day/night =========
            if (action.when && window.APP_MODE !== "all") {
              if (!action.when.includes(window.APP_MODE)) return;
            }

            const renderer = blockRenderers[action.type];

            if (!renderer) {
              throw new Error("Unknown block type:" + action.type);
            }

            renderer(action, {
              container,
              index,
              seenPersons
            });

          });
        }

        function renderActionBlock(action, ctx) {
          const { container, index } = ctx;

          if (!action.confirm) {
            renderPlainText(
              { value: action.value },
              container
            );
          } else {
            const actionKey = `action_${index}`;
            renderTextConfirm(
              { value: action.value },
              container,
              actionKey
            );
          }

          applyVariant(container, action.variant);
        }

        function renderNotifyBlock(action, ctx) {
          const { container, seenPersons } = ctx;

          const info = StaffService.resolveNotify(
            staff,
            roles,
            action.roleKey
          );

          const list = Array.isArray(info) ? info : [info];

          list.forEach(entry => {
            const person = entry.person;
            if (!person) return;

            if (entry.reserve) {
              seenPersons.add(entry.reserve.id);
            }

            const personId = person.id;
            const isDuplicate = seenPersons.has(personId);
            seenPersons.add(personId);

            renderPersonConfirm({
              info: entry,
              personId,
              isDuplicate,
              requireConfirm: action.confirm
            }, container);

            applyVariant(container, action.variant);
          });
        }

        function renderTextConfirm(action, container, actionKey) {
          const parent = document.createElement("div");
          parent.className = "step-line";

          const block = document.createElement("div");
          block.className = "confirm-line";

          const label = document.createElement("label");

          const state =
            confirmations[current].actions[actionKey] || {};

          const checked = state.checked === true;

          if (checked) block.classList.add("confirmed");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = checked;

          if (state?.timestamp) {
            const timeEl = document.createElement("div");
            timeEl.className = "confirm-time";

            const date = new Date(state.timestamp);
            timeEl.textContent = date.toLocaleTimeString("ru-RU");

            block.appendChild(timeEl);
          }

          checkbox.onchange = () => {
            confirmations[current].actions[actionKey] = {
              checked: checkbox.checked,
              timestamp: checkbox.checked ? Date.now() : null
            };
            saveState();
            render();
          };

          label.appendChild(checkbox);

          const content = document.createElement("div");
          content.className = "confirm-content";
          content.textContent = action.value;

          label.appendChild(content);
          block.appendChild(label);
          parent.appendChild(block);
          container.appendChild(parent);
        }

        function renderPersonConfirm(data, container) {
          const { info, personId, isDuplicate, requireConfirm } = data;

          const parent = document.createElement("div");
          parent.className = "step-line";

          const block = document.createElement("div");
          block.className = requireConfirm ? "confirm-line" : "plain-line";

          const label = document.createElement("label");

          const state =
            confirmations[current].persons[personId] || {};

          const checked = state.checked === true;

          if (checked) block.classList.add("confirmed");
          if (isDuplicate) block.classList.add("duplicate-person");

          if (requireConfirm) {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = checked;

            checkbox.onchange = () => {
              confirmations[current].persons[personId] = {
                checked: checkbox.checked,
                timestamp: checkbox.checked ? Date.now() : null
              };
              saveState();
              render();
            };
            label.appendChild(checkbox);
          }

          if (state?.timestamp) {
            const timeEl = document.createElement("div");
            timeEl.className = "confirm-time";

            const date = new Date(state.timestamp);
            timeEl.textContent = date.toLocaleTimeString("ru-RU");

            block.appendChild(timeEl);
          }

          const content = document.createElement("div");
          content.className = requireConfirm ? "confirm-content" : "";

          if (info.absent && info.reserve) {
            // только у шефа есть замена
            content.innerHTML = StaffService.formatters.chiefAbsent(info);
          } else if (info.absent) {
            content.innerHTML = StaffService.formatters.absent(info);
          } else {
            content.innerHTML = StaffService.formatters.present(info.person);
          }

          if (isDuplicate) {
            const badge = document.createElement("div");
            badge.style.color = "#ffa726";
            badge.style.fontSize = "14px";
            badge.textContent = "⚠ Уже отображён выше";
            content.appendChild(badge);
          }

          if (requireConfirm) {
            label.appendChild(content);
            block.appendChild(label);
          } else {
            block.appendChild(content);
          }

          parent.appendChild(block);
          container.appendChild(parent);
        }

        function renderInfoBlock(action, ctx) {
          const { container } = ctx;

          const parent = document.createElement("div");
          parent.className = "step-line";

          const block = document.createElement("div");
          block.className = "info-line";

          if (Array.isArray(action.value)) {
            action.value.forEach(line => {
              const p = document.createElement("div");
              p.className = "info-paragraph";
              p.textContent = line;
              block.appendChild(p);
            });
          } else {
            block.textContent = action.value;
          }

          parent.appendChild(block);
          container.appendChild(parent);

          applyVariant(container, action.variant);
        }

        function renderPlainText(info, container) {
          const parent = document.createElement("div");
          parent.className = "step-line";
          const block = document.createElement("div");
          block.className = "plain-line";
          block.textContent = info.value;
          parent.appendChild(block);
          container.appendChild(parent);
        }

        function applyVariant(container, variant) {
          if (!variant || variant === "default") return;

          const last = container.lastElementChild;
          if (!last) return;

          const block = last.querySelector(".confirm-line, .plain-line, .info-line");
          if (!block) return;

          block.classList.add(`variant-${variant}`);
        }

        function isStepCompleted(stepIndex) {
          const state = confirmations[stepIndex];
          if (!state) return false;

          const personIds = Object.keys(state.persons || {});
          const actionKeys = Object.keys(state.actions || {});

          const personsDone =
            personIds.length === 0 ||
            personIds.every(id => state.persons[id]?.checked === true);

          const actionsDone =
            actionKeys.length === 0 ||
            actionKeys.every(key => state.actions[key]?.checked === true);

          return personsDone && actionsDone;
        }

        // все шаги сценариев приводятся к данному формату
        function normalizeStepText(step) {
          return step.text.map(item => {
            if (!item.type) {
              throw new Error("Block must have a type");
            }
            return {
              type: item.type,
              value: item.value ?? null,
              roleKey: item.roleKey ?? null,
              confirm: item.confirm === true,
              variant: item.variant ?? "default",
              when: item.when ?? null
            };

          });
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
          // // если используется confirm — считаем выполненным только при полном подтверждении
          // if (step.confirm === true && isStepFullyConfirmed(current)) {
          //   completed.add(current);
          // }
          if (isStepCompleted(current)) {
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
