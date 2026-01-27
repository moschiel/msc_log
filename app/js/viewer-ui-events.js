window.addEventListener("load", () => {
   // carrega options no messageSelector
    for (const [id, info] of msgsList) {
        if(info.timelineSupport) {
            const opt = document.createElement("option");
            const idHex = "0x" + id.toString(16).toUpperCase().padStart(4, "0");
            opt.value = id;
            opt.textContent = `${idHex} - ${info.description}`;
            ui.messageSelector.appendChild(opt);
        }
    }

    //carrega termos marcados p/ pesquisa pelo usuario
    loadTermsSettings();

    //forca um refresh inicial do logBox
    refreshNow();
});

ui.btnAutoRefreshViewer.addEventListener("click", () => {
    util.toogleOnOffButton(ui.btnAutoRefreshViewer);
    setAutoRefreshViewer(); 
});

ui.btnAutoScroll.addEventListener("click", () => {
    util.toogleOnOffButton(ui.btnAutoScroll);
});


ui.btnHighlightPkg.addEventListener("click", () => {
    util.setOnOffButton(btnAutoRefreshViewer, false);
    ui.btnHighlightPkg.disable = true;
    rerenderLogContent({packagesHighlight: true}); 
    ui.btnHighlightPkg.disable = false;
});

ui.btnToggleTermsVisibility?.addEventListener("click", toggleTermsPanelVisibility);

ui.taTerms?.addEventListener("input", scheduleTermsRerender);

ui.cbMatchCase?.addEventListener("change", scheduleTermsRerender);


let lastMessageIdClicked = 0;
ui.logBox.addEventListener("click", e => {
    if(e.target.classList.contains('hl-pkg-ok')) {
        let frameStr = getHexFromPackageClassGroup(e.target.classList[0]);
        const {parseOk, headers, rows, messages} = parseCC33Frame(util.hexToBuffer(frameStr), "collect");
        if(parseOk) {
            // Cria tabela do pacote
            showParsedPackageOnTable(headers, rows);
            
            // Parsea e cria tabela da ultima mensagem clicada
            if(messages.length > 0) {
                for(const msg of messages) {
                    if (msg.id === lastMessageIdClicked) {
                        parseMessage(msg.id, msg.data, true);
                        return;
                    }
                }
            }
            // Se nao possui a ultima mensagem clicada, nao mostra a tabela da mensagem
            ui.tableSplitter._setPaneVisible(2, false);
        }   
    }
});

ui.packageTable.addEventListener("click", (ev) => {
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
        let messageID = null;
        if (col1Text.startsWith("0x") && col1Text.length >= 6 && util.isHexOnly(col1Text.substr(2, 4))) {
            messageID = Number(col1Text.substr(0, 6)); // funciona com "0x...."
            if (Number.isNaN(messageID)) return;
        } else {
            return;
        }

        lastMessageIdClicked = messageID;
    
        // 2) Terceira coluna: se for texto hex -> Uint8Array
        let col3Bytes = null;
        try {
            col3Bytes = util.hexToBuffer(col3Text);
        } catch (e) {
            console.warn("Falha ao converter coluna 3 para Uint8Array:", e);
        }

        // 3) imprimir no log o valor da primeira coluna
        // console.log("LOG col1:", col1Text.substr(0, 6));
        parseMessage(messageID, col3Bytes, true);
    }
    catch(e) 
    {
        console.error(e.message);
    }
});