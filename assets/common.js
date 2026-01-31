window.utils = {

  hotkeyLabel(code) {
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);

    const map = {
      Escape: "Esc",
      Enter: "Enter",
      Space: "Space"
    };

    return map[code] || code;
  },
};

// время отображается в нескольких локациях
function get_time() {
  let time = new Date();
  let hour = time.getHours().toString().padStart(2, "0");
  let minute = time.getMinutes().toString().padStart(2, "0");
  let seconds = time.getSeconds().toString().padStart(2, "0");
  let timeString = hour + ":" + minute + ":" + seconds;

  const clock = document.getElementById("clock");
  clock.innerHTML = `${timeString}`;
  clock.className = "";
}

get_time()
setInterval(get_time, 1000);

document.addEventListener("keydown", e => {
  const tag = document.activeElement?.tagName;

  // если пользователь что-то вводит — не трогаем
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return;
  }

  // Escape — всегда безопасен
  if (e.code === "Escape") {
    window.location.href = "index.html";
  }

  // Backspace — только вне ввода
  if (e.code === "Backspace") {
    e.preventDefault(); // иначе браузер может сделать "назад"
    window.location.href = "index.html";
  }
});

