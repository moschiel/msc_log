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
 * Inicializa um modal baseado no overlayId.
 * overlayId também é usado como chave lógica.
 */
export function initModal(opts = {}) {
  const {
    overlayId = "modalOverlay",
    titleId = "modalTitle",
    bodyId = "modalBody",
    enableDataAttrs = true,
  } = opts;

  if (_modals.has(overlayId)) {
    return _modals.get(overlayId);
  }

  const overlay = document.getElementById(overlayId);
  const titleEl = document.getElementById(titleId);
  const bodyEl  = document.getElementById(bodyId);

  if (!overlay || !titleEl || !bodyEl) {
    return null;
  }

  let lastFocusEl = null;
  let onCloseCb = null;

  function isOpen() {
    return overlay.classList.contains("is-open");
  }

  function open(mopts = {}) {
    lastFocusEl = document.activeElement;

    titleEl.textContent = mopts.title ?? "";
    bodyEl.innerHTML = mopts.bodyHtml ?? "";

    onCloseCb = typeof mopts.onClose === "function" ? mopts.onClose : null;

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    _stackPush(overlayId);

    /** @type {HTMLElement} */
    const closeBtn = overlay.querySelector("[data-modal-close]");
    closeBtn?.focus();
  }

  function close() {
    if (!isOpen()) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    _stackRemove(overlayId);

    const cb = onCloseCb;
    onCloseCb = null;
    cb?.();

    lastFocusEl?.focus?.();
    lastFocusEl = null;
  }

  // click no fundo fecha
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // botão com data-modal-close
  overlay.addEventListener("click", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    if (e.target.closest("[data-modal-close]")) close();
  });

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
