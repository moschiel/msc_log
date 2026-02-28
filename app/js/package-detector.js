import { configs, saveUserConfigs } from "./configs.js";
import { util } from "./utils.js";
import { clearMessageCounter, getTmEventOptionId, parseMessage } from "./viewer-message-parser.js";
import { highlightPkgCreation } from "./viewer-package-highlight.js";
import { parsePackage } from "./viewer-package-parser.js";
import { ui } from "./viewer-ui-elements.js";

/**
 * @typedef {"Online" | "Offline" | "Incoming" | "Error"} PackageState
 * 
 * @typedef {{ ticket: number, timestamp: number, lineIndex: number }} PackageCreation
 * 
 * @typedef {{
 *  lineIndexes: number[]
 *  pkgLoggedTimestamp: number
 *  bytes: Uint8Array
 *  pkgIndex?: number
 *  creation?: PackageCreation
 *  state?: PackageState
 * }} DetectedPackage
 */

export const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
export const LOG_HEADER_SIZE = LOG_HEADER_EXAMPLE.length;

/** @type {PackageCreation[]} */
export let DetectPkgsCreatedAt = [];

// detect package counters
export let DetectPkgCounter = {
    total: 0,
    online: 0,
    offline: 0,
    incomming: 0,
    error: 0
}

/** 
* Reseta informacoes de pacotes detectados em RAM e da tabela de pacotes/mensagens.
*/
export function clearDetectedPkgInfo() {
    DetectPkgCounter.total = 0;
    DetectPkgCounter.online = 0;
    DetectPkgCounter.offline = 0;
    DetectPkgCounter.incomming = 0;
    DetectPkgCounter.error = 0;
    DetectPkgsCreatedAt = [];
    ui.listMessageTable.innerHTML = "";
    clearMessageCounter();
}

/**
 * @param {PackageState} type 
 * @return {number} total
 */
export function updatePackageCounterStatistics(type) {
    DetectPkgCounter.total++;
    if (type === "Incoming") DetectPkgCounter.incomming++;
    else if (type === "Online") DetectPkgCounter.online++;
    else if (type === "Offline") DetectPkgCounter.offline++;
    else if (type === "Error") DetectPkgCounter.error++;

    return DetectPkgCounter.total;
}

/** 
 * @param {string} line
 * @returns {{isPkgAnnouncement: boolean, type: "Sent" | "Incoming"} }
 */
function checkPkgAnnouncement(line) {
    const substr = line.substring(LOG_HEADER_SIZE);
    const isSentPkg = substr.startsWith("Sent Buffer:");
    const isIncomPkg = substr.startsWith("Incoming Package:");
    return {
        isPkgAnnouncement: isSentPkg || isIncomPkg,
        type: isSentPkg ? "Sent" : isIncomPkg ? "Incoming" : null,
    }
}

/**
 * Detecta pacotes no texto
 * 
 * @param {string[]} lines
 * @returns {DetectedPackage[]}
 * }}
 */
