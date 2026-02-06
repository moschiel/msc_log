// modal.js (ESM)

let _modal = null;

/**
 * Inicializa o componente Modal.
 *
 * Responsável apenas pelo setup estrutural:
 * - localiza os elementos fixos do modal no DOM
 * - registra os listeners globais (overlay, ESC, data-modal-*, etc.)
 * - cria e guarda a instância interna do modal
 *
 * Deve ser chamada UMA única vez, após o DOM estar pronto.
 * Não abre o modal nem injeta conteúdo.
 *
 * @param {Object} [opts]
 * @param {string} [opts.overlayId="modalOverlay"] ID do elemento overlay do modal
 * @param {string} [opts.titleId="modalTitle"] ID do elemento de título
 * @param {string} [opts.bodyId="modalBody"] ID do elemento de conteúdo
 * @param {boolean} [opts.enableDataAttrs=true]
 *        Se true, ativa abertura automática via atributos data-modal-*
 * @returns {{open: Function, close: Function, isOpen: Function}|null}
 *          Instância do modal ou null se os elementos não existirem na página
 */
export function initModal(opts = {}) {
  if (_modal) return _modal; // evita init duplo

  const {
    overlayId = "modalOverlay",
    titleId = "modalTitle",
    bodyId = "modalBody",
    enableDataAttrs = true, // bind automático via data-modal-*
  } = opts;

  const overlay = document.getElementById(overlayId);
  const titleEl = document.getElementById(titleId);
  const bodyEl  = document.getElementById(bodyId);

  if (!overlay || !titleEl || !bodyEl) {
    // não quebra o app se o modal não existir nessa página
    return null;
  }

  let lastFocusEl = null;
  let onCloseCb = null;

  function isOpen() {
    return overlay.classList.contains("is-open");
  }

  function open(mopts = {}) {
    const title = (mopts.title != null) ? String(mopts.title) : "";
    const bodyHtml = (mopts.bodyHtml != null) ? String(mopts.bodyHtml) : "";
    onCloseCb = (typeof mopts.onClose === "function") ? mopts.onClose : null;

    lastFocusEl = document.activeElement;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    // foca no primeiro botão de fechar (se existir)
    /** @type {HTMLElement} */
    const closeBtn = overlay.querySelector("[data-modal-close]");
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    if (!isOpen()) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    const cb = onCloseCb;
    onCloseCb = null;
    if (cb) cb();

    if (lastFocusEl && typeof lastFocusEl.focus === "function") {
      lastFocusEl.focus();
    }
    lastFocusEl = null;
  }

  // Fecha clicando no fundo
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Fecha ao clicar em qualquer elemento com data-modal-close
  overlay.addEventListener("click", (e) => {
    if (!(e.target instanceof HTMLElement)) return;

    const el = e.target.closest("[data-modal-close]");
    if (el) close();
  });

  // Fecha com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });

  // bind automático via data-attrs (opcional)
  // qualquer elemento com data-modal-title / data-modal-body abre o modal
  if (enableDataAttrs) {
    document.addEventListener("click", (e) => {
      if (!(e.target instanceof HTMLElement)) return;

      const btn = e.target.closest("[data-modal-title],[data-modal-body]");
      if (!btn) return;

      const t = btn.getAttribute("data-modal-title") || "";
      const b = btn.getAttribute("data-modal-body") || "";
      open({ title: t, bodyHtml: b });
    });
  }

  _modal = { open, close, isOpen };
  return _modal;
}

// Conveniência: pra quem quer só usar sem guardar retorno
export function openModal(opts) {
  if (!_modal) {
    console.warn("Modal não inicializado. Chame initModal() primeiro.");
    return null;
  }
  _modal.open(opts);
}

export function closeModal() {
  if (!_modal) {
    console.warn("Modal não inicializado. Chame initModal() primeiro.");
    return null;
  }
  _modal.close();
}

/**
 * Retorna a instância do Modal já inicializada.
 *
 * Deve ser usada após a chamada de initModal().
 * 
 * Não cria nem inicializa o modal automaticamente.
 *
 * @returns {{open: Function, close: Function, isOpen: Function}|null}
 *          Instância atual do modal ou null se ainda não inicializado
 */
export function getModal() {
  if (!_modal) {
    console.warn("Modal não inicializado. Chame initModal() primeiro.");
    return null;
  }
  return _modal;
}
