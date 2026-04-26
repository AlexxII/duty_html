// модуль проверяет ряд параметров системы. Назначен ли И.О., когда отсутствует руководитель, сроки отпусков и т.д.
(function() {
  const LAST_CHECK_KEY = "system.lastHealthCheck";
  const START_HOUR = 7;

  const Storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    getRaw(key) {
      return localStorage.getItem(key);
    }
  };

  function todayKey() {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  function isAfterStartHour() {
    const now = new Date();
    return now.getHours() >= START_HOUR;
  }

  function wasCheckedToday() {
    return Storage.getRaw(LAST_CHECK_KEY) === todayKey();
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
      const status = Storage.get("status." + roleKey);
      if (!status) continue;
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
      if (roleKey === "chief" && status.absent && !status.actingStaffId) {
        issues.push({
          level: "error",
          message: `Начальник отсутствует, но не назначен исполняющий обязанности.`
        });
      }
      // не назначен и.о. за отсутствующего
      if (status.absent && !status.actingStaffId && roleKey != "chief") {
        issues.push({
          level: "warning",
          message: `Для роли "${role.title}" не назначен исполняющий обязанности`
        })
      }
    }
    return issues;
  }

  async function checkAssistants(staff, roles) {
    const issues = [];
    const role = roles?.duty_assistant;
    if (!role || !Array.isArray(role.staffId) || !role.staffId.length) {
    console.log(role)
      return issues;
    }
    // порядок из localStorage или из roles
    let order;
    try {
      order = Storage.get("assistants.order");
    } catch {
      order = null;
    }
    if (!Array.isArray(order) || !order.length) {
      order = role.staffId;
    }
    let total = 0;
    let absentCount = 0;
    for (const id of order) {
      total++;
      let status;
      try {
        status = Storage.get("assistants.status." + id, { absent: false });
      } catch {
        status = { absent: false };
      }
      if (status.absent) {
        absentCount++;

        // нет срока
        if (!status.until) {
          const person = utils.fioToShort(StaffService.getStaffById(staff, id).fio);
          issues.push({
            level: "warning",
            message: `У помощника (${person}) отсутствует дата окончания отпуска.`
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

  const HealthCheck = {
    async run(force = false) {
      try {
        if (!force) {
          if (!isAfterStartHour()) return [];
          if (wasCheckedToday()) return [];
        }
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
