const DepartmentsService = {
  list() {
    return departments.filter(d => d.active !== false);
  },

  get(id) {
    return departments.find(d => d.id === id);
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