export function detectPackages(lines) {
    const headerLen = LOG_HEADER_SIZE;

    let isCollectingFrame = false;
    let isIncoming = false;
    let pkgLoggedTimestamp = 0;  // timestamp de quando o pacote foi impresso no LOG
    let lineIndexes = []; // guarda os índices das linhas que pertencem ao pacote
    /** @type {DetectedPackage[]} */
    let packages = [];

    function flushPackage() {
        if (lineIndexes.length === 0) return;
        const total = lineIndexes.length;

        try {
            let frameStr = "";
            for (let i = 0; i < total; i++) {
                frameStr += lines[lineIndexes[i]].slice(headerLen);
            }

            /** @type {DetectedPackage} */
            const pkg = { pkgLoggedTimestamp, lineIndexes, bytes: util.hexToBuffer(frameStr) };
            const { ignore } = preProcessDetectedPackage(pkg, isIncoming);
            if (ignore) {
                lineIndexes = []; // reset linhas
                return;
            }
            packages.push(pkg);
        } catch (e) {
            packages.push({ pkgLoggedTimestamp, state: "Error", lineIndexes, bytes: null });
        }

        // reset
        lineIndexes = [];
    }

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];

        if (line.length <= headerLen) {
            // se estava coletando e “quebrou”, fecha pacote
            if (isCollectingFrame) {
                isCollectingFrame = false;
                flushPackage();
            }
            continue;
        }

        // string after log header
        const substr = line.slice(headerLen);

        if (!isCollectingFrame) {
            // verifica se tem que iniciar coleta de frames hexadecimais
            const res = checkPkgAnnouncement(line);
            isIncoming = res.type === "Incoming";
            if (res.isPkgAnnouncement) {
                // Encontrou inicio do frame, inicia a coleta das linhas seguintes
                pkgLoggedTimestamp = util.logExtractTimestampFromHeader(line);
                isCollectingFrame = true;
                lineIndexes = [];
                continue; // Inicia coleta nas linhas seguintes
            }
        } else {
            // está coletando: se não for hex, termina pacote
            if (!util.isHexOnly(substr)) {
                // Terminou de coletar linhas desse pacote
                isCollectingFrame = false;
                flushPackage();
                continue;
            }
        }

        if (isCollectingFrame) {
            lineIndexes.push(lineNumber); // Coleta mais uma linha do pacote atual
        }
    }

    // se o texto acabou no meio de um pacote, fecha ele também
    if (isCollectingFrame) {
        flushPackage();
    }

    return packages;
}

/**
 * Detecta informacoes de ticket e timestamp da criacao do pacote
 * 
 * @param {string[]} lines
 * @param {{highlight?: boolean}} opts
 */
export function detectPackagesCreation(lines, opts = {}) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        
        const substr = lines[lineIndex].slice(LOG_HEADER_SIZE);
        const isPkgCreation = substr.startsWith("New Package Ticket: ");
        const isPkgWrite = substr.startsWith("Write Position TIME: ");
        const isPkgRead = substr.startsWith("Read Position TICKET: ");
        //const isBBopen = substr.startsWith("OPEN NEW PACKET - ");
        //const isBBclose = substr.startsWith("CLOSE PACKET MINUTE - ");

        if (isPkgCreation) {
            // coleta linha da criação 
            const ticket = util.logExtractPkgTicketAndTime(substr).ticket;
            if (ticket) {
                const exists = DetectPkgsCreatedAt.some(p => p.ticket === ticket);
                if (exists === false)
                    DetectPkgsCreatedAt.push({ ticket, lineIndex, timestamp: null });
                if(opts.highlight) {
                    // usuário solicitou highlight dos pacotes
                    highlightPkgCreation(lines, lineIndex, ticket);
                }
            }
        }
        else if (isPkgWrite || isPkgRead) {
            // coleta timestamp da criação
            const pkgCreationInfo = util.logExtractPkgTicketAndTime(substr);
            const foundPkgCreation = DetectPkgsCreatedAt.find(p =>
                p.ticket === pkgCreationInfo.ticket &&
                p.timestamp === null
            );
            if (foundPkgCreation)
                foundPkgCreation.timestamp = pkgCreationInfo.timestamp;
        }
    }
}

export function htmlDetectedPackageCounters() {
    let html = "";
    if (util.isToogleButtonPressed(ui.btnHighlightPkg)) {
        html = `
            <div style="display:flex; justify-content:space-between; padding:4px 0;">
                <span>🟢 Pacote Enviado (ONLINE)</span>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>${DetectPkgCounter.online}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;">
                <span>⚪ Pacote Enviado (OFFLINE)</span>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>${DetectPkgCounter.offline}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;">
                <span>🔵 Pacote Recebido</span>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>${DetectPkgCounter.incomming}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;">
                <span>🔴 Pacote com Erro</span>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>${DetectPkgCounter.error}</strong>
            </div>
        `;
    } else {
        html = `
            <div> Botão   
                <button class='toogle-btn'>
                    <span class='toogle-btn-icon'>▦</span>
                </button>
                deve estar ativo.
            </div>`;
    }

    return `
    <section>
        <div style="padding-bottom: 16px;">
            Pacotes
        </div>
        ${html}
    <section>`;
}

