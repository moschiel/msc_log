import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import { highlightPackage } from "./viewer-package-highlight.js";
import { parseMessage, getMsgName } from "./viewer-message-parser.js";
import { createBinaryReader } from "./viewer-binary-reader.js";
import { openFloatingWindow } from "./floating-window.js";

export const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";

// highlight package counters
let hlPkgCounter = 0;
let hlOfflinePkgCounter = 0;
let hlErrPkgCounter = 0;

// list message counters
let listMsgCounter = 0;

/** 
* Reseta os contadores usados para highlight de pacotes.
*/
export function clearHighlightPkgCounters() {
    hlPkgCounter = 0;
    hlOfflinePkgCounter = 0;
    hlErrPkgCounter = 0;
}

/**
* Reseta os contadores usados para listagem de mensagens.
*/
export function clearMessageCounters() {
    listMsgCounter = 0;
}

/**
 * Detecta pacotes CC33 no texto para:
 * - retornar o texto convertido para HTML, aplicando CSS de highlight nesses pacotes.
 * - ou retornar todas as mensagens de um ID específico.
 * 
 * @param {string} text,
 * @param {{
 *   highlight?: boolean,
 *   searchMsgID?: Number
 * }} [opt]
 * @returns {{
 * htmlWithPackagesHighlight: string,
 * messageDataTable: {
 *  headers: Array<string>, 
 *  rows: Array<Array>
 * }}}
 */
