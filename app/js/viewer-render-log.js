import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";

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
 * @param {boolean} [isPendingCC33Content=false] se true, escreve na parte do log reservada p/ texto pendente de pacote (CC33)
 */
export function writeLogBox(mode, type, content, isPendingCC33Content = false) {
    const el = isPendingCC33Content ? ui.logPendingPacketContent : ui.logContent;

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

    scrollLogBoxToBottomIfNeeded();
}

/**
 * Seta o conteudo pendente de completar um pacote CC33 no logBox (área visível do log).
 * @param {string} content
 */
export function setLogBoxPendingPacket(content) {
    writeLogBox("set", "text", content, true);
}

/**
 * Recupera o conteudo pendente de completar um pacote CC33 no logBox (área visível do log).
 * @returns {string}
 */
export function getLogBoxPendingPacket() {
    return ui.logPendingPacketContent.textContent;
}

function scrollLogBoxToBottomIfNeeded() {
    if (util.isToogleButtonPressed(ui.btnAutoScroll))
        ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

