// FloatingWindow: drag + resize dentro da viewport (sem libs)
(function () {
    let globalZ = 9999;

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function initFloatingWindow(win) {
        if (!win) return;

        const titlebar = win.querySelector(".titlebar");
        const btnMin = win.querySelector(".btnMinimize");
        const btnClose = win.querySelector(".btnClose");

        // traz pra frente ao clicar
        win.addEventListener("pointerdown", () => {
            globalZ += 1;
            win.style.zIndex = String(globalZ);
        });

        // ===== DRAG (mover) =====
        let dragging = false;
        let dragStartX = 0, dragStartY = 0;
        let startLeft = 0, startTop = 0;

        if (titlebar) {
            titlebar.addEventListener("pointerdown", (e) => {
                // não arrasta se clicar em botões da titlebar (minimize/close)
                //if (e.target.closest(".btnClose, .btnMinimize")) return;

                dragging = true;
                titlebar.setPointerCapture(e.pointerId);

                const rect = win.getBoundingClientRect();
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;

                e.preventDefault();
            });

            titlebar.addEventListener("pointermove", (e) => {
                if (!dragging) return;

                const dx = e.clientX - dragStartX;
                const dy = e.clientY - dragStartY;

                const rect = win.getBoundingClientRect();
                const w = rect.width;
                const h = rect.height;

                const maxLeft = window.innerWidth - w;
                const maxTop = window.innerHeight - h;

                const newLeft = clamp(startLeft + dx, 0, maxLeft);
                const newTop = clamp(startTop + dy, 0, maxTop);

                win.style.left = newLeft + "px";
                win.style.top = newTop + "px";
            });

            titlebar.addEventListener("pointerup", (e) => {
                dragging = false;
                try { titlebar.releasePointerCapture(e.pointerId); } catch { }
            });
        }

        // minimizar / restaurar
        let lastHeight = null;
        let lastWidth = null;

        const MINIMIZED_WIDTH = 220; // ajuste aqui (ex: 180 / 200 / 240)

        if (btnMin) {
            btnMin.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isMinimized = win.classList.contains("minimized");

                if (!isMinimized) {
                    const rect = win.getBoundingClientRect();
                    lastHeight = win.style.height || rect.height + "px";
                    lastWidth = win.style.width || rect.width + "px";

                    win.classList.add("minimized");
                    win.style.width = MINIMIZED_WIDTH + "px";

                    btnMin.textContent = "▢";
                    btnMin.title = "Restaurar";
                } else {
                    win.classList.remove("minimized");

                    if (lastHeight) win.style.height = lastHeight;
                    if (lastWidth) win.style.width = lastWidth;

                    btnMin.textContent = "—";
                    btnMin.title = "Minimizar";
                }
            });
        }


        // fechar (opcional)
        if (btnClose) {
            btnClose.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                e.stopPropagation();

                util.setVisible(win, false);
            });
        }

        // ===== RESIZE =====
        let resizing = false;
        let edge = "";

        let rsX = 0, rsY = 0;
        let rLeft = 0, rTop = 0, rW = 0, rH = 0;

        const minW = parseInt(getComputedStyle(win).minWidth || "240", 10) || 240;
        const minH = parseInt(getComputedStyle(win).minHeight || "160", 10) || 160;

        const handles = win.querySelectorAll(".handle[data-edge]");
        handles.forEach((h) => {
            h.addEventListener("pointerdown", (e) => {
                resizing = true;
                edge = e.currentTarget.dataset.edge || "";
                h.setPointerCapture(e.pointerId);

                const rect = win.getBoundingClientRect();
                rsX = e.clientX;
                rsY = e.clientY;
                rLeft = rect.left;
                rTop = rect.top;
                rW = rect.width;
                rH = rect.height;

                e.preventDefault();
                e.stopPropagation();
            });

            h.addEventListener("pointermove", (e) => {
                if (!resizing) return;

                const dx = e.clientX - rsX;
                const dy = e.clientY - rsY;

                let newLeft = rLeft;
                let newTop = rTop;
                let newW = rW;
                let newH = rH;

                const hasN = edge.indexOf("n") !== -1;
                const hasS = edge.indexOf("s") !== -1;
                const hasE = edge.indexOf("e") !== -1;
                const hasW = edge.indexOf("w") !== -1;

                if (hasE) newW = rW + dx;
                if (hasS) newH = rH + dy;

                if (hasW) {
                    newW = rW - dx;
                    newLeft = rLeft + dx;
                }

                if (hasN) {
                    newH = rH - dy;
                    newTop = rTop + dy;
                }

                // mínimos
                if (newW < minW) {
                    if (hasW) newLeft -= (minW - newW);
                    newW = minW;
                }

                if (newH < minH) {
                    if (hasN) newTop -= (minH - newH);
                    newH = minH;
                }

                // clamp: não deixa sair pra esquerda/cima
                if (newLeft < 0) {
                    newW += newLeft;  // reduz largura
                    newLeft = 0;
                    if (newW < minW) newW = minW;
                }

                if (newTop < 0) {
                    newH += newTop;
                    newTop = 0;
                    if (newH < minH) newH = minH;
                }

                // clamp: não deixa passar direita/baixo
                const maxW = window.innerWidth - newLeft;
                const maxH = window.innerHeight - newTop;

                newW = Math.min(newW, maxW);
                newH = Math.min(newH, maxH);

                win.style.left = newLeft + "px";
                win.style.top = newTop + "px";
                win.style.width = newW + "px";
                win.style.height = newH + "px";
            });

            h.addEventListener("pointerup", (e) => {
                resizing = false;
                try { h.releasePointerCapture(e.pointerId); } catch { }
            });
        });
    }

    function upgradeFloatingPlaceholders() {
        document.querySelectorAll(".floating-window").forEach((host) => {
            // evita converter duas vezes
            if (host.classList.contains("floating-innerHTML-updated")) return;
            host.classList.add("floating-innerHTML-updated");

            const title = host.getAttribute("data-title") || host.id || "Window";

            // pega o conteúdo atual
            const frag = document.createDocumentFragment();
            while (host.firstChild) frag.appendChild(host.firstChild);

            // transforma o host em .floating-window
            host.classList.remove("floating-window");
            host.classList.add("floating-window");

            // monta a estrutura padrão dentro
            host.innerHTML = `
      <div class="titlebar">
        <div class="title"></div>
        <button type="button" class="btnMinimize" title="Minimizar">—</button>
        <button type="button" class="btnClose" title="Fechar">✕</button>
      </div>

      <div class="content"></div>

      <div class="handle h-n" data-edge="n"></div>
      <div class="handle h-s" data-edge="s"></div>
      <div class="handle h-e" data-edge="e"></div>
      <div class="handle h-w" data-edge="w"></div>
      <div class="handle h-ne" data-edge="ne"></div>
      <div class="handle h-nw" data-edge="nw"></div>
      <div class="handle h-se" data-edge="se"></div>
      <div class="handle h-sw" data-edge="sw"></div>
    `;

            // injeta o título
            host.querySelector(".title").textContent = title;

            // injeta o conteúdo original dentro do .content
            host.querySelector(".content").appendChild(frag);
        });
    }


    // Inicializa automaticamente todos com classe .floating-window
    document.addEventListener("DOMContentLoaded", () => {
        upgradeFloatingPlaceholders();

        // inicializa todas as janelas (agora já convertidas)
        document.querySelectorAll(".floating-window").forEach(initFloatingWindow);
    });

    // Se você quiser inicializar manualmente:
    // window.initFloatingWindow = initFloatingWindow;
})();
