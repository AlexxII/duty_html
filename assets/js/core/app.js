(function() {
  function startScenario(scenario) {

    (async () => {
      try {
        await Data.init();
        const roles = await Data.getRoles();
        const staff = await Data.getStaff();

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

        const StaffService = {
          _getPhone(person) {
            if (!person?.phone) return "—";
            const { mobile, ats_ogv } = person.phone;
            return (mobile && mobile[0]) || (ats_ogv && ats_ogv[0]) || "—";
          },

          _formatDate(date) {
            if (!date) return "";
            return new Date(date).toLocaleDateString('ru-RU');
          },

          loadStatus(roleKey) {
            try {
              return JSON.parse(localStorage.getItem(`status.${roleKey}`)) || { absent: false };
            } catch {
              return { absent: false };
            }
          },

          getStaffById(id) {
            return staff.find(p => p.id === id) || null;
          },

          getStaffByRole(role) {
            const staffId = roles[role]?.staffId;
            return this.getStaffById(staffId);
          },

          // загрузить сведения об отсутствии из localStorage
          loadDutyAssistantStatus(id) {
            const key = `assistants.status.${id}`;
            return JSON.parse(localStorage.getItem(key) || null);
          },

          // загрузить очередность оповещения из localStorage или из конфига
          loadDutyAssistantOrder() {
            const key = `assistants.order`;
            return JSON.parse(localStorage.getItem(key) || null);
          },

          resolveNotify(roleKey) {
            const role = roles[roleKey];
            if (!role) return null;

            // ===== ПОМОЩНИК ДЕЖУРНОГО =====
            if (roleKey === "duty_assistant") {
              const order = this.loadDutyAssistantOrder() ?? roles.duty_assistant.staffIds;

              return order.reduce((acc, id) => {
                const person = staff.find(p => p.id === id);
                const absent = this.loadDutyAssistantStatus(id);
                acc.persons.push({
                  person,
                  absent
                });
                return acc;
              }, { persons: [], role: "duty_assistant" });
            }

            const status = this.loadStatus(roleKey);
            const person = this.getStaffById(role.staffId);

            const data = {
              absent: !!status.absent,
              until: status.absentUntil,
              person: person,
              isChief: roleKey === "chief" && !!status.actingRoleKey
            };

            if (data.absent && data.isChief) {
              data.reserve = this.getStaffByRole(status.actingRoleKey);
            }

            return data;
          },

          formatters: {
            base(person) {
              const phone = StaffService._getPhone(person);
              const fio = window.utils.fioToShort(person.fio);
              return {
                // HTML-строки с классами для имени и телефона
                htmlFio: `<span class="fio-name">${fio}</span>`,
                htmlPhone: `<span class="phone-number">${phone}</span>`
              };
            },

            present(person) {
              const { htmlFio, htmlPhone } = this.base(person);
              return `<div class="staff-status">${htmlFio}, тел. ${htmlPhone}</div>`;
            },

            absent(p) {
              const { htmlFio, htmlPhone } = this.base(p.person);
              const date = StaffService._formatDate(p.until);
              const dateText = date ? ` до ${date}` : "";

              return `
                <div class="staff-status status-absent">
                  ${htmlFio}, тел. ${htmlPhone} отсутствует${dateText}
                </div>`;
            },

            chiefAbsent(p) {
              const { htmlFio, htmlPhone } = this.base(p.person);
              const reserveFio = window.utils.fioToShort(p.reserve?.fio || "—");
              const reserveHtmlPhone = StaffService._getPhone(p.reserve);

              return `
                <div class="chief-info">
                  <div>${htmlFio}, тел. ${htmlPhone}</div>
                  <div class="reserve-label">
                    ↳ И.О.: <span class="reserve-name">${reserveFio}, тел. ${reserveHtmlPhone}</span>
                  </div>
                </div>`;
            },

            assistants(persons) {
              if (!Array.isArray(persons) || !persons.length) {
                return "";
              }
              return persons.map(p => {
                const fio = utils.fioToShort(p.person.fio);
                const phone = StaffService._getPhone(p.person);
                if (p.absent && p.absent.absent) {
                  const until = p.absent.until
                    ? ` до ${new Date(p.absent.until).toLocaleDateString("ru-RU")}`
                    : "";
                  return `
                    <div class="staff-status status-absent">
                      <span>${fio}</span>
                      <span>тел. ${phone}</span>
                      <span class="assistant-status large">
                        отсутствует${until}
                      </span>
                    </div>
                  `;
                }
                return `
                  <div class="staff-status">
                    <span>${fio}</span>
                    <span>тел. ${phone}</span>
                  </div>
                `;
              }).join("");
            }
          }
        };

        function interpolateNotify(text) {
          return text.replace(/\{\{notify\.([a-z0-9_]+)\}\}/g, (_, roleKey) => {
            const info = StaffService.resolveNotify(roleKey);
            if (!info) return "";

            const { formatters } = StaffService;

            if (info.role == "duty_assistant") {
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

      } catch (e) {
        console.log(e)
        utils.showFatalError(e);
      }
    })();

  }
  window.startScenario = startScenario;
})();
