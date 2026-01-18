ui.cbAutoRefresh.addEventListener("change", setAutoRefresh);

ui.cbAnalyzePkg.addEventListener("change", renderLogText);

ui.btnToggleTermsVisibility.addEventListener("click", toggleTermsPanelVisibility);

ui.taTerms.addEventListener("input", scheduleTermsRerender);

ui.cbMatchCase.addEventListener("change", scheduleTermsRerender);

ui.logBox.addEventListener("click", e => {
    if(e.target.classList.contains('hl-pkg-ok')) {
        let frameStr = getHexDataFromPackage(e.target.classList[0]);
        parseCC33Frame(hexToBuffer(frameStr), true);
    }
});


ui.logBox.addEventListener("mouseover", e => {
    if(e.target.classList.contains('hl-pkg-ok')) {
        schedulePackageHoverRerender(e.target.classList[0], true);
    }
});

ui.logBox.addEventListener("mouseout", e => {
    if(e.target.classList.contains('hl-pkg-ok')) {
        schedulePackageHoverRerender(e.target.classList[0], false);
    }
});

// só funciona se ja existir '.hl-pkg-ok' no innerHTML do log
// se for usar,chamar depois de setLogBoxInnerHTML()
// mantendo aqui pra caso precise usar em outro navegador que só funcione com 'mouseenter' ao invez de 'mouseover'
function applyHoverEventListenerToPackages() {
    document.querySelectorAll(".hl-pkg-ok").forEach( el => {
        el.addEventListener("mouseenter", () => {
            // setHoverEffectToPackage(el.classList[0], true);
            schedulePackageHoverRerender(el.classList[0], true);
        });
        el.addEventListener("mouseleave", () => {
            // setHoverEffectToPackage(el.classList[0], false);
            schedulePackageHoverRerender(el.classList[0], false);
        });
    });

}

ui.btnCloseTablesContainer.addEventListener("click", () => {
    if(ui.tablesContainer.classList.contains("hl-hidden") === false)
        ui.tablesContainer.classList.add("hl-hidden");
    if(ui.messageTableWrapper.classList.contains("hl-hidden") === false)
        ui.messageTableWrapper.classList.add("hl-hidden");
});

ui.packageTable.addEventListener("dblclick", (ev) => {
    try
    {
        const tr = ev.target.closest("tr");
        if (!tr) return;
    
        // se tiver <thead>, evita clicar no header
        if (tr.closest("thead")) return;
    
        const tds = Array.from(tr.cells);
        if (tds.length < 3) return;
    
        const col1Text = tds[0].textContent.trim();
        const col3Text = tds[2].textContent.trim();
    
        // 1) Primeira coluna: se começa com "0x" e len >= 6 -> Number
        let col1Number = null;
        if (col1Text.startsWith("0x") && col1Text.length >= 6 && isHexOnly(col1Text.substr(2, 4))) {
            col1Number = Number(col1Text.substr(0, 6)); // funciona com "0x...."
            if (Number.isNaN(col1Number)) return;
        } else {
            return;
        }
    
        // 2) Terceira coluna: se for texto hex -> Uint8Array
        let col3Bytes = null;
        try {
            col3Bytes = hexToBuffer(col3Text);
        } catch (e) {
            console.warn("Falha ao converter coluna 3 para Uint8Array:", e);
        }

        // 3) imprimir no log o valor da primeira coluna
        console.log("LOG col1:", col1Text.substr(0, 6));
        parseMessage(col1Number, col3Bytes, true);
    }
    catch(e) 
    {
        console.error(e.message);
    }
});