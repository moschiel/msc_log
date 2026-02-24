// =============================
// Find Bar Controller
// =============================

/**
 * @typedef {{
 * open: () => void,
 * close: () => void,
 * currentQuery: () => string,  
 * runSearch: () => void
 * }} FindBar
 */


/**
 * @param {Object} opts
 * @param {string} opts.findBarId Id do finder bar
 * @param {string} opts.btnOpenId Id do botao que abre o FindBar
 * @param {() => string} opts.getFullText callback para requisitar o texto completo
 * @param {(lineIndex: number) => void} opts.gotoLine callback para scrollar para a linha
 * @param {() => void} opts.onClearSearch
 *  
 * @returns {FindBar}
 */
export function initFindBar({
    findBarId,
    btnOpenId, 
    getFullText, 
    gotoLine,
    onClearSearch           
    //renderHighlights, // (matches, activeIndex) => void  -> aplica highlight no viewport
}) {
    const bar = /** @type {HTMLDivElement} */ (
        document.getElementById(findBarId)
    );

    const findBarUi = {
        bar,
        btnOpen: /** @type {HTMLButtonElement} */ (
            document.getElementById(btnOpenId)
        ),
        input: /** @type {HTMLInputElement} */ (
            bar.querySelector(".findbar-input")
        ),
        count: /** @type {HTMLDivElement} */ (
            bar.querySelector(".findbar-count")
        ),
        btnPrev: /** @type {HTMLButtonElement} */ (
            bar.querySelector(".findbar-prev")
        ),
        btnNext: /** @type {HTMLButtonElement} */ (
            bar.querySelector(".findbar-next")
        ),
        btnClose: /** @type {HTMLButtonElement} */ (
            bar.querySelector(".findbar-close")
        ),
    };

    const state = {
        query: "",
        /** @type {{lineIndex: number, start: number, end: number }[]} */
        matches: [],
        activeIndex: -1,
        debounceTimer: null,
    };

    // =============================
    // OPEN / CLOSE
    // =============================

    function open() {
        findBarUi.bar.classList.add("is-open");
        findBarUi.bar.setAttribute("aria-hidden", "false");
        findBarUi.input.focus();
        findBarUi.input.select();
    }

    function close() {
        // move o foco para algo visível (ex: o botão da lupa)
        findBarUi.btnOpen?.focus();  // ideal

        findBarUi.bar.classList.remove("is-open");
        findBarUi.bar.setAttribute("aria-hidden", "true");
        
        state.matches = [];
        state.activeIndex = -1;
        updateCount();

        onClearSearch();
        //renderHighlights([], -1);
    }

    function currentQuery() {
        return state.activeIndex != -1 ? state.query : "";
    }

    // =============================
    // SEARCH ENGINE
    // =============================

    function findAllMatches(text, query) {
        if (!query) return [];

        const matches = [];
        const lines = text.split(/\r?\n/);

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            let searchIndex = 0;

            while (true) {
                const found = line.indexOf(query, searchIndex);
                if (found === -1) break;

                matches.push({
                    lineIndex,
                    start: found,
                    end: found + query.length
                });

                searchIndex = found + Math.max(1, query.length);
            }
        }

        return matches;
    }

    function runSearch() {
        const fullText = getFullText();
        const previousQuery = state.query;
        state.query = findBarUi.input.value.trim();
        state.matches = findAllMatches(fullText, state.query);
        state.activeIndex = state.matches.length ? 0 : -1;

        updateCount();

        //renderHighlights(state.matches, state.activeIndex);
        if (state.activeIndex !== -1)   
            gotoLine(state.matches[state.activeIndex].lineIndex);
        else if (previousQuery.length > 0 && state.query.length === 0)
            onClearSearch();  //se acabou de limpar a pesquisa, notifica
    }

    function scheduleSearch() {
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }
        state.debounceTimer = setTimeout(runSearch, 200);
    }

    // =============================
    // NAVIGATION
    // =============================

    function gotoMatch(index) {
        if (!state.matches.length) return;

        const total = state.matches.length;
        const i = ((index % total) + total) % total;

        state.activeIndex = i;

        updateCount();
        //renderHighlights(state.matches, state.activeIndex);

        gotoLine(state.matches[i].lineIndex);
    }

    function updateCount() {
        const total = state.matches.length;
        if (!total) {
            findBarUi.count.textContent = "0/0";
            return;
        }
        findBarUi.count.textContent = `${state.activeIndex + 1}/${total}`;
    }

    // =============================
    // EVENTS
    // =============================

    findBarUi.input.addEventListener("input", scheduleSearch);

    findBarUi.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) gotoMatch(state.activeIndex - 1);
            else gotoMatch(state.activeIndex + 1);
        }

        if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    });

    window.addEventListener("keydown", (e) => {
        // Ctrl+Shift+F
        if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
            e.preventDefault();      // impede ações do browser
            e.stopPropagation();
            open();          // abre findbar
        }
    });


    findBarUi.btnOpen.addEventListener("click", open);
    findBarUi.btnClose.addEventListener("click", close);
    findBarUi.btnNext.addEventListener("click", () => gotoMatch(state.activeIndex + 1));
    findBarUi.btnPrev.addEventListener("click", () => gotoMatch(state.activeIndex - 1));

    // Expor API se quiser controlar externamente
    return {
        open,
        close,
        currentQuery,
        runSearch,
    };
}