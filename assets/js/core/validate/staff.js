(function() {
  function isStringArray(v) {
    return Array.isArray(v) && v.every(s => typeof s === "string");
  }

  window.validateStaff = function validateStaff(staff) {
    if (!Array.isArray(staff)) {
      throw new Error("staff.json должен содержать массив");
    }

    const ids = new Set();

    staff.forEach((p, i) => {
      const prefix = `staff.json: элемент #${i}`;

      if (typeof p !== "object" || p === null) {
        throw new Error(`${prefix} не является объектом`);
      }

      // id
      if (typeof p.id !== "number" || !Number.isInteger(p.id)) {
        throw new Error(`${prefix} — поле "id" должно быть целым числом`);
      }

      if (ids.has(p.id)) {
        throw new Error(`${prefix} — дублируется id ${p.id}`);
      }
      ids.add(p.id);

      // fio
      if (typeof p.fio !== "string" || !p.fio.trim()) {
        throw new Error(`${prefix} — поле "fio" должно быть непустой строкой`);
      }

      // unit
      if (typeof p.unit !== "string" || !p.unit.trim()) {
        throw new Error(`${prefix} — поле "unit" должно быть непустой строкой`);
      }

      // rank
      if (typeof p.rank !== "string" || !p.rank.trim()) {
        throw new Error(`${prefix} — поле "rank" должно быть непустой строкой`);
      }

      // position
      if (typeof p.position !== "string" || !p.position.trim()) {
        throw new Error(`${prefix} — поле "position" должно быть непустой строкой`);
      }

      // phone (optional)
      if (p.phone !== undefined) {
        if (typeof p.phone !== "object" || p.phone === null) {
          throw new Error(`${prefix} — поле "phone" должно быть объектом`);
        }

        if (
          p.phone.mobile !== undefined &&
          !isStringArray(p.phone.mobile)
        ) {
          throw new Error(
            `${prefix} — поле "phone.mobile" должно быть массивом строк`
          );
        }

        if (
          p.phone.ats_ogv !== undefined &&
          !isStringArray(p.phone.ats_ogv)
        ) {
          throw new Error(
            `${prefix} — поле "phone.ats_ogv" должно быть массивом строк`
          );
        }
      }

      if (p.weapons !== undefined) {
        if (typeof p.weapons !== "object" || p.weapons === null) {
          throw new Error(`${prefix} — поле "weapons" должно быть объектом`);
        }

        if (
          p.weapons.personal_number !== undefined &&
          typeof p.weapons.personal_number !== "string"
        ) {
          throw new Error(
            `${prefix} — поле "weapons.personal_number" должно быть строкой`
          );
        }

        if (
          p.weapons.individual_number !== undefined &&
          typeof p.weapons.individual_number !== "string"
        ) {
          throw new Error(
            `${prefix} — поле "weapons.individual_number" должно быть строкой`
          );
        }
      }
    });
  };
})();
