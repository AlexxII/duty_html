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
