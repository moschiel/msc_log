
// @ts-ignore
import { util } from "./utils.js?v=__PLACEHOLDER_BUILD_VERSION__";
// @ts-ignore
import { ui } from "./viewer-ui-elements.js?v=__PLACEHOLDER_BUILD_VERSION__";


/**
 *
 * @typedef {( newHtmlText: string ) => void } FuncSetHtmlText
 * @typedef {( moreHtmlText: string ) => void } FuncAppendHtmlText
 * @typedef {(
 * lineIndex: number, 
 * opts?: {
 *  center?: boolean, 
 *  behavior?: "instant" | "smooth",
 *  afterRender?: () => void
 *  }) => void 
 * } FuncScrollToLine
 * @typedef {(htmlBeforeRender: string) => string} FuncBeforeRenderHandler
 * @typedef {(handler: FuncBeforeRenderHandler) => void} FuncOnBeforeRender
 * @typedef {() => void} FuncAfterRenderHandler
 * @typedef {(handler: FuncAfterRenderHandler) => () => void} FuncOnAfterRender
 * 
 * @typedef {Object} VirtualTextBox
 * @property {FuncSetHtmlText} setHtmlText
 * @property {FuncAppendHtmlText} appendHtmlText
 * @property {FuncScrollToLine} scrollToLine
 * @property {FuncOnAfterRender} onAfterRender
 * @property {() => void} rerender
 * @property {() => void} destroy
 */

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
 * @param {string[]} params.linesHtml Array de linhas já prontas em HTML (cada item = 1 linha)
 * @param {number} [params.lineHeight=18] Altura fixa de cada linha em pixels
 * @param {number} [params.overscan=200] Número de linhas extras renderizadas acima/abaixo do viewport
 * @param {FuncBeforeRenderHandler[]} [params.beforeRenderHandlers=[]] callbacks persistentes antes de renderizar HTML
 * @param {FuncAfterRenderHandler[]} [params.afterRenderHandlers=[]] callbacks persistentes depois de renderizar HTML
 
* @returns {VirtualTextBox}
 */
export function initVirtualTextBox({
    viewportEl,
    linesHtml,
    lineHeight = 14,
    overscan = 200,
    beforeRenderHandlers,
    afterRenderHandlers
}) {
    // Elemento que simula a altura total do conteúdo
    /** @type {HTMLElement} */
    const spacerEl = viewportEl.querySelector(".text-box-spacer");
    // Elemento onde as linhas visíveis serão renderizadas
    /** @type {HTMLElement} */
    const contentEl = viewportEl.querySelector(".text-box-content");

    const state = {
        linesHtml,
        lineHeight,
        linesTotal: 0,
        overscan,
        lastStart: -1,
        lastEnd: -1,
        rafPending: false,
        beforeRenderHandlers,
        afterRenderHandlers, 
        afterRenderQueue: [] // one-shot callbacks depois de renderizar HTML
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

        // @ts-ignore
        const rangeChanged =
            start !== state.lastStart ||
            end !== state.lastEnd;

        // descomentar "if" abaixo se quiser atualizar apenas se mudar range do scroll
        //if (rangeChanged) {
            state.lastStart = start;
            state.lastEnd = end;

            contentEl.style.transform = `translateY(${start * state.lineHeight}px)`;

            let htmlToRender = state.linesHtml.slice(start, end).join("\n");

            // Handlers persistentes before HTML render
            for (let i = 0; i < state.beforeRenderHandlers.length; i++) {
                const fn = state.beforeRenderHandlers[i];
                try { htmlToRender = fn(htmlToRender); }
                catch (e) { console.error(e); }
            }

            // Finalmente, renderiza innerHTML
            contentEl.innerHTML = htmlToRender;
        //} //

        // Handlers persistentes after HTML render
        for (let i = 0; i < state.afterRenderHandlers.length; i++) {
            const fn = state.afterRenderHandlers[i];
            try { fn(); }
            catch (e) { console.error(e); }
        }

        // Callbacks one-shot after HTML render
        while (state.afterRenderQueue.length) {
            const fn = state.afterRenderQueue.shift();
            try { fn(); }
            catch (e) { console.error(e); }
        }
    }

    /**
     * Agenda a renderização do log virtualizado para o próximo frame
     * usando `requestAnimationFrame`.
     *
     * Se um callback `afterRender` for fornecido, ele será executado
     * após o DOM ter sido atualizado (ou confirmado) pelo ciclo de render.
     *
     * Se já houver uma renderização pendente, o callback será apenas
     * enfileirado e executado após o próximo render.
     *
     * @remarks
     * Esta função não força renderização imediata; ela apenas garante
     * que `renderNow()` será executado no próximo frame, evitando
     * múltiplas renderizações redundantes durante scroll rápido.

     * @param {() => void} [afterRender] Função opcional executada após a renderização.
     */
    function scheduleRender(afterRender) {
        if (afterRender)
            state.afterRenderQueue.push(afterRender);

        if (state.rafPending)
            return;

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

    /**
     * Registra um callback que será chamado após toda renderização do log virtualizado.
     * Retorna uma função para remover o handler.
     *
     * @type {FuncOnAfterRender}
     */
    function onAfterRender(handler) {
        state.afterRenderHandlers.push(handler);
        return () => {
            const idx = state.afterRenderHandlers.indexOf(handler);
            if (idx >= 0) state.afterRenderHandlers.splice(idx, 1);
        };
    }

    /**
     * Faz scroll programático até uma linha específica do log virtualizado.
     *
     * Por padrão, a linha é posicionada no topo do viewport.
     * Se `opts.center` for verdadeiro, a linha será centralizada
     * verticalmente dentro da área visível.
     *
     * Opcionalmente, pode-se fornecer um callback `afterRender`,
     * que será executado após a virtualização atualizar o DOM.
     *
     * @type {FuncScrollToLine}
     */
    function scrollToLine(lineIndex, opts = { }) {
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

        // viewportEl.scrollTop = clamp(targetScrollTop, 0, maxScrollTop);
        viewportEl.scrollTo({
            top: clamp(targetScrollTop, 0, maxScrollTop),
            behavior: opts.behavior ? opts.behavior : "auto"
        });

        scheduleRender(opts.afterRender);
    }

    /**
     * Pra removeEventListener funcionar, tem que passar a mesma referência da função usada no addEventListener. 
     * Então não faça inline tipo: viewportEl.addEventListener("scroll", () => scheduleRender());
     * 
     * @param {Event} _ev
     */
    function onViewportScroll(_ev) {
        scheduleRender();
    }

    viewportEl.addEventListener("scroll", onViewportScroll, { passive: true });

    // Re-render quando o viewport for redimensionado (ex: splitter)
    const ro = new ResizeObserver(() => scheduleRender());
    ro.observe(viewportEl);

    // Init
    state.afterRenderHandlers = Array.isArray(afterRenderHandlers) ? afterRenderHandlers.slice() : [];
    spacerEl.style.height = state.linesHtml.length * state.lineHeight + "px";
    renderNow();

    return {
        setHtmlText,
        appendHtmlText,
        onAfterRender,
        scrollToLine,

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
            viewportEl.removeEventListener("scroll", onViewportScroll);
        },

    };
}