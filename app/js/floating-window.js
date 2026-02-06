import { util } from "./utils.js";

// floating-window.js (ESM)
let globalFloatWindowZ = 9999;
let floatingOpenCount = 0; //contador de janelas abertas
let resizeEventAttached = false;

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// Se a posicao está fora do limite do viewPort, forçamos ficar no viewport
// pode acontecer se o usuario estava em uma tela grande, e mudou para uma menor, ai evita da janela "sumir"
function clampFloatingToViewport(win) {
    if (util.isVisible(win) === false) return;

    const rect = win.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    let top = rect.top;

    // garante que pelo menos um pedaço fique visível
    const MIN_VISIBLE = 40;

    if (left + MIN_VISIBLE > vw) left = vw - MIN_VISIBLE;
    if (top + MIN_VISIBLE > vh) top = vh - MIN_VISIBLE;

    if (left < 0) left = 0;
    if (top < 0) top = 0;

    win.style.left = left + "px";
    win.style.top = top + "px";
}


// Altera a posição incial pra janela nao aparecer exatamente uma em cima da outra
function applyInitialFloatingPosition(win) {
    if (win.style.left || win.style.top) return;

    const BASE_X = 80;
    const BASE_Y = 80;
    const OFFSET = 30;

    win.style.left = (BASE_X + floatingOpenCount * OFFSET) + "px";
    win.style.top = (BASE_Y + floatingOpenCount * OFFSET) + "px";

    floatingOpenCount++;
}

function storageKey(win) {
    return "floating-window:" + win.id;
}

function saveState(win) {
    if (!win || !win.id) return;

    // só salvo o size e local se estiver expandido
    if (win.classList.contains("minimized")) return;

    const rect = win.getBoundingClientRect();

    const state = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        minimized: win.classList.contains("minimized")
    };

    try { localStorage.setItem(storageKey(win), JSON.stringify(state)); } catch { }
}

function restoreState(win) {
    if (!win || !win.id) return false;

    let raw = null;
    try { raw = localStorage.getItem(storageKey(win)); } catch { }
    if (!raw) return false;

    try {
        const s = JSON.parse(raw);

        if (typeof s.left === "number") win.style.left = s.left + "px";
        if (typeof s.top === "number") win.style.top = s.top + "px";
        if (typeof s.width === "number") win.style.width = s.width + "px";
        if (typeof s.height === "number") win.style.height = s.height + "px";

        // restaura estado minimizado
        if (s.minimized) {
            win.classList.add("minimized");
            const btnMin = win.querySelector(".btnMinimize");
            if (btnMin) { btnMin.textContent = "▢"; btnMin.title = "Restaurar"; }
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Transforma um elemento "placeholder" em uma janela flutuante, injetando a estrutura necessária.
 * 
 * O conteúdo original do elemento é preservado e colocado dentro da nova estrutura.
 * 
 * O título da janela é definido pelo atributo "data-title" ou pelo id do elemento.
 * 
 * @param {Element} win 
 */
function upgradeFloatingPlaceholders(win) {
    const title = win.getAttribute("data-title") || win.id || "Window";

    // pega o conteúdo atual
    const frag = document.createDocumentFragment();
    while (win.firstChild) frag.appendChild(win.firstChild);

    // transforma o host em .floating-window
    win.classList.remove("floating-window");
    win.classList.add("floating-window");

    // monta a estrutura padrão dentro
    win.innerHTML = `
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
    win.querySelector(".title").textContent = title;

    // injeta o conteúdo original dentro do .content
    win.querySelector(".content").appendChild(frag);
}

function initFloatingWindow(win) {
    if (!win) return;

    // garante que não inicializa duas vezes
    if (win.classList.contains("floating-initialized")) return;
    win.classList.add("floating-initialized");

    // atualizao DOM do floating-window
    upgradeFloatingPlaceholders(win);

    const restored = restoreState(win);

    // só aplica posição inicial se NÃO tinha estado salvo
    if (!restored) {
        applyInitialFloatingPosition(win);
    }

    const titlebar = win.querySelector(".titlebar");
    const btnMin = win.querySelector(".btnMinimize");
    const btnClose = win.querySelector(".btnClose");

    // traz pra frente ao clicar
    win.addEventListener("pointerdown", () => {
        globalFloatWindowZ += 1;
        win.style.zIndex = String(globalFloatWindowZ);
    });

    // ===== DRAG (mover) =====
    let dragging = false;
    let dragStartX = 0, dragStartY = 0;
    let startLeft = 0, startTop = 0;

    if (titlebar) {
        titlebar.addEventListener("pointerdown", (e) => {
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
            saveState(win);
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

    // CLOSE
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
            saveState(win);
        });
    });
}

/**
 * Abre uma janela flutuante, trazendo-a para frente.
 * 
 * Chamar util.setVisible já seria suficiente, 
 * mas temos que aumentar o zIndex pra nova janela nao aparecer escondida.
 * 
 * Essa função encapsula tudo isso.
 * 
 * @param {HTMLElement} win - HTMLElement com a class "floating-window"
 */
export function openFloatingWindow(win) {
    globalFloatWindowZ += 1;
    win.style.zIndex = String(globalFloatWindowZ);

    util.setVisible(win, true);
    clampFloatingToViewport(win);
}

/**  
 * ✅ init “manual”, controlado por quem importa.
 * 
 * root opcional: permite inicializar só um container que acabou de ganhar HTML novo
 * 
 * @param {Document} root - root onde procurar por floating-windows
 */
export function initAllFloatingWindows(root = document) {
    // inicializa todas as janelas (agora já convertidas)
    root.querySelectorAll(".floating-window").forEach(initFloatingWindow);

    if (!resizeEventAttached) {
        resizeEventAttached = true;
        // garante que se navegador diminuir de tamanho, nao suma completamente o floating-window
        window.addEventListener("resize", () => {
            document.querySelectorAll(".floating-window:not(.hidden)").forEach((win) => {
                clampFloatingToViewport(win);
            });
        });
    }
}
