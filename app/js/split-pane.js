const MIN_PANE_PX = 80;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const LS_SPLITTER_IS_VERTICAL = "splitter_is_vertical::";

function _lsKeyFor(splitterEl) {
  // usa id pra chave; se não tiver, não salva (evita key lixo)
  if (!splitterEl || !splitterEl.id) return null;
  return LS_SPLITTER_IS_VERTICAL + splitterEl.id;
}

function saveSplitterSettings(splitterEl, isVertical) {
  const keyNew = _lsKeyFor(splitterEl);
  if (!keyNew) return;

  localStorage.setItem(keyNew, String(!!isVertical));
}

function loadSplitterSettings(splitterEl) {
  if (!splitterEl || !splitterEl.id) return;

  const keyNew = LS_SPLITTER_IS_VERTICAL + splitterEl.id;
  let val = localStorage.getItem(keyNew);

  // Se não tem nada salvo, NÃO força orientação.
  // Mantém o que veio do HTML (is-vertical/is-horizontal).
  if (val == null) return;

  if (val === "true") {
    splitterEl.classList.add("is-vertical");
    splitterEl.classList.remove("is-horizontal");
  } else if (val === "false") {
    splitterEl.classList.remove("is-vertical");
    splitterEl.classList.add("is-horizontal");
  }
}

/*
 * UPGRADE DE PLACEHOLDER:
 * Permite:
 * <div class="splitter ...">
 *   <div>first content</div>
 *   <div>second content</div>
 * </div>
 *
 * E converte internamente para:
 * <div class="splitter ...">
 *   <div class="pane first">...</div>
 *   <div class="splitDivider"> <div class="splitDivider-grip"></div> </div>
 *   <div class="pane second">...</div>
 * </div>
 *
 * Regras:
 * - Só faz upgrade se não encontrar .pane.first/.pane.second/.splitDivider
 * - Usa os 2 primeiros ELEMENT children como panes
 * - Se o 2º elemento tiver class "hidden", mantém (vai virar single-pane)
 * - Botão X:
 *    - Por padrão, cria X apenas no pane 2
 *    - Se quiser no pane 1 também: add-btn-close="both" OU add-btn-close-first="1"
 *    - Se quiser desabilitar: add-btn-close="none"
 */
