window.ReminderService = (function() {

  const STORAGE_KEY = "reminders.list";
  let interval = null;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function start() {
    if (interval) return;
    check();
    interval = setInterval(check, 30000);
  }

  function stop() {
    if (!interval) return;
    clearInterval(interval);
    interval = null;
  }

  function check() {
    const list = load();
    const now = Date.now();
    let changed = false;

    list.forEach(r => {
      if (!r.active) return;

      if (r.type === "once") {
        if (now >= r.datetime && !r.lastTriggered) {
          trigger(r);
          changed = true;
        }
      }

      if (r.type === "daily") {
        if (matchTime(r) && notTriggeredToday(r)) {
          trigger(r);
          changed = true;
        }
      }

      if (r.type === "weekly") {
        if (matchWeekday(r) && matchTime(r) && notTriggeredToday(r)) {
          trigger(r);
          changed = true;
        }
      }
    });

    if (changed) save(list);
  }

  function trigger(reminder) {
    reminder.lastTriggered = Date.now();

    if (reminder.type === "once") {
      reminder.active = false;
    }

    if (window.ReminderUI?.showNotification) {
      ReminderUI.showNotification(reminder);
    }
  }

  function matchTime(r) {
    if (!r.time) return false;

    const now = new Date();
    const [h, m] = r.time.split(":").map(Number);

    return now.getHours() === h && now.getMinutes() === m;
  }

  function matchWeekday(r) {
    if (r.weekday == null) return false;
    const now = new Date();
    return now.getDay() === r.weekday;
  }

  function notTriggeredToday(r) {
    if (!r.lastTriggered) return true;

    const last = new Date(r.lastTriggered);
    const now = new Date();

    return last.toDateString() !== now.toDateString();
  }

  function add(reminder) {
    const list = load();
    list.push(reminder);
    save(list);
  }

  function remove(id) {
    const list = load().filter(r => r.id !== id);
    save(list);
  }

  function getAll() {
    return load();
  }

  return {
    start,
    stop,
    add,
    remove,
    getAll
  };

})();
