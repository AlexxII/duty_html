(function() {
  const HOTKEY_RE = /^(Key[A-Z]|Digit[0-9])$/;

  const FORBIDDEN_KEYS = new Set([
    "Escape",
    "Enter",
    "Backspace"
  ]);

  window.validateIndex = function validateIndex(index) {
    if (!Array.isArray(index)) {
      throw new Error("index.json должен содержать массив");
    }

    if (!index.length) {
      throw new Error("index.json не должен быть пустым");
    }

    const ids = new Set();
    const hotkeys = new Set();
    const orders = new Set();

    index.forEach((item, i) => {
      const prefix = `index.json: элемент #${i}`;

      if (typeof item !== "object" || item === null) {
        throw new Error(`${prefix} не является объектом`);
      }

      // id
      if (typeof item.id !== "string" || !item.id.trim()) {
        throw new Error(`${prefix} — поле "id" должно быть непустой строкой`);
      }

      if (ids.has(item.id)) {
        throw new Error(`${prefix} — дублируется id "${item.id}"`);
      }
      ids.add(item.id);

      // title
      if (typeof item.title !== "string" || !item.title.trim()) {
        throw new Error(`${prefix} — поле "title" должно быть непустой строкой`);
      }

      // order
      if (typeof item.order !== "number" || !Number.isInteger(item.order)) {
        throw new Error(`${prefix} — поле "order" должно быть целым числом`);
      }
      if (item.order < 0) {
        throw new Error(`${prefix} — поле "order" не может быть отрицательным`);
      }

      if (orders.has(item.order)) {
        throw new Error(`${prefix} — значение order ${item.order} уже используется`);
      }
      orders.add(item.order);

      // color
      if (typeof item.color !== "string" || !item.color.trim()) {
        throw new Error(`${prefix} — поле "color" должно быть непустой строкой`);
      }

      // hotkey
      if (typeof item.hotkey !== "string") {
        throw new Error(`${prefix} — поле "hotkey" должно быть строкой`);
      }

      if (FORBIDDEN_KEYS.has(item.hotkey)) {
        throw new Error(`${prefix} — горячая клавиша "${item.hotkey}" запрещена`);
      }

      if (!HOTKEY_RE.test(item.hotkey)) {
        throw new Error(
          `${prefix} — недопустимый hotkey "${item.hotkey}". ` +
          `Разрешены только Key[A–Z] и Digit[0–9]`
        );
      }

      if (hotkeys.has(item.hotkey)) {
        throw new Error(`${prefix} — горячая клавиша "${item.hotkey}" уже используется`);
      }
      hotkeys.add(item.hotkey);
    });

    // проверка последовательности order (0..N-1)
    const sorted = [...orders].sort((a, b) => a - b);
    for (let i = 1; i <= sorted.length; i++) {
      if (sorted[i - 1] !== i) {
        throw new Error(`index.json: значения order должны быть последовательными (0..${sorted.length - 1})`);
      }
    }
  };
})();