function upgradeSplitterPlaceholders(root = document) {
  root.querySelectorAll(".splitter").forEach((host) => {
    // evita converter duas vezes
    if (host.classList.contains("splitter-innerHTML-updated")) return;

    // se já está no formato antigo (com panes/divider), não mexe
    const hasOldStructure =
      host.querySelector(":scope > .pane.first") &&
      host.querySelector(":scope > .pane.second") &&
      host.querySelector(":scope > .splitDivider");

    if (hasOldStructure) {
      host.classList.add("splitter-innerHTML-updated");
      return;
    }

    // pega apenas ELEMENT children (ignora text nodes)
    const kids = Array.from(host.children).filter((n) => n.nodeType === 1);

    // precisa de pelo menos 2 elementos para virar splitter
    if (kids.length < 2) return;

    // pega os 2 primeiros; se tiver mais, mantém junto no segundo (pra não sumir nada)
    const firstContent = kids[0];
    const secondContent = kids[1];

    // move "sobras" (se existirem) pro segundoContent (ou você pode decidir ignorar/erro)
    for (let i = 2; i < kids.length; i++) {
      secondContent.appendChild(kids[i]);
    }

    // captura flags antes de mexer
    const firstWasHidden = firstContent.classList.contains("hidden");
    const secondWasHidden = secondContent.classList.contains("hidden");
    const closeMode = (host.getAttribute("add-btn-close") || "").toLowerCase();
    const closeFirst = closeMode === "first" || closeMode === "both";
    const closeSecond = closeMode === "second" || closeMode === "both";

    // remove hidden, se estavam hidden antes, a classe sera aplicada nos seus respectivos panes
    firstContent.classList.remove("hidden");
    secondContent.classList.remove("hidden");

    // tira o conteúdo atual do host
    const fragFirst = document.createDocumentFragment();
    const fragSecond = document.createDocumentFragment();

    // move o próprio wrapper inteiro do usuário (firstContent/secondContent) para dentro dos panes
    fragFirst.appendChild(firstContent);
    fragSecond.appendChild(secondContent);

    // monta a estrutura
    host.innerHTML = "";

    const pane1 = document.createElement("div");
    pane1.className = "pane first";
    if (firstWasHidden) pane1.classList.add("hidden");
    pane1.appendChild(fragFirst);

    const divider = document.createElement("div");
    divider.className = "splitDivider";
    divider.setAttribute("role", "separator");
    divider.setAttribute("tabindex", "0");
    divider.setAttribute("title", "Arrastar ou Duplo Clique");

    const grip = document.createElement("div");
    grip.className = "splitDivider-grip";
    divider.appendChild(grip);

    const pane2 = document.createElement("div");
    pane2.className = "pane second";
    if (secondWasHidden) pane2.classList.add("hidden");
    pane2.appendChild(fragSecond);

    // injeta botões X conforme modo
    if (closeFirst) {
      const btn1 = document.createElement("div");
      btn1.className = "pane-close-btn";
      btn1.setAttribute("title", "Fechar Painel");
      btn1.textContent = "x";
      // coloca no topo do pane
      pane1.insertBefore(btn1, pane1.firstChild);
    }

    if (closeSecond) {
      const btn2 = document.createElement("div");
      btn2.className = "pane-close-btn";
      btn2.setAttribute("title", "Fechar Painel");
      btn2.textContent = "x";
      pane2.insertBefore(btn2, pane2.firstChild);
    }

    host.appendChild(pane1);
    host.appendChild(divider);
    host.appendChild(pane2);

    host.classList.add("splitter-innerHTML-updated");
  });
}

function initSplitter(splitterEl) {
  const first = splitterEl.querySelector(":scope > .pane.first");
  const second = splitterEl.querySelector(":scope > .pane.second");
  const divider = splitterEl.querySelector(":scope > .splitDivider");
  const closeFirstBtn = first ? first.querySelector(":scope > .pane-close-btn") : null;
  const closeSecondBtn = second ? second.querySelector(":scope > .pane-close-btn") : null;

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
    // util.* é seu helper existente
    const secondHidden = !util.isVisible(second);

    if (secondHidden) {
      splitterEl.classList.add("single-pane");
      first.style.flex = "1 1 auto";
      second.style.flex = "";
    } else {
      splitterEl.classList.remove("single-pane");
      // deixou de mostra só primeiro pane, ao mostrar os dois, aplica ratio salvo da orientação atual
      applyStoredRatio();
    }
  }

  function setPaneVisible(pane, visible) {
    if (pane === 1) util.setVisible(first, visible);
    else if (pane === 2) util.setVisible(second, visible);

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

  // Inicialização
  window.addEventListener("load", () => {
    loadSplitterSettings(splitterEl);
    syncVisibility();
  });

  let resizingFromObserverMutex = false; //evita cair num loop infinito de resize

  const ro = new ResizeObserver((entries) => {
    if (resizingFromObserverMutex) return;

    const entry = entries[0];
    if (!entry) return;

    // evita rodar quando está invisível
    if (splitterEl.classList.contains("single-pane")) return;

    resizingFromObserverMutex = true;

    // reaplica o ratio salvo para o tamanho novo
    applyStoredRatio();
    resizingFromObserverMutex = false;
  });

  ro.observe(splitterEl);

  // API externa
  splitterEl._syncVisibility = syncVisibility;
  splitterEl._setPaneVisible = setPaneVisible;
  splitterEl._toggleOrientation = toggleOrientation;
}

/* ========= BOOTSTRAP =========
 * 1) upgrade placeholders (inclusive nested)
 * 2) init em todos os splitters
 */
upgradeSplitterPlaceholders(document);
document.querySelectorAll(".splitter").forEach(initSplitter);
