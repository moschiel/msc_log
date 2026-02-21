import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import { clearPkgInfo, detectPackages, tailSplitWithPendingPkg } from "./viewer-package-parser.js";
import { setSplitterPaneVisible } from "./split-pane.js";

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
 * Limpa o conteudo do virtualLog.
 */
export function clearVirtualLog() {
    // virtualLog.setHtmlText(""); to maluco já
    clearHtmlTextMemory();
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
// export function writeLogBox(mode, type, content, isPendingPkgContent = false) {
//     const el = isPendingPkgContent ? ui.logPendingPacketContent : ui.logContent;

//     if (mode === "set") {
//         if (type === "text")
//             el.textContent = content;
//         else if (type === "html") // html - lento demais se for muito grande o conteudo
//             el.innerHTML = content;
//     }
//     else if (mode === "append") {
//         if (type === "text")
//             el.insertAdjacentText("beforeend", content);
//         else if (type === "html")
//             el.insertAdjacentHTML("beforeend", content);
//     }

//     // scroll LogBox to bottom if needed
//     if (util.isToogleButtonPressed(ui.btnAutoScroll))
//         ui.logBox.scrollTop = ui.logBox.scrollHeight;
// }

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
        // escapa HTML 
        const escaped = util.escapeHtml(safeText);

        // detecta os pacotes no texto, retornando:
        // - HTML com highlight (se solicitado)
        // - lista de mensagens de um determinado ID (se solicitado)
        const parsed = detectPackages(escaped, {
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
        virtualLog.setHtmlText(getLogHtmlTextWrapper());
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



/**
 *
 * @typedef {( newHtmlText: string ) => void } FuncSetHtmlText
 * @typedef {( moreHtmlText: string ) => void } FuncAppendHtmlText
 * 
 * @typedef {Object} VirtualLog
 * @property {FuncSetHtmlText} setHtmlText
 * @property {FuncAppendHtmlText} appendHtmlText
 * @property {() => void} rerender
 * @property {() => void} destroy
 * @property {(lineIndex: number, opts?: {center: boolean}) => void} scrollToLine
 */

/** @type {VirtualLog} */
export let virtualLog;

/**
 * Inicializa um virtualizador de log baseado em altura fixa por linha.
 * Mantém apenas as linhas visíveis (com overscan) no DOM,
 * enquanto simula a altura total usando um spacer.
 *
 * ⚠️ Requisitos:
 * - O contentEl deve usar `white-space: pre`
 * - A altura real da linha deve bater com `lineHeight`
 *
 * @param {Object} params
 * @param {HTMLElement} params.viewportEl Elemento que possui scroll (overflow:auto)
 * @param {HTMLElement} params.spacerEl Elemento que simula a altura total do conteúdo
 * @param {HTMLElement} params.contentEl Elemento onde as linhas visíveis serão renderizadas
 * @param {string[]} params.linesHtml Array de linhas já prontas em HTML (cada item = 1 linha)
 * @param {number} [params.lineHeight=18] Altura fixa de cada linha em pixels
 * @param {number} [params.overscan=200] Número de linhas extras renderizadas acima/abaixo do viewport
 *
 * @returns {void}
 */
export function initVirtualLog({
    viewportEl,
    spacerEl,
    contentEl,
    linesHtml,
    lineHeight = 14,
    overscan = 200,
}) {
    const state = {
        linesHtml,
        lineHeight,
        linesTotal: 0,
        overscan,
        lastStart: -1,
        lastEnd: -1,
        rafPending: false,
    };

    /**
     * Garante que um valor fique dentro de um intervalo.
     * @param {number} n
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }

    /**
     * Calcula o range de linhas que devem estar visíveis no DOM.
     * @returns {{ start: number, end: number }}
     */
    function computeRange() {
        const total = state.linesHtml.length;
        const scrollTop = viewportEl.scrollTop;
        const viewportH = viewportEl.clientHeight;

        const firstVisible = Math.floor(scrollTop / state.lineHeight);
        const visibleCount = Math.ceil(viewportH / state.lineHeight);

        const start = clamp(firstVisible - state.overscan, 0, total);
        const end = clamp(firstVisible + visibleCount + state.overscan, 0, total);

        return { start, end };
    }

    /**
     * Renderiza imediatamente o range visível.
     */
    function renderNow() {
        state.rafPending = false;

        const { start, end } = computeRange();
        if (start === state.lastStart && end === state.lastEnd) return;

        state.lastStart = start;
        state.lastEnd = end;

        contentEl.style.transform = `translateY(${start * state.lineHeight}px)`;
        contentEl.innerHTML = state.linesHtml.slice(start, end).join("\n");
    }

    /**
     * Agenda renderização no próximo frame.
     */
    function scheduleRender() {
        if (state.rafPending) return;
        state.rafPending = true;
        requestAnimationFrame(renderNow);
    }

    /**
     * Substitui completamente o conteúdo do log.
     *
     * @type {FuncSetHtmlText}
     */
    function setHtmlText(newHtmlText) {
        const oldScrollTop = viewportEl.scrollTop;

        state.linesHtml = util.splitLines(newHtmlText);

        const newMaxHeight = state.linesHtml.length * state.lineHeight;
        spacerEl.style.height = newMaxHeight + "px";

        state.lastStart = state.lastEnd = -1;

        const maxScrollTop = Math.max(0, newMaxHeight - viewportEl.clientHeight);

        if (util.isToogleButtonPressed(ui.btnAutoScroll)) {
            // Vai pro final
            viewportEl.scrollTop = maxScrollTop;
        } else {
            // Mantém posição se ainda válida
            viewportEl.scrollTop =
                oldScrollTop > maxScrollTop ? 0 : oldScrollTop;
        }

        renderNow();
    }

    /**
     * Acrescenta conteúdo ao final do log a partir de um HTML/texto delta.
     * Não altera o scroll atual.
     *
     * @type {FuncAppendHtmlText}
     */
    function appendHtmlText(moreHtmlText) {
        if (!moreHtmlText) return;

        const moreLines = util.splitLines(moreHtmlText);
        if (!moreLines || moreLines.length === 0) return;

        for (let i = 0; i < moreLines.length; i++) {
            state.linesHtml.push(moreLines[i]);
        }

        spacerEl.style.height = (state.linesHtml.length * state.lineHeight) + "px";
        state.lastStart = state.lastEnd = -1;
        renderNow();
    }

    viewportEl.addEventListener("scroll", scheduleRender, { passive: true });

    // Re-render quando o viewport for redimensionado (ex: splitter)
    const ro = new ResizeObserver(() => scheduleRender());
    ro.observe(viewportEl);

    // Init
    spacerEl.style.height =
        state.linesHtml.length * state.lineHeight + "px";
    renderNow();

    virtualLog = {
        setHtmlText,
        appendHtmlText,

        /**
         * Força re-render completo do range atual.
         */
        rerender() {
            state.lastStart = state.lastEnd = -1;
            renderNow();
        },

        /**
         * Remove listeners e observers.
         */
        destroy() {
            ro.disconnect();
            viewportEl.removeEventListener("scroll", scheduleRender);
        },

        /**
         * Faz scroll programático até uma linha específica.
         * @param {number} lineIndex
         * @param {{ center?: boolean }} [opts]
         */
        scrollToLine(lineIndex, opts = {}) {
            const total = state.linesHtml.length;

            const idx = clamp(
                lineIndex,
                0,
                Math.max(0, total - 1)
            );

            const lineTopPx = idx * state.lineHeight;

            let targetScrollTop = lineTopPx;

            if (opts.center) {
                const viewportHeight = viewportEl.clientHeight;
                targetScrollTop =
                    lineTopPx
                    - (viewportHeight / 2)
                    + (state.lineHeight / 2);
            }

            const maxScrollTop = Math.max(
                0,
                state.linesHtml.length * state.lineHeight - viewportEl.clientHeight
            );

            viewportEl.scrollTop = clamp(targetScrollTop, 0, maxScrollTop);

            scheduleRender();
        },
    };
}