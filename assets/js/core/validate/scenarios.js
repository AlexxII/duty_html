(function() {
  const ALLOWED_WHEN = ["day", "night"];

  function isStringArray(v) {
    return Array.isArray(v) && v.every(s => typeof s === "string");
  }

  window.validateScenarios = function validateScenarios(scenarios) {
    console.log(scenarios);
    if (!Array.isArray(scenarios)) {
      throw new Error("scenarios: ожидается массив сценариев");
    }

    if (!scenarios.length) {
      throw new Error("scenarios: список сценариев пуст");
    }

    const ids = new Set();

    scenarios.forEach((s, _) => {
      const prefix = `scenarios: элемент #${s.id}`;

      if (typeof s !== "object" || s === null) {
        throw new Error(`${prefix} не является объектом`);
      }

      // id
      if (typeof s.id !== "string" || !s.id.trim()) {
        throw new Error(`${prefix} — поле "id" должно быть непустой строкой`);
      }

      if (ids.has(s.id)) {
        throw new Error(`${prefix} — дублируется id "${s.id}"`);
      }
      ids.add(s.id);

      if (s.mode == undefined) {
        throw new Error(`${prefix} — поле "mode" должно быть определено и иметь значение true или false`);
      }
      if (typeof s.mode !== "boolean") {
        throw new Error(`${prefix} — поле "mode" должно быть true или false`);
      }

      // title
      if (typeof s.title !== "string" || !s.title.trim()) {
        throw new Error(`${prefix} — поле "title" должно быть непустой строкой`);
      }

      // steps
      if (!Array.isArray(s.steps) || !s.steps.length) {
        throw new Error(`${prefix} — поле "steps" должно быть непустым массивом`);
      }

      s.steps.forEach((step, si) => {
        const sp = `${prefix}, шаг #${si}`;

        if (typeof step !== "object" || step === null) {
          throw new Error(`${sp} не является объектом`);
        }

        // step.title
        if (typeof step.title !== "string" || !step.title.trim()) {
          throw new Error(`${sp} — поле "title" должно быть непустой строкой`);
        }

        // step.text
        if (!step.text.length) {
          throw new Error(
            `${sp} — поле "text" должно быть непустым массивом строк`
          );
        }

        // step.when (optional)
        if (step.when !== undefined) {
          if (!Array.isArray(step.when) || !step.when.length) {
            throw new Error(
              `${sp} — поле "when" должно быть массивом значений`
            );
          }

          step.when.forEach(w => {
            if (!ALLOWED_WHEN.includes(w)) {
              throw new Error(
                `${sp} — недопустимое значение "when": "${w}" (разрешены day, night)`
              );
            }
          });
        }
      });

      // mode (optional)
      if (s.mode !== undefined && typeof s.mode !== "boolean") {
        throw new Error(
          `${prefix} — поле "mode" должно быть boolean`
        );
      }
    });
  };
})();
