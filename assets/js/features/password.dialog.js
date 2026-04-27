window.PasswordDialog = (function() {

  function open({
    error = false,
    title = "Доступ к данным",
    subtitle = "Введите пароль",
    confirmText = "Продолжить",
    confirm = false
  } = {}) {

    return new Promise(resolve => {

      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      overlay.innerHTML = `
        <div class="pwd-modal">
          <div class="pwd-header">
            <div class="pwd-title">${title}</div>
            <div class="pwd-subtitle">${subtitle}</div>
          </div>

          ${error ? `<div class="pwd-error">Пароли не совпадают</div>` : ""}

          <div class="pwd-field">
            <input type="password" class="input pwd-input" id="pwd-input" placeholder="Пароль" />
          </div>

          ${confirm ? `
            <div class="pwd-field">
              <input type="password" class="input pwd-input" id="pwd-confirm" placeholder="Повторите пароль" />
            </div>
          ` : ""}

          <div class="pwd-actions">
            <button class="button pwd-btn pwd-btn--ghost" id="pwd-cancel">Отмена</button>
            <button class="button button--primary pwd-btn" id="pwd-ok">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector("#pwd-input");
      const inputConfirm = overlay.querySelector("#pwd-confirm");
      const ok = overlay.querySelector("#pwd-ok");
      const cancel = overlay.querySelector("#pwd-cancel");

      input.focus();

      ok.onclick = () => {
        const val = input.value.trim();

        if (!val) return;

        if (confirm) {
          const val2 = inputConfirm.value.trim();

          if (val !== val2) {
            overlay.remove();
            // повторно открываем с ошибкой
            resolve({ ok: false, mismatch: true });
            return;
          }
        }

        overlay.remove();
        resolve({ ok: true, password: val });
      };

      cancel.onclick = () => {
        overlay.remove();
        resolve({ ok: false });
      };

      input.onkeydown = (e) => {
        if (e.key === "Enter") ok.click();
        if (e.key === "Escape") cancel.click();
      };
    });
  }

  return { open };
})();
