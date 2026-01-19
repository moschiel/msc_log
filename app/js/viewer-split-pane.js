const MIN_PANE_PX = 80;       // ajuste

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function setSplitByTopPx(topPx) {
    const rect = ui.vsplip.getBoundingClientRect();
    const total = rect.height;

    // top/bottom mínimos
    const minTop = MIN_PANE_PX;
    const maxTop = total - ui.splitDivider.offsetHeight - MIN_PANE_PX;

    const newTop = clamp(topPx, minTop, maxTop);

    // Faz o top ocupar px fixo e o bottom pegar o resto
    ui.splitTopPane.style.flex = `0 0 ${newTop}px`;
    ui.splitBottomPane.style.flex = `1 1 auto`;
}

function syncSplitVisibility() {
    const bottomHidden = ui.splitBottomPane.classList.contains("hidden");

    if (bottomHidden) {
        ui.vsplip.classList.add("single-pane");
        // garante que o top ocupe tudo (sem altura fixa antiga)
        ui.splitTopPane.style.flex = "1 1 auto";
        // opcional: limpa estilos de split antigos
        ui.splitBottomPane.style.flex = "";
    } else {
        ui.vsplip.classList.remove("single-pane");
        // ao mostrar, re-aplica um split inicial (ou o último salvo)
        const rect = ui.vsplip.getBoundingClientRect();
        setSplitByTopPx(rect.height * 0.5); // ou sua proporção preferida
    }
}

function pointerYToTopPx(clientY) {
    const rect = ui.vsplip.getBoundingClientRect();
    return clientY - rect.top; // posição dentro do container
}

function initializeSplitPane() {
    let dragging = false;

    ui.splitDivider.addEventListener("pointerdown", (e) => {
        dragging = true;
        ui.splitDivider.setPointerCapture(e.pointerId);

        // evita selecionar texto durante drag
        document.body.style.userSelect = "none";
        document.body.style.cursor = "row-resize";
    });

    ui.splitDivider.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        setSplitByTopPx(pointerYToTopPx(e.clientY) - ui.splitDivider.offsetHeight / 2);
    });

    function stopDrag() {
        dragging = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    }

    ui.splitDivider.addEventListener("pointerup", stopDrag);
    ui.splitDivider.addEventListener("pointercancel", stopDrag);

    
    window.addEventListener("load", () => {
        const rect = ui.vsplip.getBoundingClientRect();
        // setSplitByTopPx(rect.height * 0.5); // Inicial: 50/50
        syncSplitVisibility();
    });

    // Se a tela redimensionar, mantém proporção aproximada
    window.addEventListener("resize", () => {
        const rect = ui.vsplip.getBoundingClientRect();
        const topNow = ui.splitTopPane.getBoundingClientRect().height;
        const ratio = topNow / rect.height;
        setSplitByTopPx(rect.height * ratio);
    });
}

// Executa ao carregar script
initializeSplitPane();