export function detectCC33Packages(text, opt = { highlight: false, searchMsgID: null }) {
    const lines = text.split(/\r?\n/);
    const headerLen = LOG_HEADER_EXAMPLE.length;

    let messageDataTable = { headers: [], rows: [] };

    let isCollectingFrame = false;
    let lineIndexes = [];         // guarda os índices das linhas que pertencem ao pacote

    function flushPackage() {
        if (lineIndexes.length === 0) return;

        if (opt.highlight) hlPkgCounter++;

        const total = lineIndexes.length;

        try {
            let frameStr = "";
            for (let i = 0; i < total; i++) {
                frameStr += lines[lineIndexes[i]].slice(headerLen);
            }

            const { parseOk, connState, messages } = parseCC33Package(util.hexToBuffer(frameStr), "validate");

            for (const msg of messages) {
                if ((msg.id === 0xFFFF && readPkgAnalyzeConfig("ignoreAck") === "1")
                    || (msg.id === 0x0000 && readPkgAnalyzeConfig("ignoreKeepAlive") === "1")) {
                    lineIndexes = []; // reset linhas
                    if (opt.highlight) hlPkgCounter--; // remove esse pacote da contagem
                    return; // pula pacote
                }

                if (opt.searchMsgID === msg.id) {
                    const { isImplemented, rows } = parseMessage(
                        msg.id,
                        msg.data,
                        "nv", // Collect parameters Name and Value
                        "h" // Data horizontal orientation
                    );

                    if (isImplemented) {
                        if (listMsgCounter == 0) {
                            messageDataTable.headers = rows[0]; // parameters names
                        } else {
                            messageDataTable.rows.push(rows[1]); // parameters values
                        }
                        listMsgCounter++;
                    }
                }
            }

            if (parseOk && connState === "Offline")
                if (opt.highlight) hlOfflinePkgCounter++;

            if (opt.highlight)
                highlightPackage(hlPkgCounter, parseOk, connState, lines, lineIndexes);


        } catch (e) {
            console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            if (opt.highlight) hlErrPkgCounter++;
            if (opt.highlight)
                highlightPackage(hlPkgCounter, false, null, lines, lineIndexes);
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

        const substrFrame = line.slice(headerLen);

        if (!isCollectingFrame) {
            if (substrFrame.startsWith("CC33") && util.isHexOnly(substrFrame)) {
                //Encontrou inicio do frame, inicia a coleta das linhas seguintes
                isCollectingFrame = true;
                lineIndexes = [];
            }
        } else {
            // está coletando: se não for hex, termina pacote
            if (!util.isHexOnly(substrFrame)) {
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

    if (opt.highlight)
        console.log(`Quantidade Total de Pacotes: ${hlPkgCounter}\r\nPacotes Offline: ${hlOfflinePkgCounter}\r\nPacotes com erro: ${hlErrPkgCounter}`);

    return {
        htmlWithPackagesHighlight: opt.highlight ? lines.join("\n") : text,
        messageDataTable: opt.searchMsgID ? messageDataTable : null
    }
}


/**
 * Parsea o pacote CC33, retornando:
 * - os dados do pacote em formato tabular (headers e rows),
 * - e as mensagens contidas no pacote (messages)
 * 
 * @param {Uint8Array} u8buf
 * @param {"validate" | "collect"} processMode
 * @returns {{ 
 *  parseOk: boolean, 
 *  connState: "Online" | "Offline", 
 *  rows: Array<Array>, 
 *  messages: Array<{id: Number, size: Number, data: Uint8Array}>, 
 *  headers: Array<string> }}
 */
export function parseCC33Package(u8buf, processMode) {
    const br = createBinaryReader(u8buf, {
        processMode,
        dataMode: "nsv", /* name, size, value */
        dataOrientation: "v"
    });

    const start = br.read_u16("frame incial", false);
    if (start !== 0xCC33) throw new Error("Frame inicial invalido");

    const pkgSize = br.add_row_u16("Tamanho do pacote");

    const frameEnd = br.getOffset() + pkgSize;
    if (frameEnd > br.getLength()) {
        throw new Error(`Frame Size (${pkgSize}) é maior que o buffer (${br.getLength()})`);
    }

    const option = br.add_row_u8("Option", (v) => {
        if (v !== 0 && v !== 3) {
            throw new Error("Option inválida, deve ser 0 ou 3");
        }
        return (v === 0) ? "0 - Not Provider" : (v === 3) ? "3 - Provider" : v;
    });

    // ESN (se provider)
    if (option === 3) {
        br.add_row_hex_u16("Sei lá", false);
        const esnSize = br.add_row_u8("Tamanho do SN");
        br.add_row_bytes_BCD("SerialNumber", esnSize);
    }

    // index / service type
    let connState;
    br.add_row_u16("Index do Pacote");
    br.add_row_u8("Tipo de Serviço", (v) => {
        let ackType = "";
        switch (v & 0x03) {
            case 0x00: ackType = "No ACK requested"; break;
            case 0x01: ackType = "ACK requested"; break;
            case 0x02: ackType = "ACK message"; break;
            case 0x03: ackType = "ACK invalid option"; break;
        }
        connState = (v & 0x80) > 0 ? "Online" : "Offline";
        return `${br.hex_u8(v)} - ${ackType}, ${connState}`;
    });

    // mensagens
    let newMsg = true;
    let messages = [];
    while (newMsg && (br.getOffset() < frameEnd)) {
        const msgId = br.read_u16("msgId", true);

        let msgSize = br.read_u16("msgSize", true);

        newMsg = (msgSize & 0x8000) !== 0;
        msgSize = (msgSize & 0x7FFF);

        const msgData = br.read_bytes("msgData", msgSize);
        messages.push({ id: msgId, size: msgSize, data: msgData });
        br.add_row(getMsgName(msgId), msgSize, util.bufferToHex(msgData));
    }

    // (opcional) se sobrar algo até frameEnd, você pode logar/mostrar:
    // if (offset < frameEnd) add("Trailing bytes", frameEnd - offset, util.bufferToHex(br.read_bytes(frameEnd - offset)));

    return {
        parseOk: true,
        connState,
        headers: ["Name", "Size", "Value"],
        rows: br.rows,
        messages
    };
}

/**
 * Monta tabela HTML com os dados do pacote parseado, e os mostra em uma janela.
 * @param {Array<string>} headers 
 * @param {Array<Array>} rows 
 * @param {Number|string|null} pkgIndex Índice do pacote (opcional, para mostrar no título da janela)
 */
export function showParsedPackageOnTable(headers, rows, pkgIndex = null) {
    util.Table.Create(ui.parsedPackageTable, headers, rows);
    openFloatingWindow(ui.windowParsedPackage, {
        title: pkgIndex !== null ? `Package #${pkgIndex}` : "Package #?"
    });
}


const splitTailUtils = {
    getPayload: (line) => (line.length > LOG_HEADER_EXAMPLE.length ? line.slice(LOG_HEADER_EXAMPLE.length) : ""),
    isHexPrefixNonEmpty: (s) => s.length > 0 && /^[0-9a-fA-F]+$/.test(s),
    isHexOnlyNonEmpty: (s) => s.length > 0 && util.isHexOnly(s),
    isFrameishLine: (line) => {
        const p = splitTailUtils.getPayload(line);
        // hex-only (linha “completa”) ou hex-prefix (corte no meio)
        return splitTailUtils.isHexOnlyNonEmpty(p) || splitTailUtils.isHexPrefixNonEmpty(p);
    },
    startsWithHeader: (line) => {
        if(line.length > 0  && line[0]  !== '[') return false;
        if(line.length > 16 && line[16] !== ']') return false;
        if(line.length > 17 && line[17] !== '[') return false;
        if(line.length > 28 && line[28] !== ']') return false;
        if(line.length > 29 && line[29] !== '[') return false;
        if(line.length > 33 && line[33] !== ']') return false;
        if(line.length > 34 && line[34] !== '[') return false;
        if(line.length > 39 && line[39] !== ']') return false;
        if(line.length > 40 && line[40] !== ':') return false;
        if(line.length > 41 && line[41] !== ' ') return false;
        return true;
    },
    startsWithCC33: (line) => {
        const p = splitTailUtils.getPayload(line);
        return p.length >= 4 && p.slice(0, 4).toUpperCase() === "CC33";
    }
};

/**
 * Parseia o Log, o dividindo em duas partes:
 *  - before: texto seguro (não termina em pacote/linha parcial)
 *  - rest: pedaço final que deve ser guardado (pacote CC33 incompleto e/ou linha parcial)
 *
 * @param {string} textChunk
 * @returns {{ before: string, rest: string }}
 */
function splitTailIfEndsWithIncompleteCC33(textChunk) {
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
    if (splitTailUtils.startsWithHeader(lastLine) === false || 
       (lastLine.length > LOG_HEADER_EXAMPLE.length && splitTailUtils.isFrameishLine(lastLine) === false)) {
        return { 
            before: lines.slice(0, lastIdx).join("\n"), 
            rest: lastLine // sempre vai ter pelo menos a última linha no rest
        };
    }

    // tem mais de uma linha
    // apartir da penultima linha vai subindo enquanto for linha "frameish"
    // se encontrar uma linha não frameish, o before é a linha encontrada e as anteriores, 
    // e o rest começa na próxima linha.
    for (let i = lastIdx - 1; i >= 0; i--) {
        if (!splitTailUtils.isFrameishLine(lines[i])) {
            return {
                before: lines.slice(0, i + 1).join("\n"),
                rest: lines.slice(i + 1).join("\n") // sempre vai ter pelo menos a última linha no rest
            };
        }
    }

    // se chegou aqui, todas as linhas antes da última são frameish, 
    // logo não são seguras, tudo será tratado como rest
    return { before: "", rest: textChunk };
}

/**
 * Divide o chunk de texto recebido em: 
 * - parte segura (sem frames incompletos) 
 * - parte pendente (final do log pode ter um pacote CC33 incompleto que pode chegar a qualquer momento)
 * 
 * @param {string} pendingText
 * @param {string} chunk
 * @returns {{ safeText: string, pendingText: string }}
 */
export function tailSplitWithPendingCC33(pendingText, chunk) {
    const combined = (pendingText || "") + (chunk || "");
    let { before, rest } = splitTailIfEndsWithIncompleteCC33(combined);

    // garante que o rest comece com newline, para não juntar com a última linha do before
    if (rest.startsWith("\n") === false)
        rest = "\n" + rest;

    return { safeText: before || "", pendingText: rest || "" };
}

const PKG_ANALYZE_KEY = "pkg-analyze-config";
/**
 * Retorna o objeto de configurações completo,
 * já mesclado com defaults.
 */
function getPkgAnalyzeConfigObject() {
    const raw = localStorage.getItem(PKG_ANALYZE_KEY);

    let cfg = {};
    if (raw) {
        try {
            cfg = JSON.parse(raw);
        } catch (e) {
            console.warn("pkg-analyze: JSON inválido, resetando configs");
            cfg = {};
        }
    }

    // defaults
    return {
        ignoreAck: "1",
        ignoreKeepAlive: "1",
        ...cfg
    };
}

/**
 * Salva uma configuração de análise de pacotes no localStorage (JSON).
 * @param {string} config
 * @param {string} value
 */
export function savePkgAnalyzeConfig(config, value) {
    const cfg = getPkgAnalyzeConfigObject();
    cfg[config] = value;

    localStorage.setItem(PKG_ANALYZE_KEY, JSON.stringify(cfg));
    console.log("save", PKG_ANALYZE_KEY, cfg);
}

/**
 * Lê uma configuração de análise de pacotes do localStorage (JSON).
 * @param {string} config
 * @returns {string}
 */
export function readPkgAnalyzeConfig(config) {
    const cfg = getPkgAnalyzeConfigObject();
    return cfg[config];
}