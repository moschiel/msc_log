// Modal "componente" reutilizável (um único modal para a página inteira)
const Modal = (() => {
  const overlay = document.getElementById("modalOverlay");
  const titleEl = document.getElementById("modalTitle");
  const bodyEl  = document.getElementById("modalBody");

  let lastFocusEl = null;
  let onCloseCb = null;

  function isOpen() {
    return overlay.classList.contains("is-open");
  }

  function open(opts) {
    opts = opts || {};
    const title = (opts.title != null) ? String(opts.title) : "";
    const bodyHtml = (opts.bodyHtml != null) ? String(opts.bodyHtml) : "";
    onCloseCb = (typeof opts.onClose === "function") ? opts.onClose : null;

    lastFocusEl = document.activeElement;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");

    // foca no primeiro botão de fechar (se existir)
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
    const el = e.target.closest("[data-modal-close]");
    if (el) close();
  });

  // Fecha com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });

  return { open, close, isOpen };
})();

// Binds: qualquer elemento com data-modal-title / data-modal-body abre o modal
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-modal-title],[data-modal-body]");
  if (!btn) return;

  const title = btn.getAttribute("data-modal-title") || "";
  const bodyHtml = btn.getAttribute("data-modal-body") || "";

  // opcional: impedir comportamento padrão caso seja <a>
  // e.preventDefault();

  Modal.open({ title, bodyHtml });
});

// Se quiser abrir por código:
// Modal.open({ title: "Oi", bodyHtml: "Texto <b>HTML</b>" });
