window.addEventListener("load", () => {
    // carrega options no selListMessage
    for (const [id, info] of msgsList) {
        if (info.timelineSupport) {
            const opt = document.createElement("option");
            const idHex = "0x" + id.toString(16).toUpperCase().padStart(4, "0");
            opt.value = id;
            opt.textContent = `${idHex} - ${info.description}`;
            ui.selListMessage.appendChild(opt);
        }
    }

    //forca um refresh inicial do logBox
    tailRefreshNow();
});

ui.btnTailAutoRefresh.addEventListener("click", () => {
    util.toogleButton(ui.btnTailAutoRefresh);
    setTailAutoRefresh();
});

ui.btnAutoScroll.addEventListener("click", () => {
    util.toogleButton(ui.btnAutoScroll);
});

ui.btnHighlightPkg.addEventListener("click", () => {
    ui.btnHighlightPkg.disable = true;
    ui.btnTailAutoRefresh.disable = true;

    clearHighlightPkgCounters();
    clearLogBox();

    const isPressed = util.toogleButton(ui.btnHighlightPkg);
    if (isPressed) 
    {
        writeLogWithHighlightPackage("set", getRawLog());
    }
    else 
    {
        // Nao tem nada pra fazer highlight, setamos o texto puro
        writeLogBox("set", "text", getRawLog());
        setLogBoxPendingPacket("");
    }

    ui.btnHighlightPkg.disable = false;
    ui.btnTailAutoRefresh.disable = false;
});

ui.selListMessage.addEventListener("change", () => {
    const id = Number(ui.selListMessage.value);
    listMessage(id);
});

ui.btnPkgConfig.addEventListener("click", () => {

    const ignoreAck = readPkgAnalyzeConfig("ignoreAck") === "1";
    const ignoreKeepAlive = readPkgAnalyzeConfig("ignoreKeepAlive") === "1";

    Modal.open({
        title: "Configurações",
        bodyHtml: `
<div>
    <div style="padding-bottom: 16px;">
        Análise de Pacotes
    </div>
    <label>
        <input id="cbIgnoreAck" type="checkbox" ${ignoreAck ? "checked" : ""}>
        Ignorar ACK (message ID 0xFFFF)
    </label>
    <br>
    <label>
        <input id="cbIgnoreKeepAlive" type="checkbox" ${ignoreKeepAlive ? "checked" : ""}>
        Ignorar KEEP-ALIVE (message ID 0x0000)
    </label>
<div>`
    });

    const modalBody = document.getElementById("modalBody");
    const cbIgnoreAck = modalBody.querySelector("#cbIgnoreAck");
    const cbIgnoreKeepAlive = modalBody.querySelector("#cbIgnoreKeepAlive")

    cbIgnoreAck.onchange = () => {
        savePkgAnalyzeConfig("ignoreAck", cbIgnoreAck.checked ? "1" : "0");
    };

    cbIgnoreKeepAlive.onchange = () => {
        savePkgAnalyzeConfig("ignoreKeepAlive", cbIgnoreKeepAlive.checked ? "1" : "0");
    };
});

let lastMessageIdClicked = 0;
ui.logBox.addEventListener("click", e => {
    if (e.target.classList.contains('hl-pkg-ok')) {
        let frameStr = getHexFromPackageClassGroup(e.target.classList[0]);
        const { parseOk, headers, rows, messages } = parseCC33Package(util.hexToBuffer(frameStr), "collect");
        if (parseOk) {
            // Cria tabela do pacote
            showParsedPackageOnTable(headers, rows);

            // Parsea e cria tabela da ultima mensagem clicada
            if (messages.length > 0) {
                for (const msg of messages) {
                    if (msg.id === lastMessageIdClicked) {
                        const {isImplemented, rows} = parseMessage(
                            msg.id, 
                            msg.data, 
                            "nsv", /* Collect parametes name, size, and value */
                            "v" /* Parametes Vertical Orientation */
                        );
                        showParsedMessageOnTable(
                            isImplemented,
                            msg.id,
                            ["Name", "Size", "Value"], 
                            rows
                        );
                        return;
                    }
                }
            }
            // Se nao possui a ultima mensagem clicada, nao mostra a tabela da mensagem
            ui.labelMessageDescription.innerHTML = "";
            ui.messageTable.innerHTML = "";
        }
    }
});

ui.packageTable.addEventListener("click", (ev) => {
    try {
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

        // 3) Parsear mensagem e mostrar na tabela
        const {isImplemented, rows} = parseMessage(
            messageID, 
            col3Bytes, 
            "nsv", // Collect parameters name, size and value
            "v" // Data vertical orientation
        );
        showParsedMessageOnTable(
            isImplemented, 
            messageID, 
            ["Name", "Size", "Value"], 
            rows
        );
    }
    catch (e) {
        console.error(e.message);
    }
});