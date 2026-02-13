window.Clock = (function() {

  let interval = null;

  function update() {
    const clock = document.getElementById("clock");
    if (!clock) return;

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    clock.textContent = `${h}:${m}:${s}`;
  }

  function start() {
    stop();
    update();
    interval = setInterval(update, 1000);
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { start, stop };

})();
