const MIN_PANE_PX = 80;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function initSplitter(splitterEl) {
  const first = splitterEl.querySelector(".pane.first");
  const second = splitterEl.querySelector(".pane.second");
  const divider = splitterEl.querySelector(".splitDivider");
  const toggleBtn = divider?.querySelector(".splitToggle"); 

  if (!first || !second || !divider) return;

  const isVertical = () => splitterEl.classList.contains("is-vertical");

  // guarda ratios separados por orientação
  let ratioV = 0.5;
  let ratioH = 0.5;

  function getTotalSize() {
    const rect = splitterEl.getBoundingClientRect();
    return isVertical() ? rect.height : rect.width;
  }

  function getDividerSize() {
    return isVertical() ? divider.offsetHeight : divider.offsetWidth;
  }

  function pointerToFirstPx(clientX, clientY) {
    const rect = splitterEl.getBoundingClientRect();
    return isVertical() ? (clientY - rect.top) : (clientX - rect.left);
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

  
  function getCurrentRatio() {
    const total = getTotalSize();
    if (!total) return 0.5;

    const firstNow = isVertical()
      ? first.getBoundingClientRect().height
      : first.getBoundingClientRect().width;

    return clamp(firstNow / total, 0, 1);
  }

  function applyStoredRatio() {
    const total = getTotalSize();
    const r = isVertical() ? ratioV : ratioH;
    setSplitByFirstPx(total * r);
  }

  function updateToggleIcon() {
    if (!toggleBtn) return;
    // se está vertical, ícone sugere horizontal
    toggleBtn.textContent = isVertical() ? "↔" : "↕";
    toggleBtn.title = isVertical()
      ? "Mudar para horizontal"
      : "Mudar para vertical";
  }

  function syncVisibility() {
    const secondHidden = !util.isVisible(second);

    if (secondHidden) {
      splitterEl.classList.add("single-pane");
      first.style.flex = "1 1 auto";
      second.style.flex = "";
    } else {
      splitterEl.classList.remove("single-pane");
      // deixou de mostra só primeiro pane, ao mostrar os dois, aplica ratio salvo da orientação atual
      applyStoredRatio();
      // setSplitByFirstPx(getTotalSize() * 0.5);
    }

    updateToggleIcon();
  }

  function setPaneVisible(pane, visible) {
    if (pane === 1) util.setVisible(first, visible);
    else if(pane === 2) util.setVisible(second, visible);

    syncVisibility();
  }

  // Toggle orientação via botão
  function toggleOrientation() {
    // se estiver em single-pane, só alterna a classe e mantém single-pane
    // (não tem resize ativo)
    // salva ratio do modo atual (se second estiver visível)
    if (!splitterEl.classList.contains("single-pane")) {
      const r = getCurrentRatio();
      if (isVertical()) ratioV = r;
      else ratioH = r;
    }

    // alterna a classe
    splitterEl.classList.toggle("is-vertical");
    splitterEl.classList.toggle("is-horizontal");

    // limpa qualquer flex-basis "antigo" e reaplica ratio do novo modo
    first.style.flex = "";
    second.style.flex = "";

    // se estiver single-pane, first ocupa tudo; senão aplica ratio salvo
    if (splitterEl.classList.contains("single-pane")) {
      first.style.flex = "1 1 auto";
    } else {
      applyStoredRatio();
    }

    updateToggleIcon();
  }

  if (toggleBtn) {
    // evita o click/drag no botão disparar resize
    toggleBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleOrientation();
    });
  }

  let dragging = false;

  divider.addEventListener("pointerdown", (e) => {
    if (splitterEl.classList.contains("single-pane")) return;

    // se o pointerdown foi no botão, não inicia drag
    if (e.target && e.target.closest && e.target.closest(".splitToggle")) return;

    dragging = true;
    divider.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor = isVertical() ? "row-resize" : "col-resize";
  });

  divider.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const p = pointerToFirstPx(e.clientX, e.clientY);
    setSplitByFirstPx(p - getDividerSize() / 2);
  });

  function stopDrag() {
    if (!dragging) return;

    dragging = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // salva ratio ao terminar drag (modo atual)
    const r = getCurrentRatio();
    if (isVertical()) ratioV = r;
    else ratioH = r;
  }

  divider.addEventListener("pointerup", stopDrag);
  divider.addEventListener("pointercancel", stopDrag);

  window.addEventListener("load", () => {
    // define orientação inicial se você quiser garantir que sempre tenha uma
    if (!splitterEl.classList.contains("is-vertical") && !splitterEl.classList.contains("is-horizontal")) {
      splitterEl.classList.add("is-vertical");
    }
    // ícone coerente + layout coerente
    updateToggleIcon();
    syncVisibility();
  });

  window.addEventListener("resize", () => {
    if (splitterEl.classList.contains("single-pane")) return;

    // reaplica o ratio salvo do modo atual
    applyStoredRatio();
  });

  // funcoes de acesso externo vinculados ao elemento
  splitterEl._syncVisibility = syncVisibility;
  splitterEl._setPaneVisible = setPaneVisible;
  splitterEl._toggleOrientation = toggleOrientation;
}

// Inicializa todos
document.querySelectorAll(".splitter").forEach(initSplitter);
