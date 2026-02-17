import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import { highlightPackage } from "./viewer-package-highlight.js";
import { parseMessage, getMsgName, hlMessagesCountStatistics, clearMessageCounter, updateMessageCounterStatistics, getTmEventOptionId } from "./viewer-message-parser.js";
import { createBinaryReader } from "./viewer-binary-reader.js";
import { openFloatingWindow } from "./floating-window.js";

export const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
export const LOG_HEADER_SIZE = LOG_HEADER_EXAMPLE.length;

// highlight package counters
export let pkgCounter = 0;
export let OnlinePkgCounter = 0;
export let OfflinePkgCounter = 0;
export let ErrorPkgCounter = 0;
/** @type {{ Ticket: number, Timestamp: number }[]} */
let pkgsCreatedAt = [];


/** 
* Reseta informacoes de pacotes em RAM e da tabela de pacotes/mensagens.
*/
export function clearPkgInfo() {
    pkgCounter = 0;
    OnlinePkgCounter = 0;
    OfflinePkgCounter = 0;
    ErrorPkgCounter = 0;
    pkgsCreatedAt = [];
    ui.listMessageTable.innerHTML = "";
    clearMessageCounter();
}

/**
 * Detecta pacotes no texto para:
 * - retornar o texto convertido para HTML, aplicando CSS de highlight nesses pacotes.
 * - ou retornar todas as mensagens de um ID específico.
 * 
 * @param {string} text,
 * @param {{
 *   highlight?: boolean,
 *   searchMsgID?: string
 * }} [opt]
 * @returns {{
 * htmlWithPackagesHighlight: string,
 * messageDataTable: {
 *  headers: Array<string>, 
 *  rows: Array<Array>
 * }}}
 */
