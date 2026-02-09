(function() {
  function extractNotifyKeysFromText(text) {
    const keys = new Set();
    const re = /\{\{notify\.([a-z0-9_]+)\}\}/g;
    let m;
    while ((m = re.exec(text))) {
      keys.add(m[1]);
    }
    return keys;
  }

  window.validateCross = function validateCross(ctx) {
    const {
      staff,
      scenarios,
      roles,
      dutyPool
    } = ctx;

    // ---------- STAFF INDEX ----------
    const staffIds = new Set(staff.map(p => p.id));

    // ---------- ROLES -> STAFF ----------
    if (roles && typeof roles === "object") {
      Object.entries(roles).forEach(([roleKey, role]) => {
        const prefix = `roles.${roleKey}`;

        if (role.staffId !== undefined) {
          if (!staffIds.has(role.staffId)) {
            throw new Error(
              `${prefix}: staffId ${role.staffId} не найден в staff`
            );
          }
        }

        if (Array.isArray(role.staffIds)) {
          role.staffIds.forEach(id => {
            if (!staffIds.has(id)) {
              throw new Error(
                `${prefix}: staffIds содержит несуществующий id ${id}`
              );
            }
          });
        }
      });
    }

    // ---------- DUTY POOL ----------
    if (Array.isArray(dutyPool)) {
      dutyPool.forEach(id => {
        if (!staffIds.has(id)) {
          throw new Error(
            `duty_pool: содержит несуществующий staff id ${id}`
          );
        }
      });
    }

    // ---------- SCENARIOS -> NOTIFY -> ROLES ----------
    const roleKeys = roles ? new Set(Object.keys(roles)) : new Set();

    scenarios.forEach((s, si) => {
      s.steps.forEach((step, sti) => {
        step.text.forEach((line, li) => {
          const notifyKeys = extractNotifyKeysFromText(line);

          notifyKeys.forEach(key => {
            if (!roleKeys.has(key)) {
              throw new Error(
                `scenarios: "${s.id}", шаг #${sti}, строка #${li} — notify.${key} не определён в roles`
              );
            }
          });
        });
      });
    });

    // ---------- ROTATING ROLES ----------
    if (roles) {
      Object.entries(roles).forEach(([roleKey, role]) => {
        if (role.type === "rotating") {
          if (!Array.isArray(role.staffIds) || !role.staffIds.length) {
            throw new Error(
              `roles.${roleKey}: rotating-роль должна иметь непустой staffIds`
            );
          }
        }
      });
    }
  };
})();
