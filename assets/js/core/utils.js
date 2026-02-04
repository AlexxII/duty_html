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
  }
};


