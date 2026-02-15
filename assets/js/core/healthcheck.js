// модуль проверяет ряд параметров системы. Есть ли И.О., когда отсутствует руководитель и т.д.
(function() {
  const LAST_CHECK_KEY = "system.lastHealthCheck";
  const START_HOUR = 7;

  function todayKey() {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  function isAfterStartHour() {
    const now = new Date();
    return now.getHours() >= START_HOUR;
  }

  function wasCheckedToday() {
    return localStorage.getItem(LAST_CHECK_KEY) === todayKey();
  }

  function markChecked() {
    localStorage.setItem(LAST_CHECK_KEY, todayKey());
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + "T00:00:00");
  }

  function isExpired(dateStr) {
    const until = parseDate(dateStr);
    if (!until) return false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return now > until;
  }

  function getTodayDutyKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async function checkManagement(staff, roles) {
    const issues = [];

    for (const [roleKey, role] of Object.entries(roles)) {
      const raw = localStorage.getItem("status." + roleKey);
      if (!raw) continue;

      let status;
      try {
        status = JSON.parse(raw);
      } catch {
        continue;
      }

      if (!status.absent) continue;

      // нет даты окончания
      if (!status.absentUntil) {
        issues.push({
          level: "warning",
          message: `Для роли "${role.title}" не указан срок окончания отсутствия.`
        });
      }

      // истёк отпуск
      if (status.absentUntil && isExpired(status.absentUntil)) {
        issues.push({
          level: "warning",
          message: `Истёк срок отсутствия для роли "${role.title}".`
        });
      }

      // начальник без И.О.
      if (roleKey === "chief" && status.absent && !status.actingRoleKey) {
        issues.push({
          level: "error",
          message: `Начальник отсутствует, но не назначен исполняющий обязанности.`
        });
      }
    }

    return issues;
  }

  async function checkAssistants(staff, roles) {
    const issues = [];
    const role = roles?.duty_assistant;
    if (!role || !Array.isArray(role.staffIds) || !role.staffIds.length) {
      return issues;
    }
    // порядок из localStorage или из roles
    let order;
    try {
      order = JSON.parse(localStorage.getItem("assistants.order"));
    } catch {
      order = null;
    }
    if (!Array.isArray(order) || !order.length) {
      order = role.staffIds;
    }
    let total = 0;
    let absentCount = 0;
    for (const id of order) {
      total++;
      let status;
      try {
        status = JSON.parse(
          localStorage.getItem("assistants.status." + id)
        ) || { absent: false };
      } catch {
        status = { absent: false };
      }
      if (status.absent) {
        absentCount++;

        // нет срока
        if (!status.until) {
          issues.push({
            level: "warning",
            message: `У помощника (id ${id}) отсутствует дата окончания отпуска.`
          });
        }

        // истёк срок
        if (status.until && isExpired(status.until)) {
          issues.push({
            level: "warning",
            message: `Истёк срок отсутствия помощника (id ${id}).`
          });
        }
      }
    }
    if (total > 0 && absentCount === total) {
      issues.push({
        level: "error",
        message: "Отсутствуют все помощники дежурного."
      });
    }
    return issues;
  }

  async function checkDutyAssignments() {
    const issues = [];

    const raw = localStorage.getItem("duty.assignments");
    if (!raw) {
      issues.push({
        level: "error",
        message: "Не назначен дежурный на текущую дату."
      });
      return issues;
    }

    let assignments;
    try {
      assignments = JSON.parse(raw);
    } catch {
      return issues;
    }

    const today = getTodayDutyKey();

    if (!assignments[today]) {
      issues.push({
        level: "error",
        message: "На сегодня не назначен дежурный."
      });
    }

    return issues;
  }

  const HealthCheck = {
    async run(force = false) {
      try {
        if (!force) {
          if (!isAfterStartHour()) return [];
          if (wasCheckedToday()) return [];
        }
        await Data.init();
        const staff = await Data.getStaff();
        const roles = await Data.getRoles();
        if (!Array.isArray(staff) || !roles || typeof roles !== "object") {
          return [{
            level: "error",
            message: "Некорректные данные системы. Проверьте импорт конфигурации."
          }];
        }
        let issues = [];
        try {
          issues = issues.concat(await checkManagement(staff, roles));
        } catch (e) {
          issues.push({
            level: "error",
            message: "Ошибка проверки руководства."
          });
          console.error("HealthCheck.checkManagement:", e);
        }

        try {
          issues = issues.concat(await checkAssistants(staff, roles));
        } catch (e) {
          issues.push({
            level: "error",
            message: "Ошибка проверки помощников."
          });
          console.error("HealthCheck.checkAssistants:", e);
        }

        try {
          issues = issues.concat(await checkDutyAssignments());
        } catch (e) {
          issues.push({
            level: "error",
            message: "Ошибка проверки назначений дежурных."
          });
          console.error("HealthCheck.checkDutyAssignments:", e);
        }

        if (!force) {
          try {
            markChecked();
          } catch (e) {
            console.error("HealthCheck.markChecked:", e);
          }
        }
        return issues;

      } catch (e) {
        console.error("HealthCheck.run fatal:", e);
        return [{
          level: "error",
          message: "Критическая ошибка проверки состояния системы."
        }];
      }
    }

  };

  window.HealthCheck = HealthCheck;

})();

