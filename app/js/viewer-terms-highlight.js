// @ts-ignore
import { configs, saveConfigs } from "./configs.js?v=__PLACEHOLDER_BUILD_VERSION__";
// @ts-ignore
import { util } from "./utils.js?v=__PLACEHOLDER_BUILD_VERSION__";
// @ts-ignore
import { findBar } from "./viewer-ui-events.js?v=__PLACEHOLDER_BUILD_VERSION__";

export function htmlTermsConfigurator() {
    return `
<section>
  <div style="padding-bottom: 16px;">
        Marcadores
  </div>
  <ul class="hlterm-list">
    ${configs.terms.map((t) => `
    <li class="hl-item">
        <input type="text" value="${t.text}" class="term-input" placeholder="escrever termo ..." />
        <input type="color" value="${t.color}" class="color-input" />
        <label>
            <input type="checkbox" ${t.active ? "checked" : ""} />
        </label>
    </li>
    `).join("")}
  </ul>
</section>`;
}

export function initTermsConfiguratorListener() {
    const list = document.querySelector(".hlterm-list");
    list.addEventListener("change", () => {
        const items = list.querySelectorAll(".hl-item");

        configs.terms = Array.from(items).map(li => {
            /** @type {HTMLInputElement} */
            const termInput = li.querySelector(".term-input");
            /** @type {HTMLInputElement} */
            const colorInput = li.querySelector(".color-input");
            /** @type {HTMLInputElement} */
            const checkbox = li.querySelector('input[type="checkbox"]');
            return {
                text: termInput.value,
                color: colorInput.value,
                active: checkbox.checked
            };
        });

        saveConfigs();
    });
}

/**
 * Recebe text, 
 * retorna conteudo HTML com highlight do termo configurado
 * 
 * @param {string} html html before render
 * @returns {string} new html before render
 */
export function highlightConfiguredTerms(html) {
    // tento ordenar de forma que termos menores consigam aparecer dentro de maiores
    const orderedTerms = [...configs.terms].sort((a, b) => b.text.length - a.text.length);
    for (const term of orderedTerms) {
        if (term.active && term.text.trim().length > 0) {
            const regex = new RegExp(util.escapeRegex(term.text), "gi"); //case insensitive
            html = html.replace(regex, (match) => {
                return `<span style="background: ${term.color};">${match}</span>`;
            });
        }
    }

    return html;
}

/**
 * Recebe text, 
 * retorna conteudo HTML com highlight no termo pesquisado
 * 
 * @param {string} html html before render
 * @returns {string} new html before render
 */
export function highlightFindBarTerm(html) {
    const query = findBar.currentQuery().trim();
    if (!query || query === "")
        return html;

    const regex = new RegExp(util.escapeRegex(query), "gi"); //case insensitive
    return html.replace(regex, (match) => {
        return  `<span class="find-hit">${match}</span>`;
    });
}