export function htmlPkgDetectorConfigurator() {
    return `
<section>
    <div style="padding-bottom: 16px;">
        Análise de Pacotes
    </div>
    <label>
        <input id="cbIgnoreAck" type="checkbox" ${configs.pkgAnalyze.ignoreAck ? "checked" : ""}>
        Ignora Pacote que só tem ACK (ID 0xFFFF)
    </label>
    <br>
    <label>
        <input id="cbIgnoreKeepAlive" type="checkbox" ${configs.pkgAnalyze.ignoreKeepAlive ? "checked" : ""}>
        Ignora Pacote que só tem KEEP-ALIVE (ID 0x0000)
    </label>
<section>`;
}

export function initPkgDetectorConfiguratorListener() {
    const modalBody = document.getElementById("modal1");
    /** @type {HTMLInputElement} */
    const cbIgnoreAck = modalBody.querySelector("#cbIgnoreAck");
    /** @type {HTMLInputElement} */
    const cbIgnoreKeepAlive = modalBody.querySelector("#cbIgnoreKeepAlive");

    cbIgnoreAck.onchange = () => {
        configs.pkgAnalyze.ignoreAck = cbIgnoreAck.checked;
        saveUserConfigs();
    };
    cbIgnoreKeepAlive.onchange = () => {
        configs.pkgAnalyze.ignoreKeepAlive = cbIgnoreKeepAlive.checked;
        saveUserConfigs();
    };
}

const detectPendingPkgUtils = {
    getPayload: (line) => (line.length > LOG_HEADER_SIZE ? line.slice(LOG_HEADER_SIZE) : ""),
    isHexPrefixNonEmpty: (s) => s.length > 0 && /^[0-9a-fA-F]+$/.test(s),
    isHexOnlyNonEmpty: (s) => s.length > 0 && util.isHexOnly(s),
    isFrameishLine: (line) => {
        const p = detectPendingPkgUtils.getPayload(line);
        // hex-only (linha “completa”) ou hex-prefix (corte no meio)
        return detectPendingPkgUtils.isHexOnlyNonEmpty(p) || detectPendingPkgUtils.isHexPrefixNonEmpty(p);
    },
    startsWithHeader: (line) => {
        if (line.length > 0 && line[0] !== '[') return false;
        if (line.length > 16 && line[16] !== ']') return false;
        if (line.length > 17 && line[17] !== '[') return false;
        if (line.length > 28 && line[28] !== ']') return false;
        if (line.length > 29 && line[29] !== '[') return false;
        if (line.length > 33 && line[33] !== ']') return false;
        if (line.length > 34 && line[34] !== '[') return false;
        if (line.length > 39 && line[39] !== ']') return false;
        if (line.length > 40 && line[40] !== ':') return false;
        if (line.length > 41 && line[41] !== ' ') return false;
        return true;
    },
    startsWithCC33: (line) => {
        const p = detectPendingPkgUtils.getPayload(line);
        return p.length >= 4 && p.slice(0, 4).toUpperCase() === "CC33";
    }
};


/**
 * Parseia o Log, o dividindo em duas partes:
 *  - before: texto seguro (não termina em pacote/linha parcial)
 *  - rest: pedaço final que deve ser guardado (pacote incompleto e/ou linha parcial)
 *
 * @param {string} textChunk
 * @returns {{ before: string, rest: string }}
 */
