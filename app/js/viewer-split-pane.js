const MIN_PANE_PX = 80;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const LS_SPLITTER_IS_VERTICAL = "splliter_is_vertical::";

function saveSplitterSettings(splitterEl, isVertical) {
    localStorage.setItem(LS_SPLITTER_IS_VERTICAL + splitterEl.id, isVertical);
}

function loadSplitterSettings(splitterEl) {
    const isVertical = localStorage.getItem(LS_SPLITTER_IS_VERTICAL + splitterEl.id);
    if (isVertical === "true") {
      splitterEl.classList.add("is-vertical");
      splitterEl.classList.remove("is-horizontal");
    } else {
      splitterEl.classList.remove("is-vertical");
      splitterEl.classList.add("is-horizontal");
    }
}

function initSplitter(splitterEl) {
  const first = splitterEl.querySelector(".pane.first");
  const second = splitterEl.querySelector(".pane.second");
  const divider = splitterEl.querySelector(".splitDivider");
  const closeFirstBtn = first.querySelector(".pane-close-btn");
  const closeSecondBtn = second.querySelector(".pane-close-btn");

  // guarda estado do dragging (agarrando ou nao)
  let dragging = false;
  
  // guarda ratios separados por orientação
  let ratioV = 0.5;
  let ratioH = 0.5;

  if (!first || !second || !divider) return;

  const isVertical = () => splitterEl.classList.contains("is-vertical");


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
  }

  function setPaneVisible(pane, visible) {
    if (pane === 1) util.setVisible(first, visible);
    else if(pane === 2) util.setVisible(second, visible);

    syncVisibility();
  }

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

    saveSplitterSettings(splitterEl, isVertical());
  }

  /* Eventos do Controle Divisor dos Panes */
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

  divider.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleOrientation();
  });

  divider.addEventListener("pointerup", stopDrag);
  divider.addEventListener("pointercancel", stopDrag);

  // Eventos do botao de fechar o pane
  if(closeFirstBtn) {
    closeFirstBtn.addEventListener("click", (e) => {
      setPaneVisible(1, false);
    });
  }
  if(closeSecondBtn) {
    closeSecondBtn.addEventListener("click", (e) => {
      setPaneVisible(2, false);
    });
  }

  // Eventos ao Carregar / Resize da Janela
  window.addEventListener("load", () => {
    // define orientação inicial se você quiser garantir que sempre tenha uma
    loadSplitterSettings(splitterEl);
    // layout coerente
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
