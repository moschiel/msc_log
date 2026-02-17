import { ui } from "./viewer-ui-elements.js";
import { util } from "./utils.js";
import { initAllFloatingWindows } from "./floating-window.js";
import { initAllSplitters, setSplitterPaneVisible } from "./split-pane.js";
import { initModal, getModal } from "./modal.js";
import {
    parseMessage, showParsedMessageOnTable, initSelectMessageIDOptions,
    hlMessagesCountStatistics,
    hideAllListMessageOptions,
    hideListMessagePane
} from "./viewer-message-parser.js";
import {
    tailRefreshNow, setTailAutoRefresh, clearAllLogData,
    setLocalFileHandle
} from "./viewer-auto-refresh.js";
import {
    getRawLog, clearLogBox, writeLogBox, setLogBoxPendingPacket, processLogChunkAndRender, disableControlsForRender
} from "./viewer-render-log.js";
import {
    clearPkgInfo, readPkgAnalyzeConfig, savePkgAnalyzeConfig, parsePackage, showParsedPackageOnTable
} from "./viewer-package-parser.js";
import { getHexFromHighlightPackageClass, scrollToHighlightedPackage } from "./viewer-package-highlight.js";

// Evento de página carregada, 
// após carregamento inicializamos outros componentes da UI
// além de forçar uma atualização inicial do conteúdo do log.
window.addEventListener("load", () => {
    // carrega options no seletor #selListMessage
    initSelectMessageIDOptions();

    // inicializa floating windows (elementos com a classe floating-window)
    initAllFloatingWindows();

    // inicializa splitters (elementos com a classe splitter)
    initAllSplitters();

    // inicializa o modal único
    initModal({
        overlayId: "modalOverlay",
        titleId: "modalTitle",
        bodyId: "modalBody"
    });

    // forca uma requisição inicial do conteúdo do log
    tailRefreshNow();
});

if (ui.btnPickLocalFile) {
    ui.btnPickLocalFile.addEventListener("click", async () => {
        try {
            // @ts-ignore
            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: "Logs",
                    accept: { "text/plain": [".log", ".txt", ".asc"] }
                }]
            });

            if (!handle) return; // nenhum arquivo selecionado

            //util.saveLastFileHandle(handle); // salva handle do arquivo selecionado para próxima vez que carregar a página

            clearAllLogData();
            setLocalFileHandle(handle);

            ui.labelLocalFile.textContent = handle.name;

            await tailRefreshNow();

        } catch (e) {
            // cancelado pelo usuário → ignora
            if (e.name !== "AbortError") {
                console.error(e);
            }
        }
    });
}

ui.btnTailAutoRefresh.addEventListener("click", () => {
    util.toogleButton(ui.btnTailAutoRefresh);
    setTailAutoRefresh();
});

ui.btnAutoScroll.addEventListener("click", () => {
    util.toogleButton(ui.btnAutoScroll);
});

ui.btnHighlightPkg.addEventListener("click", () => {
    disableControlsForRender(true);

    util.toogleButton(ui.btnHighlightPkg);
    const highlight = util.isToogleButtonPressed(ui.btnHighlightPkg);
    if (highlight) {
        // hihglight acabou de ser ativado
        // reprocessa TODO o log 
        // renderizando com highlight nos pacotes encontradas
        processLogChunkAndRender("set", getRawLog(), { highlight });
    }
    else {
        // highlight acabou de ser desativado, 
        // renderiza TODO o texto bruto de volta no logBox
        writeLogBox("set", "text", getRawLog());
        setLogBoxPendingPacket("");
    }
    
    if(highlight) {
        // analise de pacote ativada, libera o seletor de mensagem
        util.setVisible(ui.selListMessageContainer, true);
    } else {
        // analise de pacote inativa, bloquea o uso do seletor de mensagens
        util.setVisible(ui.selListMessageContainer, false);
        ui.selListMessage.selectedIndex = 0;
        hideListMessagePane();
        hideAllListMessageOptions();
    }

    disableControlsForRender(false);
});


ui.selListMessage.addEventListener("change", () => {
    disableControlsForRender(true);

    const searchMsgID = ui.selListMessage.value;
    if (searchMsgID !== "none") {
        // um ID de mensagem acabou de ser selecionado,
        // reprocessa TODO o log 
        // renderizando as mensagens do ID selecionado na tabela
        ui.selListMessage.classList.add("is-selected");
        processLogChunkAndRender("set", getRawLog(), { searchMsgID });
        setSplitterPaneVisible(ui.mainSplitter, 2, true);
    } else {
        // pesquisa de mensagem acabou de ser desativada
        // esconde painel de mensagens e limpa tabela
        hideListMessagePane();
    }

    disableControlsForRender(false);
});

