(function() {
  let _departments = [];
  const DepartmentsService = {
    async init() {
      _departments = await Data.getDepartments();
    },
    get(id) {
      return _departments.find(d => d.id === id);
    },
    list() {
      return _departments.filter(d => d.active !== false);
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
