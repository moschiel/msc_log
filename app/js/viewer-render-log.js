import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import { virtualTextBox } from "./viewer-ui-events.js";
import { getTmEventOptionId, parseMessage, updateMessageCounterStatistics } from "./viewer-message-parser.js";
import { highlightPackageFrames, highlightPkgCreation } from "./viewer-package-highlight.js";
import { clearDetectedPkgInfo, detectPackages, DetectPkgCounter, detectPendingPackageSection, updatePackageCounterStatistics, detectPackagesCreation } from "./package-detector.js";
import { parsePackage } from "./viewer-package-parser.js";

let rawTextLog = "";
let safeHtmlLog = "";
let pendingTextLog = "";

/**
 * Seta o conteudo bruto do log em memoria para uso futuro.
 * 
 * Util para quando precisa alternar o conteudo entre texto puro ou texto com HTML.
 * @param {string} rawText 
 */
export function setRawLog(rawText) { rawTextLog = rawText; }
export function appendRawLog(rawText) { rawTextLog += rawText; }
export function getRawLog() { return rawTextLog; }

/**
 * Seta o conteudo seguro pra renderizar com HTML, onde todos os pacotes estao completos
 * @param {string} content
 */
export function setSafeHtmlText(content) { safeHtmlLog = content; }
export function appendSafeHtmlText(content) { safeHtmlLog += content; }
export function getSafeHtmlText() { return safeHtmlLog; }

/**
 * Seta o conteudo pendente de completar um pacote no logBox (área visível do log).
 * @param {string} content
 */
export function setPendingHtmlText(content) { pendingTextLog = content; }
export function appendPendingHtmlText(content) { pendingTextLog += content; }
export function getPendingHtmlText() { return pendingTextLog; }

function getPendingWrapper() { return `<span class="pending-content">${pendingTextLog}</span>`; }
export function getLogHtmlTextWrapper() { return getSafeHtmlText() + getPendingWrapper(); }

/** Limpa conteudo html em memória */
export function clearHtmlTextMemory() {
    setSafeHtmlText("");
    setPendingHtmlText("");
}

/**
 * Limpa o conteudo do log em memoria.
 */
export function clearLogMemory() {
    setRawLog("");
    clearHtmlTextMemory();
}

/**
 * Limpa o conteudo do virtualTextBox.
 */
export function clearVirtualLog() {
    // virtualTextBox.setHtmlText(""); to maluco já
    clearHtmlTextMemory();
}

/**
 * Processa um pedaço (chunk) do log, para:
 * - renderizar o log
 * - renderização do log deve ter highlight de pacotes (se solicitado)
 * - renderizar na tabela de mensagens, as mensagens encontradas de um ID específico (se solicitado) 
 *
 * @param {"set" | "append"} mode
 * @param {string} chunk
 * @param {{
 *   highlight?: boolean,
 *   searchMsgID?: string,      // se definido, preenche tabela
 * }} opts
 */
export function processLogChunkAndRender(mode, chunk, opts = { highlight: false, searchMsgID: null }) {
    if (mode === "set") {
        clearDetectedPkgInfo();
        if (opts.highlight) {
            // clearVirtualLog();
            clearHtmlTextMemory();
        }
    }

    // separa o texto bruto em parte segura + parte pendente (pacote incompleto)
    // onde a parte pendente é o TAIL do texto que pode ter terminado com um pacote incompleto
    // essa parte pendente fica armazenada separadamente para uso futuro aguardando o pacote completar,
    // ja a parte segura contem pacotes completos que podem ser processados.
    const { safeText, pendingText } =
        detectPendingPackageSection(getPendingHtmlText(), chunk);

    // atualiza texto pendente
    setPendingHtmlText(pendingText);

    // se tem texto seguro pra processar pacotes
    if (safeText && safeText.length > 0) {

        const lines = util.escapeHtml(safeText).split(/\r?\n/);
        let messageDataTable = { headers: [], rows: [] };
        detectPackagesCreation(lines, { highlight: opts?.highlight});
        const packages = detectPackages(lines);

        for (const pkg of packages) {
            const parsedPkg = parsePackage(pkg.bytes, pkg.state === "Incoming", opts?.searchMsgID === "all" ? "collect" : "validate", "h");
            
            // Atualiza view de estatisticas de pacotes
            const currPkgCount = updatePackageCounterStatistics(pkg.state);
            pkg.pkgIndex = currPkgCount;

            if (parsedPkg.parseOk) {
                for (const msg of parsedPkg.messages) {
                    // Atualiza view de estatisticas de mensagems
                    updateMessageCounterStatistics(msg.id, msg.id === 0x1402 ? msg.data[0] : null);
                    
                    // se usuário solicitou essa MENSGAGEM, coletamos os dados
                    const matchOptionID = msg.id === 0x1402 ? getTmEventOptionId(msg.data[0]) : String(msg.id);
                    if (opts?.searchMsgID === matchOptionID) {
                        const parsedMsg = parseMessage(msg.id, msg.data, "h");
                        if (parsedMsg.isImplemented) {
                            collectMessagesDataTable(messageDataTable, pkg, parsedMsg.items);
                        }
                    }
                }
            }
            
            // se usuario solicitou para listar TODOS os pacotes, coletamos os dados
            if (opts?.searchMsgID === "all") {
                collectMessagesDataTable(messageDataTable, pkg, parsedPkg.items);
            }
            
            if (opts.highlight) {
                highlightPackageFrames(currPkgCount, pkg.state, lines, pkg.lineIndexes);
            }
        }

        appendSafeHtmlText(opts.highlight ? lines.join("\n") : safeText);

        if (opts?.searchMsgID && opts.searchMsgID !== "none" && messageDataTable.rows.length > 0) {
            renderMessageDataTable(messageDataTable, mode);
        }
    }

    // se foi solicitado pra destacar os pacotes processados, renderiza o log
    if (opts.highlight) {
        virtualTextBox.setHtmlText(getLogHtmlTextWrapper(), {
            scrollToBottom: util.isLocalFile() === false && mode === "append" && util.isToogleButtonPressed(ui.btnAutoScroll)
        });
    }
}

