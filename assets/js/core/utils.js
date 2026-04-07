window.utils = {
  hotkeyLabel(code) {
    if (!code) return;
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    const map = {
      Escape: "Esc",
      Enter: "Enter",
      Space: "Space"
    };
    return map[code] || code;
  },

  reorderStaff(staff, positionsPool) {
    const ranks = [
      "полковник",
      "подполковник",
      "майор",
      "капитан",
      "ст.лейтенант",
      "лейтенант",
      "ст.прапорщик",
      "прапорщик",
    ];

    const positionOrder = Object.fromEntries(
      positionsPool.map((p, i) => [p, i])
    );
    const DEFAULT = 999;
    const rankOrder = Object.fromEntries(
      ranks.map((p, i) => [p, i])
    );

    const groups = {};
    staff.forEach(person => {
      if (!groups[person.unit]) groups[person.unit] = [];
      groups[person.unit].push(person);
    });

    // сортировка внутри каждого подразделения
    for (const unit in groups) {
      groups[unit].sort((a, b) => {
        const posA = positionOrder[a.position] ?? DEFAULT;
        const posB = positionOrder[b.position] ?? DEFAULT;
        if (posA !== posB) return posA - posB;
        // при равных должностях - по званию
        const rankA = rankOrder[a.rank] ?? DEFAULT;
        const rankB = rankOrder[b.rank] ?? DEFAULT;
        if (rankA !== rankB) return rankA - rankB;
        // в конечном счете по алфавиту
        return a.fio.localeCompare(b.fio);
      });
    }
    return groups;
  },

  fioToShort(fio) {
    const m = fio.match(/^(\S+)\s+(\S)\S*\s+(\S)\S*/);
    if (!m) return fio;
    return `${m[1]} ${m[2]}.${m[3]}.`;
  },

  showFatalError(text) {
    const app = document.getElementById("duty-app");
    app.innerHTML = `
      <div class="fatal-error">
        ${text}
      </div>
    `
  },

  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU');
  },

  getTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  },

  formatAts(phone, delimeter) {
    return phone?.ats_ogv?.length
      ? phone.ats_ogv.join(delimeter)
      : "—";
  },

  formatMobile(phone, delimeter) {
    return phone?.mobile?.length
      ? phone.mobile.join(delimeter)
      : "—";
  }
};
