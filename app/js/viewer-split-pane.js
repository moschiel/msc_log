const MIN_PANE_PX = 80;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function initSplitter(splitterEl) {
  const first = splitterEl.querySelector(".pane.first");
  const second = splitterEl.querySelector(".pane.second");
  const divider = splitterEl.querySelector(".splitDivider");

  if (!first || !second || !divider) return;

  const isVertical = splitterEl.classList.contains("is-vertical");

  function getTotalSize() {
    const rect = splitterEl.getBoundingClientRect();
    return isVertical ? rect.height : rect.width;
  }

  function getDividerSize() {
    return isVertical ? divider.offsetHeight : divider.offsetWidth;
  }

  function pointerToFirstPx(clientX, clientY) {
    const rect = splitterEl.getBoundingClientRect();
    return isVertical ? (clientY - rect.top) : (clientX - rect.left);
  }

  function setSplitByFirstPx(firstPx) {
    const total = getTotalSize();
    const divSize = getDividerSize();

    const minFirst = MIN_PANE_PX;
    const maxFirst = total - divSize - MIN_PANE_PX;

    const newFirst = clamp(firstPx, minFirst, maxFirst);

    first.style.flex = `0 0 ${newFirst}px`;
    second.style.flex = `1 1 auto`;
  }

  function syncVisibility() {
    const secondHidden = !util.isVisible(second);

    if (secondHidden) {
      splitterEl.classList.add("single-pane");
      first.style.flex = "1 1 auto";
      second.style.flex = "";
    } else {
      splitterEl.classList.remove("single-pane");
      setSplitByFirstPx(getTotalSize() * 0.5);
    }
  }

  function setPaneVisible(pane, visible) {
    if (pane === 1)  //first pane
      util.setVisible(first, visible);
    else if(pane === 2) //second pane
      util.setVisible(second, visible);

    syncVisibility();
  }

  let dragging = false;

  divider.addEventListener("pointerdown", (e) => {
    if (splitterEl.classList.contains("single-pane")) return;

    dragging = true;
    divider.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
  });

  divider.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const p = pointerToFirstPx(e.clientX, e.clientY);
    setSplitByFirstPx(p - getDividerSize() / 2);
  });

  function stopDrag() {
    dragging = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }

  divider.addEventListener("pointerup", stopDrag);
  divider.addEventListener("pointercancel", stopDrag);

  window.addEventListener("load", () => {
    syncVisibility();
  });

  window.addEventListener("resize", () => {
    if (splitterEl.classList.contains("single-pane")) return;

    const total = getTotalSize();
    const firstNow = (isVertical ? first.getBoundingClientRect().height
                                : first.getBoundingClientRect().width);
    const ratio = firstNow / total;
    setSplitByFirstPx(total * ratio);
  });

  // expõe um jeito simples de re-sincronizar quando você der toggle no second
  splitterEl._syncVisibility = syncVisibility;
  splitterEl._setPaneVisible = setPaneVisible;
}

// Inicializa todos
document.querySelectorAll(".splitter").forEach(initSplitter);