/**
 * 
 * @param {{ headers: Array<string>, rows: Array<Array> }} messageDataTable 
 * @param {import("./package-detector.js").DetectedPackage} pkg
 * @param {import("./viewer-binary-reader.js").BinaryReaderItemsResult} items
 */
function collectMessagesDataTable(messageDataTable, pkg, items) {
    // Converte timestamp para 'human readable'
    const createdAtDate = pkg?.creation?.timestamp !== undefined ? util.epochSecondsToString(pkg.creation.timestamp) : "";
    const loggedAtDate = util.epochSecondsToString(pkg.pkgLoggedTimestamp);

    if (pkg.state === "Error") {
        const row = [
            pkg?.pkgIndex,
            pkg?.creation?.timestamp,
            createdAtDate,
            loggedAtDate,
            util.spanHintWrapper("🔴", "Pacote com Erro"),
            pkg?.creation?.ticket,
        ]
        messageDataTable.rows.push(row); // parameters values
    } else {
        if (messageDataTable.headers.length === 0) {
            // insere HEADERS referente ao PACKAGE
            const headers = [
                "#",
                "Created Timestamp",
                "Created At",
                "Sent/Recv At",
                "Type",
                "Ticket"
            ];
            // insere HEADERS com os parametros da MESSAGEM pesquisada
            for (const item of items) {
                headers.push(item.name);
            }
            messageDataTable.headers = headers;
        }

        // insere ROW com dados do PACKAGE
        const state = pkg.state === "Incoming" ? 
            util.spanHintWrapper("🔵", "Pacote Recebido") : 
                pkg.state === "Online" ? 
                    util.spanHintWrapper("🟢", "Pacote Enviado (ONLINE)") :
                        util.spanHintWrapper("⚪", "Pacote Enviado (OFFLINE)");

        const row = [
            pkg?.pkgIndex,
            pkg?.creation?.timestamp,
            createdAtDate,
            loggedAtDate,
            state,
            pkg?.creation?.ticket
        ];
        // insere ROW com dados da MENSAGEM parseada
        for (const item of items) {
            row.push(item.value); // parameters values
        }
        messageDataTable.rows.push(row);
    }
}


/**
 * Renderiza todas as mensagens encontradas do ID solicitado, na tabela de mensagens
 * 
 * @param {{ headers: Array<string>, rows: Array<Array> }} messageDataTable 
 * @param {"set" | "append"} mode
 */
function renderMessageDataTable(messageDataTable, mode) {
    // mesmo se vier mode "append", forçamos criacao se tabela não tem tHead
    if (mode === "set" || ui.listMessageTable.tHead === null)
        util.Table.Create(
            ui.listMessageTable,
            messageDataTable.headers,
            messageDataTable.rows,

            { sortColumnIndex: 1, sortDirection: "asc", numeric: true } // ordena pelo timestamp de criação do pacote
        );
    else if (mode === "append")
        util.Table.AddRows(
            ui.listMessageTable,
            messageDataTable.rows,
            { sortColumnIndex: 1, sortDirection: "asc", numeric: true } // ordena pelo timestamp de criação do pacote
        );

    // se o auto-scroll estiver ligado e for append, rola a tabela de mensagens para o final
    if (util.isLocalFile() === false && mode === "append" && util.isToogleButtonPressed(ui.btnAutoScroll)) {
        ui.listMessageContainer.scrollTop = ui.listMessageContainer.scrollHeight;
    }
}



/** Desabilita ou habilita alguns controles em operações que podem demorar
 *  para evitar que o usuário tente interagir enquanto a operação está em andamento. */
export function disableControlsWhileProcessing(disable) {
    if (util.isLocalFile())
        ui.btnPickLocalFile.disabled = disable;
    else
        ui.btnTailAutoRefresh.disabled = disable;

    ui.btnHighlightPkg.disabled = disable;
    ui.selListMessage.disabled = disable;
}