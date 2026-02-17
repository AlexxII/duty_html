(function() {
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

    getStaffById(staff, id) {
      return staff.find(p => p.id === id) || null;
    },

    getStaffByRole(staff, roles, role) {
      const staffId = roles[role]?.staffId;
      return this.getStaffById(staff, staffId);
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

    resolveNotify(staff, roles, roleKey) {
      const role = roles[roleKey];
      if (!role) return null;
      // ===== ПОМОЩНИКИ ДЕЖУРНОГО =====
      if (roleKey === "duty_assistant") {
        const order = this.loadDutyAssistantOrder() ?? roles.duty_assistant.staffIds;

        return order.map(id => {
          const person = staff.find(p => p.id === id);
          const absent = this.loadDutyAssistantStatus(id);

          return {
            role: "duty_assistant_single",
            person,
            absent
          };
        });
      }

      const status = this.loadStatus(roleKey);
      const person = this.getStaffById(staff, role.staffId);

      const data = {
        absent: !!status.absent,
        until: status.absentUntil,
        person: person,
        isChief: roleKey === "chief" && !!status.actingRoleKey
      };

      if (data.absent && data.isChief) {
        data.reserve = this.getStaffByRole(staff, roles, status.actingRoleKey);
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

        return `
          <div class="notify-wrapper">
            ${persons.map(p => {
          const fio = utils.fioToShort(p.person.fio);
          const phone = StaffService._getPhone(p.person);

          if (p.absent && p.absent.absent) {
            const until = p.absent.until
              ? `до ${new Date(p.absent.until).toLocaleDateString("ru-RU")}`
              : "";

            return `
                  <div class="notify-card absent">
                    <div class="notify-main">
                      <div class="notify-fio">${fio}</div>
                      <div class="notify-phone">${phone}</div>
                    </div>
                    <div class="notify-status">
                      отсутствует ${until}
                    </div>
                  </div>
                `;
          }

          return `
                <div class="notify-card">
                  <div class="notify-main">
                    <div class="notify-fio">${fio}</div>
                    <div class="notify-phone">${phone}</div>
                  </div>
                </div>
              `;
        }).join("")}
          </div>
        `;
      }
    }
  };

  window.StaffService = StaffService;
})();
