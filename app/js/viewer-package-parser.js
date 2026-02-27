import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import { highlightPackage, highlightPkgCreation } from "./viewer-package-highlight.js";
import { parseMessage, getMsgName, clearMessageCounter, getTmEventOptionId } from "./viewer-message-parser.js";
import { createBinaryReader } from "./viewer-binary-reader.js";
import { openFloatingWindow } from "./floating-window.js";
import { configs, saveUserConfigs } from "./configs.js";


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
export function parsePackage(u8buf, isIncomingPkg, processMode, dataMode, dataOrientation) {
    try {
        const br = createBinaryReader(u8buf, {
            processMode,
            dataMode,
            dataOrientation
        })
    
        let pkgSize = 0;
    
        if (isIncomingPkg) {
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
        const pkgTicket = br.add_row_u16("Ticket do Pacote");
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
    catch (e) {
        return {
            parseOk: false,
            pkgTicket: null,
            connState: null,
            rows: null,
            messages: null
        }
    }
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


