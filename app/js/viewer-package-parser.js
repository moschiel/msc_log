const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";

// highlight package counters
let hlPkgCounter = 0;
let hlOfflinePkgCounter = 0;
let hlErrPkgCounter = 0;

// list message counters
let listMsgCounter = 0;

function clearHighlightPkgCounters() {
    hlPkgCounter = 0;
    hlOfflinePkgCounter = 0;
    hlErrPkgCounter = 0;
}

function clearMessageCounters() {
    listMsgCounter = 0;
}

/**
 * @param {string} text,
 * @param {{
 *   highlight?: boolean,
 *   collectMsgID?: Number
 * }} [opt]
 * @returns {{
 * htmlWithPackagesHighlight: string,
 * messageDataTable: {
 *  headers: Array<string>, 
 *  rows: Array<Array>
 * }}}
 */
function detectCC33Packages(text, opt = { highlight: false, collectMsgID: null }) {
    const lines = text.split(/\r?\n/);
    const headerLen = LOG_HEADER_EXAMPLE.length;
    
    let messageDataTable = { headers: [], rows: [] };

    let isCollectingFrame = false;
    let lineIndexes = [];         // guarda os índices das linhas que pertencem ao pacote

    function flushPackage() {
        if (lineIndexes.length === 0) return;

        if(opt.highlight) hlPkgCounter++;

        const total = lineIndexes.length;
        
        try {
            let frameStr = "";
            for (let i = 0; i < total; i++) {
                frameStr += lines[lineIndexes[i]].slice(headerLen);
            }

            const {parseOk, connState, messages} = parseCC33Package(util.hexToBuffer(frameStr), "validate");

            for (const msg of messages) {
                if((msg.id === 0xFFFF && readPkgAnalyzeConfig("ignoreAck") === "1")
                 ||(msg.id === 0x0000 && readPkgAnalyzeConfig("ignoreKeepAlive") === "1")) {
                    lineIndexes = []; // reset linhas
                    if(opt.highlight) hlPkgCounter--; // remove esse pacote da contagem
                    return; // pula pacote
                }

                if (opt.collectMsgID === msg.id) {
                    const {isImplemented, rows} = parseMessage(
                        msg.id, 
                        msg.data, 
                        "nv", // Collect parameters Name and Value
                        "h" // Data horizontal orientation
                    );

                    if(isImplemented) {
                        if(listMsgCounter == 0) {
                            messageDataTable.headers = rows[0]; // parameters names
                        } else {
                            messageDataTable.rows.push(rows[1]); // parameters values
                        }
                        listMsgCounter++;
                    }
                }
            }

            if(parseOk && connState === "Offline")
                if(opt.highlight) hlOfflinePkgCounter++;

            if (opt.highlight)
                highlightPackage(hlPkgCounter, parseOk, connState, lines, lineIndexes);
                

        } catch (e) {
            console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            if (opt.highlight) hlErrPkgCounter++;
            if (opt.highlight)
                highlightPackage(hlPkgCounter, false, "", lines, lineIndexes);
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
        // comentado, pois se o texto terminou no meio de um pacote, 
        // nao da pra dizer se esta ok ou com erro
        //flushPackage();  
    }

    if(opt.highlight) 
        console.log(`Quantidade Total de Pacotes: ${hlPkgCounter}\r\nPacotes Offline: ${hlOfflinePkgCounter}\r\nPacotes com erro: ${hlErrPkgCounter}`);
    
    return {
        htmlWithPackagesHighlight: opt.highlight ? lines.join("\n") : text,
        messageDataTable: opt.collectMsgID ? messageDataTable : null
    }
}


/**
 * @param {Uint8Array} u8buf
 * @param {string} processMode?: "validate" | "collect",
 * @returns {{ 
 *  parseOk: string, 
 *  connState: "Online" | "Offline", 
 *  rows: Array<Array>, 
 *  messages: Array<{id: Number, size: Number, data: Uint8Array}>, 
 *  headers: Array<string> }}
 */
function parseCC33Package(u8buf, processMode) {
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
        switch(v & 0x03) {
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
        messages.push({id: msgId, size: msgSize, data: msgData});
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

function savePkgAnalyzeConfig(config, value) {
    const key = `${LOG_FILE_NAME}::pkg-analyze::${config}`;
    localStorage.setItem(key, value);
    console.log("save", key);
}

function readPkgAnalyzeConfig(config) {
    const key = `${LOG_FILE_NAME}::pkg-analyze::${config}`;
    const v = localStorage.getItem(key);

    if(v === null) {
        // retorna valores default de acordo com a config
        if(config === "ignoreAck") return "1";
        if(config === "ignoreKeepAlive") return "1";
    }

    return v;
}

function showParsedPackageOnTable(headers, rows) {
    util.Table.Create(ui.packageTable, headers, rows);
    // util.setVisible(ui.windowParsedPackage, true);
    openFloatingWindow(ui.windowParsedPackage);
}

/**
 * Parseia o Log, o dividindo em duas partes:
 *  - before: texto seguro (não termina em pacote/linha parcial)
 *  - rest: pedaço final que deve ser guardado (pacote CC33 incompleto e/ou linha parcial)
 *
 * Regras:
 * - Pacote começa numa linha cujo payload (após header) começa com "CC33".
 * - Continuação de pacote: payload é somente hex (util.isHexOnly) ou prefixo hex (corte no meio).
 * - Se o chunk termina com header parcial (len < headerLen) ou só header (len == headerLen),
 *   essa última "linha" SEMPRE vai para o rest (pra não perder o começo do header).
 * - Se o chunk termina em linha com payload:
 *   - se a última linha é hex-only ou hex-prefix, tenta subir e achar um CC33.
 *   - se achar, rest começa no CC33; senão, rest = "".
 *
 * @param {string} textChunk
 * @param {number} headerLen
 * @returns {{ before: string, rest: string }}
 */
function splitTailIfEndsWithIncompleteCC33(textChunk) {
  if (!textChunk) return { before: "", rest: "" };
  const headerLen = LOG_HEADER_EXAMPLE.length;

  const lines = textChunk.split(/\r?\n/);

  const getPayload = (line) => (line.length > headerLen ? line.slice(headerLen) : "");
  const isHexPrefixNonEmpty = (s) => s.length > 0 && /^[0-9a-fA-F]+$/.test(s);
  const isHexOnlyNonEmpty = (s) => s.length > 0 && util.isHexOnly(s);

  const isFrameishLine = (line) => {
    const p = getPayload(line);
    // hex-only (linha “completa”) ou hex-prefix (corte no meio)
    return isHexOnlyNonEmpty(p) || isHexPrefixNonEmpty(p);
  };

  //header example: "[20251104-100340][0314593089][DBG][NET ]: "
  const startsWithHeader = (line) => {
    if(line.length > 0 && line[0] !== '[') return false;
    /* se quiser verificar o resto, só descomentar
    if(line.length > 16 && line[16] !== ']') return false;
    if(line.length > 17 && line[17] !== '[') return false;
    if(line.length > 28 && line[28] !== ']') return false;
    if(line.length > 29 && line[29] !== '[') return false;
    if(line.length > 33 && line[33] !== ']') return false;
    if(line.length > 34 && line[34] !== '[') return false;
    if(line.length > 39 && line[39] !== ']') return false;
    if(line.length > 40 && line[40] !== ':') return false;
    if(line.length > 41 && line[41] !== ' ') return false;*/
    return true;
  }

  const startsWithCC33 = (line) => {
    const p = getPayload(line);
    return p.length >= 4 && p.slice(0, 4).toUpperCase() === "CC33";
  };

  const lastIdx = lines.length - 1;
  const lastLine = lines[lastIdx];

  // Caso A) terminou no meio do header OU exatamente no header => guardar última linha no rest
  if (lastLine.length <= headerLen && startsWithHeader(lastLine)) {
    if (lastIdx === 0) {
      return { before: "", rest: lastLine };
    }

    // Se antes dessa linha parcial existe um pacote CC33 "em andamento", rest deve incluir desde o CC33
    let startIdx = -1;
    for (let i = lastIdx - 1; i >= 0; i--) {
      if (!isFrameishLine(lines[i])) break;
      if (startsWithCC33(lines[i])) { startIdx = i; break; }
    }

    if (startIdx !== -1) {
      return {
        before: lines.slice(0, startIdx).join("\n"),
        rest: lines.slice(startIdx).join("\n") // inclui a linha parcial do header
      };
    }

    // Não dá pra afirmar que é CC33, mas a última linha é parcial e precisa ser guardada
    return {
      before: lines.slice(0, lastIdx).join("\n"),
      rest: lastLine
    };
  }

  // Caso B) última linha tem payload (len > headerLen)
  if (!isFrameishLine(lastLine)) {
    return { before: textChunk, rest: "" };
  }

  // Se a última linha já começa com CC33 => resto só a partir dela
  if (startsWithCC33(lastLine)) {
    return {
      before: lines.slice(0, lastIdx).join("\n"),
      rest: lastLine
    };
  }

  // Senão, sobe procurando CC33, mas só enquanto as linhas forem "frameish"
  let startIdx = -1;
  for (let i = lastIdx; i >= 0; i--) {
    if (!isFrameishLine(lines[i])) break;
    if (startsWithCC33(lines[i])) { startIdx = i; break; }
  }

  if (startIdx === -1) {
    return { before: textChunk, rest: "" };
  }

  return {
    before: lines.slice(0, startIdx).join("\n"),
    rest: lines.slice(startIdx).join("\n")
  };
}

/**
 * Wrapper recomendado pro tail: concatena pendência + chunk e separa de novo.
 * NÃO adiciona '\n' automaticamente (tail pode cortar no meio de uma linha).
 */
function tailSplitWithPendingCC33(pendingText, chunk) {
  const combined = (pendingText || "") + (chunk || "");
  const { before, rest } = splitTailIfEndsWithIncompleteCC33(combined);
  return { safeText: before || "", pendingText: rest || "" };
}
