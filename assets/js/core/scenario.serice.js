(function() {
  const ScenarioService = {

    getState: function(scenarios) {
      return scenarios.map(s => {
        const prefix = s.id + ".";
        const current = localStorage.getItem(prefix + "current");
        const completed = JSON.parse(
          localStorage.getItem(prefix + "completed") || "[]"
        );
        const total = s.steps?.length || 0;
        const hasProgress = current !== null || completed.length > 0;
        const isFinished = completed.length === total && total > 0;
        return {
          ...s,
          hasProgress,
          isFinished,
          completed: completed.length,
          current: Number(current) || 0
        };
      });
    },

    getActiveCount(scenarios) {
      return scenarios.filter(s => s.hasProgress && !s.isFinished).length;
    },

    resetProgress(scenarios) {
      scenarios.forEach(s => {
        const prefix = s.id + ".";
        localStorage.removeItem(prefix + "current");
        localStorage.removeItem(prefix + "completed");
        localStorage.removeItem(prefix + "viewed");
        localStorage.removeItem(prefix + "confirmations");
      });
    }

  };

  window.ScenarioService = ScenarioService;
})();
