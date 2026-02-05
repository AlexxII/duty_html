window.utils = {
  hotkeyLabel(code) {
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    const map = {
      Escape: "Esc",
      Enter: "Enter",
      Space: "Space"
    };
    return map[code] || code;
  },

  resolveNotify(roleKey) {
    const role = ROLE_MAP[roleKey];
    if (!role) return null;

    const status = loadStatus(roleKey);

    // ОСОБЫЙ СЛУЧАЙ — начальник Центра
    if (
      roleKey === "chief" &&
      status.vacation === true &&
      status.actingRoleKey
    ) {
      return getStaffByRole(status.actingRoleKey);
    }

    // ОБЩИЙ СЛУЧАЙ
    if (status.vacation === true) {
      return null; // не оповещаем
    }

    return getStaffById(role.staffId);
  },

  fioToShort(fio) {
    const m = fio.match(/^(\S+)\s+(\S)\S*\s+(\S)\S*/);
    if (!m) return fio;
    return `${m[1]} ${m[2]}.${m[3]}.`;
  },

  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU');
  }
};


