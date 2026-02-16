import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import { clearPkgCounters, detectPackages, tailSplitWithPendingPkg } from "./viewer-package-parser.js";
import { setSplitterPaneVisible } from "./split-pane.js";

let rawTextLog = "";

/**
 * Seta o conteudo bruto do log em memoria para uso futuro.
 * 
 * Util para quando precisa alternar o conteudo entre texto puro ou texto com HTML.
 * @param {string} rawText 
 */
export function setRawLog(rawText) {
    rawTextLog = rawText;
}

/**
 * Retorna o conteudo bruto do log em memoria.
 * 
 * Util para quando precisa alternar o conteudo entre texto puro ou texto com HTML.
 * @returns {string} rawText
 */
export function getRawLog() {
    return rawTextLog;
}

/**
 * Limpa o conteudo bruto do log em memoria.
 */
export function clearRawLog() {
    setRawLog("");
}

/**
 * Limpa o conteudo do logBox (área visível do log).
 */
export function clearLogBox() {
    writeLogBox("set", "html", "Carregando...");
    setLogBoxPendingPacket("");
}

/**
 * Escreve no logBox (área visível do log).
 * 
 * Aceita conteudo em texto puro ou HTML.
 * @param {"set" | "append"} mode
 * @param {"text" | "html"} type
 * @param {string} content
 * @param {boolean} [isPendingPkgContent=false] se true, escreve na parte do log reservada p/ texto pendente de pacote
 */
export function writeLogBox(mode, type, content, isPendingPkgContent = false) {
    const el = isPendingPkgContent ? ui.logPendingPacketContent : ui.logContent;

    if(mode === "set") 
    {
        if(type === "text")
            el.textContent = content;
        else if(type === "html") // html - lento demais se for muito grande o conteudo
            el.innerHTML = content;
    }
    else if(mode === "append")
    {
        if(type === "text")
            el.insertAdjacentText("beforeend", content);
        else if(type === "html")
            el.insertAdjacentHTML("beforeend", content);
    }

    // scroll LogBox to bottom if needed
    if (util.isToogleButtonPressed(ui.btnAutoScroll))
        ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

/**
 * Seta o conteudo pendente de completar um pacote no logBox (área visível do log).
 * @param {string} content
 */
export function setLogBoxPendingPacket(content) {
    writeLogBox("set", "text", content, true);
}

/**
 * Recupera o conteudo pendente de completar um pacote no logBox (área visível do log).
 * @returns {string}
 */
export function getLogBoxPendingPacket() {
    return ui.logPendingPacketContent.textContent;
}

/**
 * Processa um pedaço (chunk) do log, para:
 * - renderizar o log com highlight de pacotes (se solicitado)
 * - renderizar na tabela de mensagens, as mensagens encontradas de um ID específico (se solicitado) 
 *
 * @param {"set" | "append"} mode
 * @param {string} textContent
 * @param {{
 *   highlight?: boolean,
 *   searchMsgID?: string,      // se definido, preenche tabela
 * }} opts
 */
export function processLogChunkAndRender(mode, textContent, opts = { highlight: false, searchMsgID: null }) {
    if(mode === "set") {
        clearPkgCounters();
        if(opts.highlight) {
            clearLogBox();
        }
    }
    
    // separa o texto bruto em parte segura + parte pendente (pacote incompleto)
    // onde a parte pendente é o TAIL do texto que pode ter terminado com um pacote incompleto
    // essa parte pendente fica armazenada no logBox para uso futuro aguardando o pacote completar,
    // ja a parte segura contem pacotes completos que podem ser processados.
    const { safeText, pendingText } =
        tailSplitWithPendingPkg(getLogBoxPendingPacket(), textContent);

    if (safeText && safeText.length > 0) {
        // escapa HTML 
        const escaped = util.escapeHtml(safeText);

        // detecta os pacotes no texto, retornando:
        // - HTML com highlight (se solicitado)
        // - lista de mensagens de um determinado ID (se solicitado)
        const parsed = detectPackages(escaped, {
            highlight: opts.highlight,
            searchMsgID: opts.searchMsgID
        });

        // renderiza no logBox (área visível do log) o texto com highlight dos pacotes (se solicitado)
        if (opts.highlight) {
            writeLogBox(mode, "html", parsed.htmlWithPackagesHighlight);
        }

        // renderiza todas as mensagens encontradas do ID solicitado, na tabela de mensagens
        if (opts.searchMsgID && opts.searchMsgID !== "none") {
            // mesmo se vier mode "append", forçamos criacao se tabela não tem tHead
            if (mode === "set" || ui.listMessageTable.tHead === null)
                util.Table.Create(ui.listMessageTable, parsed.messageDataTable.headers, parsed.messageDataTable.rows);
            else if (mode === "append") 
                util.Table.AddRows(ui.listMessageTable, parsed.messageDataTable.rows);

            // se o auto-scroll estiver ligado, rola a tabela de mensagens para o final
            if (util.isToogleButtonPressed(ui.btnAutoScroll)) {
                ui.listMessageContainer.scrollTop = ui.listMessageContainer.scrollHeight;
            }
        }
    }

    // atualiza pending do logBox (área visível do log) com o texto pendente de completar um pacote
    setLogBoxPendingPacket(pendingText || "");
}

/** Desabilita ou habilita alguns controles em operações que podem demorar
 *  para evitar que o usuário tente interagir enquanto a operação está em andamento. */
export function disableControlsForRender(disable) {
    if (ui.btnPickLocalFile)
        ui.btnPickLocalFile.disabled = disable;

    ui.btnTailAutoRefresh.disabled = disable;
    ui.btnHighlightPkg.disabled = disable;
    ui.selListMessage.disabled = disable;
}