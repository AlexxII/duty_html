(function() {

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  function isValidDate(value) {
    if (!isNonEmptyString(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  function isStringArray(arr) {
    return Array.isArray(arr) && arr.every(isNonEmptyString);
  }

  function validateLocation(location, prefix) {
    if (typeof location !== "object" || location === null) {
      throw new Error(`${prefix} — поле "location" должно быть объектом`);
    }

    const { cabinet, folder, section } = location;

    if (!isNonEmptyString(cabinet)) {
      throw new Error(`${prefix} — location.cabinet обязателен`);
    }

    if (!isNonEmptyString(folder)) {
      throw new Error(`${prefix} — location.folder обязателен`);
    }

    if (!isNonEmptyString(section)) {
      throw new Error(`${prefix} — location.section обязателен`);
    }
  }

  window.validateDocs = function validateDocs(docs) {

    if (!Array.isArray(docs)) {
      throw new Error("docs: ожидается массив документов");
    }

    if (!docs.length) {
      throw new Error("docs: список документов пуст");
    }

    const ids = new Set();

    docs.forEach((doc, index) => {

      const prefix = `docs: элемент #${index}`;

      if (typeof doc !== "object" || doc === null) {
        throw new Error(`${prefix} не является объектом`);
      }

      // id
      if (!isNonEmptyString(doc.id)) {
        throw new Error(`${prefix} — поле "id" должно быть непустой строкой`);
      }

      if (ids.has(doc.id)) {
        throw new Error(`${prefix} — дублируется id "${doc.id}"`);
      }
      ids.add(doc.id);

      // title
      if (!isNonEmptyString(doc.title)) {
        throw new Error(`${prefix} — поле "title" обязательно`);
      }

      // number
      if (!isNonEmptyString(doc.number)) {
        throw new Error(`${prefix} — поле "number" обязательно`);
      }

      // date
      if (!isValidDate(doc.date)) {
        throw new Error(`${prefix} — поле "date" должно быть корректной датой`);
      }

      // category
      if (!isNonEmptyString(doc.category)) {
        throw new Error(`${prefix} — поле "category" обязательно`);
      }

      // keywords
      if (!isStringArray(doc.keywords)) {
        throw new Error(`${prefix} — поле "keywords" должно быть массивом строк`);
      }

      // short
      if (!isNonEmptyString(doc.short)) {
        throw new Error(`${prefix} — поле "short" обязательно`);
      }

      if (doc.short.length > 300) {
        throw new Error(`${prefix} — поле "short" не должно превышать 300 символов`);
      }

      // location
      validateLocation(doc.location, prefix);

      // active
      if (typeof doc.active !== "boolean") {
        throw new Error(`${prefix} — поле "active" должно быть boolean`);
      }

    });
  };

})();
