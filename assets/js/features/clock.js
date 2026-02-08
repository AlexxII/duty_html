function get_time() {
  let time = new Date();
  let hour = time.getHours().toString().padStart(2, "0");
  let minute = time.getMinutes().toString().padStart(2, "0");
  let seconds = time.getSeconds().toString().padStart(2, "0");
  let timeString = hour + ":" + minute + ":" + seconds;

  const clock = document.getElementById("clock");
  if (!clock) return;
  clock.innerHTML = `${timeString}`;
  clock.className = "";
}

get_time()
setInterval(get_time, 1000);
