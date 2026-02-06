// split-pane.js (ESM)
import { util } from "./utils.js";

const MIN_PANE_PX = 80;
const LS_SPLITTER_IS_VERTICAL = "splitter_is_vertical::";

const splitterApi = new WeakMap(); // key: splitterEl, value: { setPaneVisible, syncVisibility, toggleOrientation, ... }


function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


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
  const val = localStorage.getItem(keyNew);

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

/**
 * Transforma um elemento "placeholder" em um splitter, injetando a estrutura necessária.
 * 
 * O conteúdo original do elemento é preservado e colocado dentro da nova estrutura.
 * 
 * @param {Element} splitterEl 
 */
function upgradeSplitterPlaceholders(splitterEl) {
    // se já está no formato antigo (com panes/divider), não mexe
    const hasOldStructure =
      splitterEl.querySelector(":scope > .pane.first") &&
      splitterEl.querySelector(":scope > .pane.second") &&
      splitterEl.querySelector(":scope > .splitDivider");

    // pega apenas ELEMENT children (ignora text nodes)
    const kids = Array.from(splitterEl.children).filter((n) => n.nodeType === 1);

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
    const closeMode = (splitterEl.getAttribute("add-btn-close") || "").toLowerCase();
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
    splitterEl.innerHTML = "";

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

    splitterEl.appendChild(pane1);
    splitterEl.appendChild(divider);
    splitterEl.appendChild(pane2);
}

function initSplitter(splitterEl) {
  if (!splitterEl) return;

  // ✅ evita inicializar 2x (importante se você chamar initAllSplitters(root) mais de uma vez)
  if (splitterEl.classList.contains("splitter-initialized")) return;
  splitterEl.classList.add("splitter-initialized");

  // atualizao DOM do splitter
  upgradeSplitterPlaceholders(splitterEl);

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

    const r = getCurrentRatio();
    if (isVertical()) ratioV = r;
    else ratioH = r;
  }

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
  if (closeFirstBtn) {
    closeFirstBtn.addEventListener("click", () => setPaneVisible(1, false));
  }
  if (closeSecondBtn) {
    closeSecondBtn.addEventListener("click", () => setPaneVisible(2, false));
  }

  // ✅ ResizeObserver  
  let resizingFromObserverMutex = false; //evita cair num loop infinito de resize

  const ro = new ResizeObserver(() => {
    if (resizingFromObserverMutex) return;


    // evita rodar quando só um pane estiver visível (single-pane)
    if (splitterEl.classList.contains("single-pane")) return;

    resizingFromObserverMutex = true;

    // reaplica o ratio salvo para o tamanho novo
    applyStoredRatio();
    resizingFromObserverMutex = false;
  });

  ro.observe(splitterEl);

  // API externa com funcoes para uso por módulos
  splitterApi.set(splitterEl, {
    setPaneVisible,
    // syncVisibility,
    // toggleOrientation,
  });


  // ✅ aplicação inicial (quem chamou init decide se é no load/domcontentloaded)
  loadSplitterSettings(splitterEl);
  syncVisibility();
}

/*
 * Inicializa todos os splitters dentro de um root.
 * Chame isso no seu window.load / DOMContentLoaded ou após injetar HTML.
 */
export function initAllSplitters(root = document) {
  root.querySelectorAll(".splitter").forEach(initSplitter);
}

/* Define a visibilidade de um dos panes de um splitter.
 * Retorna false se o splitter não foi inicializado ainda.
 */
export function setSplitterPaneVisible(splitterEl, pane, visible) {
  const api = splitterApi.get(splitterEl);
  if (!api) return false; // não inicializou ainda

  api.setPaneVisible(pane, visible);
  return true;
}