ui.btnStatistics.addEventListener("click", () => {
    let contentHtml = "";
    if (util.isToogleButtonPressed(ui.btnHighlightPkg)) {
        const sorted = [...hlMessagesCountStatistics]
            .sort((a, b) => a.count - b.count); //contagem descrescente
            //.sort((a, b) => b.count - a.count); //contagem crescente
        
        if(sorted) {
            contentHtml = sorted.map(m => `
                <div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span>${m.description}</span>
                    <strong>${m.count}</strong>
                </div>
            `).join("");
        } else {
            contentHtml = "<div>Nenhuma mensagem registrada</div>";
        }
    } else {
        contentHtml = `
        <div> Botão   
            <button class='toogle-btn'>
                <span class='toogle-btn-icon'>▦</span>
            </button>
            deve estar ativo.
        </div>`
    }
      
    getModal().open({
        title: "Estatísticas",
        bodyHtml: `
<div>
    <div style="padding-bottom: 16px;">
        Contagem de Mensagens
    </div>
     ${contentHtml}
<div>`
    });
});

ui.btnPkgConfig.addEventListener("click", () => {

    const ignoreAck = readPkgAnalyzeConfig("ignoreAck") === "1";
    const ignoreKeepAlive = readPkgAnalyzeConfig("ignoreKeepAlive") === "1";

    getModal().open({
        title: "Configurações",
        bodyHtml: `
<div>
    <div style="padding-bottom: 16px;">
        Análise de Pacotes
    </div>
    <label>
        <input id="cbIgnoreAck" type="checkbox" ${ignoreAck ? "checked" : ""}>
        Ignora Pacote que só tem ACK (message ID 0xFFFF)
    </label>
    <br>
    <label>
        <input id="cbIgnoreKeepAlive" type="checkbox" ${ignoreKeepAlive ? "checked" : ""}>
        Ignora Pacote que só tem KEEP-ALIVE (message ID 0x0000)
    </label>
<div>`
    });

    const modalBody = document.getElementById("modalBody");
    /** @type {HTMLInputElement} */
    const cbIgnoreAck = modalBody.querySelector("#cbIgnoreAck");
    /** @type {HTMLInputElement} */
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
    if (!(e.target instanceof HTMLElement)) return;
    if (e.target.classList.contains('hl-pkg-err')) return;

    const pkgClassName = e.target.classList[0];
    if (!pkgClassName.startsWith("pkg-")) return;

    let frameStr = getHexFromHighlightPackageClass(pkgClassName);
    const isIncommingPkg = e.target.classList.contains("hl-pkg-incomming");
    const { parseOk, rows, messages } = parsePackage(util.hexToBuffer(frameStr), isIncommingPkg, "collect", "nsv", "v");

    if (!parseOk) return;

    // Cria tabela do pacote
    const pkgClassIndex = pkgClassName.replace("pkg-", "");
    showParsedPackageOnTable(["Name", "Size", "Value"], rows, pkgClassIndex);

    // Parsea e cria tabela da ultima mensagem clicada
    if (messages.length > 0) {
        for (const msg of messages) {
            if (msg.id === lastMessageIdClicked) {
                const { isImplemented, rows } = parseMessage(
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
    ui.parsedMessageTable.innerHTML = "O pacote atual não possui essa mensagem.";
});

ui.parsedPackageTable.addEventListener("click", (e) => {
    try {
        if (!(e.target instanceof HTMLElement)) return;

        const tr = e.target.closest("tr");
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
        const { isImplemented, rows } = parseMessage(
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

ui.listMessageTable.addEventListener("click", (e) => {
    if (!(e.target instanceof HTMLElement)) return;

    const tr = e.target.closest("tr");
    if (!tr) return;

    // se tiver <thead>, evita clicar no header
    if (tr.closest("thead")) return;

    const tds = Array.from(tr.cells);
    if (tds.length < 1) return;

    const pkgClassIndex = tds[0].textContent.trim();
    if (Number.isNaN(pkgClassIndex)) return;    

    // remove seleção da row anterior
    const prevSelected = ui.listMessageTable.querySelector("tbody tr.is-selected");
    if (prevSelected) {
        prevSelected.classList.remove("is-selected");
    }

    // adiciona estilo de selecao na row atual
    tr.classList.add("is-selected");

    scrollToHighlightedPackage(Number(pkgClassIndex));
})