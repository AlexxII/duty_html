(function() {
  let _departments = [];
  const DepartmentsService = {
    setData(data) {
      _departments = data || [];
    },

    list() {
      return _departments.filter(d => d.active !== false);
    },

    get(id) {
      return _departments.find(d => d.id === id);
    },

    getPhones(dep) {
      if (!dep?.phones) return "—";

      const all = [
        ...(dep.phones.city || []),
        ...(dep.phones.mobile || [])
      ];

      return all.join(", ");
    }

  };

  window.DepartmentsService = DepartmentsService;

})();