export function detectPackages(text, opt = { highlight: false, searchMsgID: null }) {
    const lines = text.split(/\r?\n/);
    const headerLen = LOG_HEADER_SIZE;

    let messageDataTable = { headers: [], rows: [] };

    let isCollectingFrame = false;
    let isIncommingPkg = false;
    let pkgLoggedTimestamp = 0;  // timestamp de quando o pacote foi impresso no LOG
    let lineIndexes = []; // guarda os índices das linhas que pertencem ao pacote

    /**
     * @param {any[]} rows
     * @param {"Online" | "Offline"} connState
     * @param {number|string} pkgTicket
     * @param {boolean} isError
     */
    function appendMessageDataTable(rows, connState, pkgTicket, isError = false) {
        // Coleta timestamp da data de criação, se não existir, força o timestamp da data de criação ser igual a data do log
        // Isso é necessário para conseguir ordenar a tabela com base no timestamp da criação
        const pkgCreated = pkgsCreatedAt.find(p => p.Ticket === pkgTicket);
        const pkgCreatedTimestamp = pkgCreated !== undefined ? pkgCreated.Timestamp : pkgLoggedTimestamp;
        
        // Converte timestamp para 'human readable'
        const createdAtDate = pkgCreated !== undefined ? util.epochSecondsToString(pkgCreatedTimestamp) : "";
        const loggedAtDate = util.epochSecondsToString(pkgLoggedTimestamp);

        if (isError) {
            messageDataTable.rows.push([
                pkgCounter, 
                pkgCreatedTimestamp, 
                pkgLoggedTimestamp, 
                createdAtDate, 
                loggedAtDate, 
                "🔴", 
                pkgTicket
            ]); // parameters values
        } else {
            if (messageDataTable.headers.length === 0) {
                // insere colunas extras no inicio do header
                rows[0].unshift(
                    "Index", 
                    "Created TS", 
                    "Logged TS", 
                    "Created At", 
                    "Logged At", 
                    "Status", 
                    "Ticket"
                );
                messageDataTable.headers = rows[0]; // parameters names
            }
    
            // insere dados extras no inicio da row
            const type = isIncommingPkg ? "🔵" : connState === "Online" ? "🟢" : "⚪";
            rows[1].unshift(
                pkgCounter, 
                pkgCreatedTimestamp, 
                pkgLoggedTimestamp, 
                createdAtDate, 
                loggedAtDate, 
                type, 
                pkgTicket
            ); 
            messageDataTable.rows.push(rows[1]); // parameters values
        }
    }

    function flushPackage() {
        if (lineIndexes.length === 0) return;

        pkgCounter++;
        const total = lineIndexes.length;
        try {
            let frameStr = "";
            for (let i = 0; i < total; i++) {
                frameStr += lines[lineIndexes[i]].slice(headerLen);
            }

            const { parseOk, connState, messages, rows, pkgTicket } =
                parsePackage(
                    util.hexToBuffer(frameStr),
                    isIncommingPkg,
                    opt.searchMsgID === "all" ? "collect" : "validate",
                    "nv",
                    "h"
                );

            for (const msg of messages) {
                // verifica se tem que ignorar esse pacote
                if ((msg.id === 0xFFFF && readPkgAnalyzeConfig("ignoreAck") === "1") ||
                    (msg.id === 0x0000 && readPkgAnalyzeConfig("ignoreKeepAlive") === "1")) {

                    if (messages.length === 1) {
                        // Esse pacote só tem mensagem de ACK ou KEEP-ALIVE
                        // Ignora esse pacote
                        lineIndexes = []; // reset linhas
                        pkgCounter--; // remove esse pacote da contagem
                        return;
                    }
                }

                // atualiza contador de mensagens por ID
                updateMessageCounterStatistics(msg.id, msg.id === 0x1402 ? msg.data[0] : null);

                // verifica se deve retornar os dados parseados dessa mensagem
                const matchOptionID = msg.id === 0x1402 ? getTmEventOptionId(msg.data[0]) : String(msg.id);
                if (opt.searchMsgID === matchOptionID) {
                    const { isImplemented, rows } = parseMessage(
                        msg.id,
                        msg.data,
                        "nv", // Collect parameters Name and Value
                        "h" // Data horizontal orientation
                    );

                    if (isImplemented) {
                        appendMessageDataTable(rows, connState, pkgTicket);
                    }
                }
            }

            if (parseOk) {
                // verifica se deve rotornar os dados parseados desse pacote
                if (opt.searchMsgID === "all") {
                    appendMessageDataTable(rows, connState, pkgTicket);
                }

                // atualiza contadores de status de conexao
                if (connState === "Online") OfflinePkgCounter++;
                else if (connState === "Offline") OnlinePkgCounter++;
            }

            if (opt.highlight)
                highlightPackage(pkgCounter, parseOk, isIncommingPkg, connState, lines, lineIndexes);

        } catch (e) {
            //console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            ErrorPkgCounter++;
            if (opt.highlight)
                highlightPackage(pkgCounter, false, null, null, lines, lineIndexes);
            if (opt.searchMsgID && opt.searchMsgID !== "--")
                appendMessageDataTable(null, null, "", true);

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
            if (substr.startsWith("New Package Ticket: ")) {
                pkgsCreatedAt.push({
                    Ticket: util.logExtractPkgTicket(substr),
                    Timestamp: util.logExtractTimestampSeconds(line)
                });
            }

            const isSentPkg = substr.startsWith("Sent Buffer:");
            isIncommingPkg = substr.startsWith("Incoming Package:");

            //if (substrFrame.startsWith("CC33") && util.isHexOnly(substrFrame)) {
            if (isSentPkg || isIncommingPkg) {
                // Encontrou inicio do frame, inicia a coleta das linhas seguintes
                pkgLoggedTimestamp = util.logExtractTimestampSeconds(line);
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

    if (opt.highlight) {
        //console.log(`Quantidade Total de Pacotes: ${pkgCounter}\r\nPacotes Offline: ${OfflinePkgCounter}\r\nPacotes com erro: ${ErrorPkgCounter}`);
        //console.log("Quantidade de cada mensagem", hlMessagesCountStatistics);
    }

    return {
        htmlWithPackagesHighlight: opt.highlight ? lines.join("\n") : text,
        messageDataTable: opt.searchMsgID ? messageDataTable : null
    }
}


/**
 * Parsea o pacote, retornando:
 * - os dados do pacote em formato tabular (headers e rows),
 * - e as mensagens contidas no pacote (messages)
 * 
 * @param {Uint8Array} u8buf
 * @param {"validate" | "collect"} processMode
 * @param {"nsv" | "nv" } dataMode
 * @param {"v" | "h"} dataOrientation
 * @returns {{ 
 *  parseOk: boolean,
 *  pkgTicket: number,
 *  connState: "Online" | "Offline", 
 *  rows: Array<Array>, 
 *  messages: Array<{id: Number, size: Number, data: Uint8Array}> 
 * }}
 */
export function parsePackage(u8buf, isIncommingPkg, processMode, dataMode, dataOrientation) {
    const br = createBinaryReader(u8buf, {
        processMode,
        dataMode,
        dataOrientation
    })

    let pkgSize = 0;

    if (isIncommingPkg) {
        pkgSize = br.getLength();
        br.add_row("Tamanho do pacote", 2, br.getLength());
    } else {
        const start = br.read_u16("frame inicial", false);
        if (start !== 0xCC33) throw new Error("Frame inicial invalido");

        pkgSize = br.add_row_u16("Tamanho do pacote");
    }

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
        if (dataOrientation === "v") {
            br.add_row_hex_u16("Sei lá", false);
            const esnSize = br.add_row_u8("Tamanho do SN");
            br.add_row_bytes_BCD("SerialNumber", esnSize);
        } else {
            br.skip("Sei lá", 2);
            const esnSize = br.read_u8("Tamanho do SN");
            br.skip("Serial Number", esnSize);
        }
    }

    // index / service type
    let connState;
    const pkgTicket = br.add_row_u16("Index do Pacote");
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
    let text = "";
    while (newMsg && (br.getOffset() < frameEnd)) {
        const msgId = br.read_u16("msgId", true);

        let msgSize = br.read_u16("msgSize", true);

        newMsg = (msgSize & 0x8000) !== 0;
        msgSize = (msgSize & 0x7FFF);

        const msgData = br.read_bytes("msgData", msgSize);
        messages.push({ id: msgId, size: msgSize, data: msgData });

        if (dataOrientation === "v")
            br.add_row(getMsgName(msgId), msgSize, util.bufferToHex(msgData));
        else
            text += `[${getMsgName(msgId)}], `;
    }

    if (dataOrientation === "h")
        br.add_row("Mensagens", "N/A", text);

    // (opcional) se sobrar algo até frameEnd, você pode logar/mostrar:
    // if (offset < frameEnd) add("Trailing bytes", frameEnd - offset, util.bufferToHex(br.read_bytes(frameEnd - offset)));

    return {
        parseOk: true,
        pkgTicket,
        connState,
        rows: br.rows,
        messages
    };
}

/**
 * Monta tabela HTML com os dados do pacote parseado, e os mostra em uma janela.
 * @param {Array<string>} headers 
 * @param {Array<Array>} rows 
 * @param {Number|string|null} pkgClassIndex Índice do pacote (opcional, para mostrar no título da janela)
 */
export function showParsedPackageOnTable(headers, rows, pkgClassIndex = null) {
    util.Table.Create(ui.parsedPackageTable, headers, rows);
    openFloatingWindow(ui.windowParsedPackage, {
        title: pkgClassIndex !== null ? `Package #${pkgClassIndex}` : "Package #?"
    });
}


const splitTailUtils = {
    getPayload: (line) => (line.length > LOG_HEADER_SIZE ? line.slice(LOG_HEADER_SIZE) : ""),
    isHexPrefixNonEmpty: (s) => s.length > 0 && /^[0-9a-fA-F]+$/.test(s),
    isHexOnlyNonEmpty: (s) => s.length > 0 && util.isHexOnly(s),
    isFrameishLine: (line) => {
        const p = splitTailUtils.getPayload(line);
        // hex-only (linha “completa”) ou hex-prefix (corte no meio)
        return splitTailUtils.isHexOnlyNonEmpty(p) || splitTailUtils.isHexPrefixNonEmpty(p);
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
        const p = splitTailUtils.getPayload(line);
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
    if (splitTailUtils.startsWithHeader(lastLine) === false ||
        (lastLine.length > LOG_HEADER_SIZE && splitTailUtils.isFrameishLine(lastLine) === false)) {
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
 * - parte pendente (final do log pode ter um pacote incompleto que pode chegar a qualquer momento)
 * 
 * @param {string} pendingText
 * @param {string} chunk
 * @returns {{ safeText: string, pendingText: string }}
 */
export function tailSplitWithPendingPkg(pendingText, chunk) {
    const combined = (pendingText || "") + (chunk || "");
    let { before, rest } = splitTailIfEndsWithIncompletePkg(combined);

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