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
    const DEFAULT = 999;

    // ===== НОРМАЛИЗАЦИЯ =====
    function normalize(str) {
      return str
        ?.toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/ё/g, "е");
    }

    function safe(str) {
      return normalize(str) || "";
    }
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
      positionsPool.map((p, i) => [normalize(p), i])
    );
    const rankOrder = Object.fromEntries(
      ranks.map((r, i) => [normalize(r), i])
    );

    const prepared = staff.map((p, idx) => ({
      ...p,
      _pos: safe(p.position),
      _rank: safe(p.rank),
      _fio: safe(p.fio),
      _index: idx // для стабильной сортировки
    }));

    const groups = {};
    prepared.forEach(person => {
      const unitKey = safe(person.unit) || "__unknown__";
      if (!groups[unitKey]) groups[unitKey] = [];
      groups[unitKey].push(person);
    });

    for (const unit in groups) {
      groups[unit].sort((a, b) => {
        // должность
        const posA = positionOrder[a._pos] ?? DEFAULT;
        const posB = positionOrder[b._pos] ?? DEFAULT;
        if (posA !== posB) return posA - posB;

        // звание
        const rankA = rankOrder[a._rank] ?? DEFAULT;
        const rankB = rankOrder[b._rank] ?? DEFAULT;
        if (rankA !== rankB) return rankA - rankB;

        // ФИО 
        const fioCompare = a._fio.localeCompare(
          b._fio,
          "ru",
          { sensitivity: "base" }
        );
        if (fioCompare !== 0) return fioCompare;

        // (если всё одинаково)
        return a._index - b._index;
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
