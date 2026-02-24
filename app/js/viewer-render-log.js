// @ts-ignore
import { util } from "./utils.js?v=__PLACEHOLDER_BUILD_VERSION__";
// @ts-ignore
import { ui } from "./viewer-ui-elements.js?v=__PLACEHOLDER_BUILD_VERSION__";
// @ts-ignore
import { clearPkgInfo, detectPackages, tailSplitWithPendingPkg } from "./viewer-package-parser.js?v=__PLACEHOLDER_BUILD_VERSION__";
// @ts-ignore
import { virtualTextBox } from "./viewer-ui-events.js?v=__PLACEHOLDER_BUILD_VERSION__";

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
        clearPkgInfo();
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
        tailSplitWithPendingPkg(getPendingHtmlText(), chunk);

    // atualiza texto pendente
    setPendingHtmlText(pendingText);

    // checa se tem texto seguro pra processar pacotes
    if (safeText && safeText.length > 0) {
        // detecta os pacotes no texto, retornando:
        // - HTML, com highlight (se solicitado)
        // - lista de mensagens de um determinado ID (se solicitado)
        const parsed = detectPackages(safeText, {
            highlight: opts.highlight,
            searchMsgID: opts.searchMsgID
        });

        appendSafeHtmlText(parsed.htmlWithPackagesHighlight);

        // renderiza todas as mensagens encontradas do ID solicitado, na tabela de mensagens
        if (opts.searchMsgID && opts.searchMsgID !== "none") {
            // mesmo se vier mode "append", forçamos criacao se tabela não tem tHead
            if (mode === "set" || ui.listMessageTable.tHead === null)
                util.Table.Create(
                    ui.listMessageTable,
                    parsed.messageDataTable.headers,
                    parsed.messageDataTable.rows,
                    { sortColumnIndex: 1, sortDirection: "asc", numeric: true } // ordena pelo timestamp de criação do pacote
                );
            else if (mode === "append")
                util.Table.AddRows(
                    ui.listMessageTable,
                    parsed.messageDataTable.rows,
                    { sortColumnIndex: 1, sortDirection: "asc", numeric: true } // ordena pelo timestamp de criação do pacote
                );

            // se o auto-scroll estiver ligado, rola a tabela de mensagens para o final
            if (util.isToogleButtonPressed(ui.btnAutoScroll)) {
                ui.listMessageContainer.scrollTop = ui.listMessageContainer.scrollHeight;
            }
        }
    }

    // se foi solicitado pra destacar os pacotes processados, renderiza o log
    if (opts.highlight) {
        virtualTextBox.setHtmlText(getLogHtmlTextWrapper());
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