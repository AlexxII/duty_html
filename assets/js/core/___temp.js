const result = interpolateNotify(line);
const items = result.includes("|||SPLIT|||")
  ? result.split("|||SPLIT|||")
  : [result];

items.forEach((html, subIndex) => {
  const block = document.createElement("div");
  block.className = "step-line";
  if (requireConfirm) {
    const confirmIndex = `${index}_${subIndex}`;
    if (!confirmations[current]) confirmations[current] = {};
    const checked = confirmations[current][confirmIndex] || false;
    block.innerHTML = `
      <div class="confirm-line ${checked ? "confirmed" : ""}">
        <label>
          <input type="checkbox"
                 data-line="${confirmIndex}"
                 ${checked ? "checked" : ""}>
          <div class="confirm-content">
            ${html}
          </div>
        </label>
      </div>
    `;
  } else {
    block.innerHTML = `
      <div class="plain-line">
        ${html}
      </div>
    `;
  }
  if (requireConfirm) {
    const confirmKey = `${index}_${subIndex}`;
    if (!confirmations[current]) {
      confirmations[current] = {};
    }
    if (!(confirmKey in confirmations[current])) {
      confirmations[current][confirmKey] = false;
    }
  }
  container.appendChild(block);
});