function splitTailIfEndsWithIncompletePkg(textChunk) {
    if (!textChunk) return { before: "", rest: "" };

    const lines = textChunk.split(/\r?\n/);
    const lastIdx = lines.length - 1;
    const lastLine = lines[lastIdx];

    // só tem essa linha, a ultima linha sempre será rest
    if (lastIdx === 0) {
        return { before: "", rest: textChunk };
    }

    // tem mais de uma linha, 
    // se a ultima linha não for header parcial ou linha frameish, 
    // o before é tudo antes da última linha, e o rest é a última linha
    if (detectPendingPkgUtils.startsWithHeader(lastLine) === false ||
        (lastLine.length > LOG_HEADER_SIZE && detectPendingPkgUtils.isFrameishLine(lastLine) === false)) {
        return {
            before: lines.slice(0, lastIdx).join("\n"),
            rest: lastLine // sempre vai ter pelo menos a última linha no rest
        };
    }

    // tem mais de uma linha
    // apartir da penultima linha vai subindo enquanto for linha "frameish" ou "anuncio de frame"
    // se encontrar uma linha não frameish/anuncio, o before é a linha encontrada e as anteriores, 
    // e o rest começa na próxima linha.
    for (let i = lastIdx - 1; i >= 0; i--) {
        if (!detectPendingPkgUtils.isFrameishLine(lines[i]) && !checkPkgAnnouncement(lines[i]).isPkgAnnouncement) {
            // nao é anuncio de pacote nem frame, fazemos o split apartir desse indice 
            return {
                before: lines.slice(0, i + 1).join("\n"),
                rest: lines.slice(i + 1).join("\n") // sempre vai ter pelo menos a última linha no rest
            };
        }
    }

    // se chegou aqui, todas as linhas antes da última são frameish ou anuncio de frame, 
    // logo não são seguras, tudo será tratado como rest
    return { before: "", rest: textChunk };
}

/**
 * Divide o chunk de texto recebido em: 
 * - parte segura (sem frames incompletos) 
 * - parte pendente (final do log pode ter um pacote incompleto que pode chegar a qualquer momento)
 * 
 * @param {string} pendingText
 * @param {string} chunk
 * @returns {{ safeText: string, pendingText: string }}
 */
export function detectPendingPackageSection(pendingText, chunk) {
    const combined = (pendingText || "") + (chunk || "");
    let { before, rest } = splitTailIfEndsWithIncompletePkg(combined);

    // garante que o rest comece com newline, para não juntar com a última linha do before
    if (rest.startsWith("\n") === false)
        rest = "\n" + rest;

    return { safeText: before || "", pendingText: rest || "" };
}

/**
 * @param {DetectedPackage} pkg
 * @param {boolean} isIncoming
 * @returns {{ignore: boolean}}
 */
function preProcessDetectedPackage(pkg, isIncoming) {
    const parsed = parsePackage(pkg.bytes, isIncoming, "validate", "h");

    if (parsed.parseOk) {
        if (shouldIgnoreDetectedPackage(parsed)) {
            return { ignore: true }
        } else {
            /** 
             * Preenche timestamp da data de criação se existir, 
             * Isso é necessário para conseguir ordenar a tabela com base no timestamp da criação
             */
            if (isIncoming) //para incoming, nao da pra saber a data gerada no servidor, entao consideramos a data de chegada no equipamento
                pkg.creation = { timestamp: pkg.pkgLoggedTimestamp, ticket: null, lineIndex: null };
            else {
                pkg.creation = DetectPkgsCreatedAt.find(p => p.ticket === parsed.pkgTicket);
                if(!pkg.creation) { //se não existir, força o timestamp da data de criação ser igual a data do log
                    pkg.creation = { timestamp: pkg.pkgLoggedTimestamp, ticket: parsed.pkgTicket, lineIndex: null }
                }
            }
        }
    }

    // determina state
    pkg.state = !parsed.parseOk ? "Error" : isIncoming ? "Incoming" : parsed.connState;

    return { ignore: false };
}

/** 
 * @param {import("./viewer-package-parser.js").ParsedPackage} parsed 
 */
function shouldIgnoreDetectedPackage(parsed) {
    if (parsed.parseOk) {
        for (const msg of parsed.messages) {
            // verifica se tem que ignorar esse pacote
            if ((msg.id === 0xFFFF && configs.pkgAnalyze.ignoreAck) ||
                (msg.id === 0x0000 && configs.pkgAnalyze.ignoreKeepAlive)) {
                if (parsed.messages.length === 1) {
                    // Esse pacote só tem mensagem de ACK ou KEEP-ALIVE, ignora esse pacote
                    return true;
                }
            }
        }
    }
    return false;
}