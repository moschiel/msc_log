// modal.js (ESM) — multi-modal simplificado

const _modals = new Map();   // overlayId -> instance
const _openStack = [];       // controla ordem de abertura (ESC fecha o topo)
let _globalBound = false;

function _stackPush(id) {
  const idx = _openStack.indexOf(id);
  if (idx !== -1) _openStack.splice(idx, 1);
  _openStack.push(id);
}

function _stackRemove(id) {
  const idx = _openStack.lastIndexOf(id);
  if (idx !== -1) _openStack.splice(idx, 1);
}

function _topOpenId() {
  for (let i = _openStack.length - 1; i >= 0; i--) {
    const id = _openStack[i];
    const m = _modals.get(id);
    if (m && m.isOpen()) return id;
  }
  return null;
}

function _bindGlobalHandlers(enableDataAttrs) {
  if (_globalBound) return;
  _globalBound = true;

  // ESC fecha o modal do topo
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const topId = _topOpenId();
    if (!topId) return;
    _modals.get(topId)?.close();
  });

  // data-modal-*
  if (enableDataAttrs) {
    document.addEventListener("click", (e) => {
      if (!(e.target instanceof HTMLElement)) return;

      const btn = e.target.closest("[data-modal-title],[data-modal-body]");
      if (!btn) return;

      const overlayId = btn.getAttribute("data-modal-overlay") || "modalOverlay";
      const modal = _modals.get(overlayId);
      if (!modal) return;

      modal.open({
        title: btn.getAttribute("data-modal-title") || "",
        bodyHtml: btn.getAttribute("data-modal-body") || ""
      });
    });
  }
}

/**
 * @typedef {Object} ModalOpenOptions
 * @property {string} [title]        Título a ser colocado em [data-modal-title]
 * @property {string} [bodyHtml]     HTML a ser colocado em [data-modal-body]
 * @property {() => void} [onClose]  Callback chamado ao fechar (se existir)
 */

/**
 * @typedef {Object} ModalInstance
 * @property {(opts?: ModalOpenOptions) => void} open
 * @property {() => void} close
 * @property {() => boolean} isOpen
 */

/**
 * @typedef {Object} InitModalOptions
 * @property {string} overlayId            ID do elemento overlay (container do modal)
 * @property {boolean} [enableDataAttrs]   Habilita bind global por data-attrs
 */

/**
 * Inicializa um modal baseado no overlayId.
 * overlayId também é usado como chave lógica.
 *
 * Requer que dentro do overlay existam:
 *  - [data-modal-title]
 *  - [data-modal-body]
 *
 * @param {InitModalOptions} [opts]
 * @returns {ModalInstance|null}
 */
export function initModal(opts = /** @type {InitModalOptions} */ ({ overlayId: "" })) {
  const { overlayId, enableDataAttrs = true } = opts;

  if (!overlayId) return null;

  if (_modals.has(overlayId)) {
    return _modals.get(overlayId);
  }

  const overlay = document.getElementById(overlayId);
  if (!overlay) return null;

  /** @type {HTMLElement|null} */
  const titleEl = overlay.querySelector("[data-modal-title]");
  /** @type {HTMLElement|null} */
  const bodyEl = overlay.querySelector("[data-modal-body]");

  if (!titleEl || !bodyEl) return null;

  /** @type {HTMLElement|null} */
  let lastFocusEl = null;
  /** @type {(() => void) | null} */
  let onCloseCb = null;

  function isOpen() {
    return overlay.classList.contains("is-open");
  }

  /**
   * @param {ModalOpenOptions} [mopts]
   */
  function open(mopts = {}) {
    const { title = "", bodyHtml = "", onClose } = mopts;

    lastFocusEl = /** @type {HTMLElement|null} */ (document.activeElement);

    titleEl.textContent = String(title);
    bodyEl.innerHTML = String(bodyHtml);

    onCloseCb = (typeof onClose === "function") ? onClose : null;

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    _stackPush(overlayId);

    /** @type {HTMLElement|null} */
    const closeBtn = overlay.querySelector("[data-modal-close]");
    closeBtn?.focus();
  }

  function close() {
    if (!isOpen()) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    _stackRemove(overlayId);

    onCloseCb?.();
    onCloseCb = null;

    lastFocusEl?.focus?.();
    lastFocusEl = null;
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay.addEventListener("click", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    if (e.target.closest("[data-modal-close]")) close();
  });

  /** @type {ModalInstance} */
  const instance = { open, close, isOpen };
  _modals.set(overlayId, instance);

  _bindGlobalHandlers(enableDataAttrs);

  return instance;
}



/** Abre modal pelo overlayId */
export function openModal(overlayId = "modalOverlay", opts = {}) {
  _modals.get(overlayId)?.open(opts);
}

/** Fecha modal pelo overlayId */
export function closeModal(overlayId = "modalOverlay") {
  _modals.get(overlayId)?.close();
}

/** Retorna instância */
export function getModal(overlayId = "modalOverlay") {
  return _modals.get(overlayId) || null;
}
