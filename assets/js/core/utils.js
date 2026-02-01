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
