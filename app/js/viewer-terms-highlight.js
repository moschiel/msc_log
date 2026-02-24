// @ts-ignore
import { findBar } from "./viewer-ui-events.js?v=__PLACEHOLDER_BUILD_VERSION__";

/**
 * Recebe text, 
 * retorna conteudo HTML com highlight no termo pesquisado
 * 
 * @param {string} html html before render
 * @returns {string} new html before render
 */
export function highlightFindBarTerm(html) {
    const query = findBar.currentQuery();
    if(!query || query === "")
        return html;
    return html.replaceAll(query, `<span class="find-hit">${query}</span>`);
}