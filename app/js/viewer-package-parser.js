// Mapa equivalente ao Dictionary<UInt16, string>
const msgsList = new Map([
  [0x0000, { description: "Keep Alive", timelineSupport: false }],
  [0x1000, { description: "Reset INFO", timelineSupport: false }],
  [0x1100, { description: "Basic Position", timelineSupport: false }],
  [0x1101, { description: "Extended Position", timelineSupport: true }],
  [0x1121, { description: "MSC830 aditional Data", timelineSupport: false }],
  [0x1122, { description: "MSC530  aditional Data", timelineSupport: false }],
  [0x1130, { description: "Risk Rules Data", timelineSupport: false }],
  [0x1140, { description: "Login Event", timelineSupport: false }],
  [0x1200, { description: "Data Terminal Msg", timelineSupport: false }],
  [0x1210, { description: "Data Terminal Auth", timelineSupport: false }],
  [0x1300, { description: "Report Configurations", timelineSupport: false }],
  [0x1310, { description: "Report Context", timelineSupport: false }],
  [0x1400, { description: "Telemetry Data", timelineSupport: false }],
  [0x1401, { description: "Telemetry Delta", timelineSupport: false }],
  [0x1402, { description: "Telemetry Events", timelineSupport: false }],
  [0x1403, { description: "Black Box Delta", timelineSupport: false }],
  [0x1404, { description: "Black Box PKG", timelineSupport: false }],
  [0x1405, { description: "Telemetry Delta V2", timelineSupport: false }],
  [0x1406, { description: "G Force Event", timelineSupport: false }],
  [0x1407, { description: "Telemetry Delta V3", timelineSupport: false }],
  [0x1500, { description: "Accessory Report", timelineSupport: false }],
  [0x1501, { description: "Accessory Report V2", timelineSupport: false }],
  [0x1600, { description: "TPMS PKG", timelineSupport: false }],
  [0xFFFF, { description: "ACK/NACK Response", timelineSupport: false }],
  [0x2001, { description: "RESET", timelineSupport: false }],
  [0x200A, { description: "REQUEST POSITION", timelineSupport: false }],
  [0x2005, { description: "ACTUATORS", timelineSupport: false }],
  [0x2004, { description: "SECURITY ACTUATORS", timelineSupport: false }],
  [0x2003, { description: "CYCLIC ACTUATORS", timelineSupport: false }],
  [0x200B, { description: "TEXT MSG TO DATA TERMINAL", timelineSupport: false }],
  [0x200C, { description: "DATA TERMINAL AUDIO", timelineSupport: false }],
  [0x2010, { description: "SET ODOMETER", timelineSupport: false }],
  [0x2011, { description: "SET HOURMETER", timelineSupport: false }],
  [0x2014, { description: "SET FUEL", timelineSupport: false }],
  [0x2012, { description: "RESET ALARM - CLEAR", timelineSupport: false }],
  [0x2013, { description: "RESET ALARM - KEEP", timelineSupport: false }],
  [0x2015, { description: "SET TPMS TEST TIMEOUT", timelineSupport: false }],
  [0x3000, { description: "SET CONFIGURATIONS", timelineSupport: false }],
  [0x3100, { description: "READ CONFIGURATIONS", timelineSupport: false }],
  [0x3200, { description: "READ CONTEXT INFO", timelineSupport: false }],
  [0x201A, { description: "ENABLE RISK ANALYSIS", timelineSupport: false }],
  [0x201B, { description: "DISABLE RISK ANALYSIS", timelineSupport: false }],
  [0x201C, { description: "REQUEST BLACKBOX", timelineSupport: false }],
  [0x201D, { description: "START YMODEM RECEIVE", timelineSupport: false }],
  [0x201E, { description: "FORCE MDM REPORT", timelineSupport: false }],
  [0x2020, { description: "REQUEST UPLOAD DIR", timelineSupport: false }],
  [0x2021, { description: "REQUEST UPLOAD LOG", timelineSupport: false }],
  [0x2022, { description: "REQUEST TAIL LOG", timelineSupport: false }],
  [0x4000, { description: "EMBEDDED FILE - GET", timelineSupport: false }],
  [0x4001, { description: "EMBEDDED FILE - CREATE", timelineSupport: false }],
  [0x4002, { description: "EMBEDDED FILE - WRITE", timelineSupport: false }],
  [0x4003, { description: "EMBEDDED FILE - CLOSE", timelineSupport: false }],
  [0x4004, { description: "EMBEDDED FILE - DELETE", timelineSupport: false }],
  [0x4010, { description: "EMBEDDED FILE - DNLD", timelineSupport: false }],
  [0x4011, { description: "EMBEDDED FILE - CANCEL DNLD", timelineSupport: false }],
  [0x200D, { description: "Embedded Actions Filter", timelineSupport: false }],
  [0x200E, { description: "Factory Reset", timelineSupport: false }]
]);


const telemetryEventsList = new Map([
    [1,"WARNING EXCESS RPM"],
    [2,"EXCESS RPM"],
    [3,"WARNING SPEED EXCESS DRY"],
    [4,"SPEED EXCESS DRY"],
    [5,"WARNING SPEED EXCESS WET"],
    [6,"SPEED EXCESS WET"],
    [7,"WARNING NEUTRAL COASTING"],
    [8,"NEUTRAL COASTING"],
    [9,"WARNING EXCESS STOP TIME"],
    [10,"EXCESS STOP TIME"],
    [11,"WARNING CLUTCH EXCESS"],
    [12,"CLUTCH EXCESS"],
    [13,"ACC EXCESS"],
    [14,"BRAKE EXCESS"],
    [15,"ROTO WARNING SPEED EXCESS DRY"],
    [16,"ROTO SPEED EXCESS DRY"],
    [17,"ROTO WARNING SPEED EXCESS WET"],
    [18,"ROTO SPEED EXCESS WET"],
    [19,"G-FORCE LATERAL"],
    [20,"AIR BREAK PRESSURE TOO LOW"],
    [21,"SEATBELT FAULT"],
    [22,"FUEL TANK FALL EXCESS"],
    [23,"EXCESS LIQUID COOLING TEMPERATURE"],
    [24,"EXCESS MOTOR OIL TEMPERATURE" ],
    [25,"EXCESS MOTOR OIL PRESSURE" ],
    [26,"KICKDOWN_EXCESS" ],
    [27,"LIQUID_COOLING_LEVEL_TOO_LOW"],
    [28,"OIL_LEVEL_TOO_LOW" ],
    [29,"CATALYST_LEVEL_TOO_LOW" ],
    [30,"WATER_IN_FUEL" ],
    [31,"DIFFERENTIAL_BLOCKED"]
]);


const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";

let pkgCounter = 0;
let offlinePkgCounter = 0;
let errPkgCounter = 0;

function clearPkgCounters() {
    pkgCounter = 0;
    offlinePkgCounter = 0;
    errPkgCounter = 0;
}

function detectCC33Frames(text, opt = { highlight: false }) {
    const lines = text.split(/\r?\n/);
    const headerLen = LOG_HEADER_EXAMPLE.length;

    let isCollectingFrame = false;
    let lineIndexes = [];         // guarda os índices das linhas que pertencem ao pacote

    function flushPackage() {
        if (lineIndexes.length === 0) return;

        pkgCounter++;
        const total = lineIndexes.length;
        
        try {
            let frameStr = "";
            for (let i = 0; i < total; i++) {
                frameStr += lines[lineIndexes[i]].slice(headerLen);
            }

            const {parseOk, connState, messages} = parseCC33Frame(util.hexToBuffer(frameStr), "validate");

            for (const msg of messages) {
                if((msg.id === 0xFFFF && readPkgAnalyzeConfig("ignoreAck") === "1")
                 ||(msg.id === 0x0000 && readPkgAnalyzeConfig("ignoreKeepAlive") === "1")) {
                    lineIndexes = []; // reset linhas
                    pkgCounter--; // remove esse pacote da contagem
                    return; // pula pacote
                }
            }

            if(parseOk && connState === "Offline")
                offlinePkgCounter++;

            if (opt.highlight)
                highlightPackage(pkgCounter, parseOk, connState, lines, lineIndexes);

        } catch (e) {
            console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            errPkgCounter++;
            if (opt.highlight)
                highlightPackage(pkgCounter, false, "", lines, lineIndexes);
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

    console.log(`Quantidade Total de Pacotes: ${pkgCounter}\r\nPacotes Offline: ${offlinePkgCounter}\r\nPacotes com erro: ${errPkgCounter}`);
    
    if(opt.highlight) {
        // se foi solicitado para fazer highlight
        // retorna o texto html modificado para os pacotes CC33 ficarem destacados
        return lines.join("\n");
    } else {
        // faz nada por enquanto
    }
}

/**
 * @param {Uint8Array} u8buf
 * @param {string} processMode?: "validate" | "collect",
 */
function parseCC33Frame(u8buf, processMode) {
    const br = createBinaryReader(u8buf, {
        processMode,
        tableMode: "nsv"
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
        messages.push(msgId);

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
        headers: br.headers, 
        rows: br.rows,
        messages
    };  
}

/**
 * Mostra os campos (parse) de uma mensagem específica (msgId + payload data),
 * gerando uma tabela via util.createTable().
 *
 * @param {number} msgID  uint16
 * @param {Uint8Array} data
 */
function parseMessage(msgID, data, showOnTable = true) {
    const br = createBinaryReader(data, {
        processMode: showOnTable ? "collect" : "validate",
        tableMode: "nsv"
    });

    let implemented = true;
    
    // -------- switch principal --------
    switch (msgID) {
        case 0x1101: {
            br.add_row_u8("Protocol Version");
            br.add_row_u32_timestamp("Position Timestamp");
            br.add_row_i32_coord("Latitude");
            br.add_row_i32_coord("Longitude");
            br.add_row_u8("GPS Fix");
            br.add_row_u8("HDOP");
            br.add_row_u16("Altitude (m)");
            br.add_row_u8("GPS Speed (km/h)");
            br.add_row_hex_u16("Status Input");
            br.add_row_hex_u16("Status Output");
            br.add_row_u32("Odometer (m)");
            br.add_row_u32("Hourmeter (s)");
            br.add_row_u16("Power Voltage (V)", true, (v) => {
                return (v / 100.0).toFixed(2).replace(/\.?0+$/, "");
            });
            br.add_row_u16("Internal Battery Voltage (V)", true, (v) => {
                return (v / 100.0).toFixed(2).replace(/\.?0+$/, "");
            });
            br.add_row_hex_u32("Position Flags");
            br.add_row_u32("GPS Fix Timestamp");
            br.add_row_u16("GPS Course");
            br.add_row_u8("VDOP");
            br.add_row_u8("PDOP");
            br.add_row_u8("Satelites Count");
            br.add_row_u8("RSSI");
            br.add_row_u16("Carrier");
            br.add_row_u8("Temperature");
            br.add_row_hex_u32("Report Reason");
            break;
        }

        case 0x1121: {
            for (let i = 0; i < 6; i++) {
                br.add_row_i16(`A/D[${i}] (mV)`);
            }
            br.add_row_hex_u16("Security Mode Input");
            br.add_row_hex_u16("Security Mode Output");
            br.add_row_u16("Macro ID");
            br.add_row_u32("Login ID 1");
            br.add_row_u32("Login ID 2");
            br.add_row_u32("RFU");
            const gzCount = br.add_row_u8("Geozones Count");
            for (let i = 0; i < gzCount; i++) {
                const group = br.read_u8(`Geozone Group[${i}]`);
                const id = br.read_u32(`Geozone ID[${i}]`);
                const gzId = (id & 0x00FFFFFF) >>> 0;
                const flags = (id >>> 24) & 0xFF;
                br.add_row(`GZ[${i}]`, 5 ,`Group=${group}, ID=${gzId}, Flags=${flags}`);
            }
            break;
        }

        case 0x1400: {
            br.add_row_u8("Speed (km/h)");
            br.add_row_u8("Fuel Level");
            br.add_row_u16("RPM");
            br.add_row_u32("Time Engine ON");
            br.add_row_u32("Time RPM Blue");
            br.add_row_u32("Time RPM Yellow");
            br.add_row_u32("Time RPM Green");
            br.add_row_u32("Time RPM Red");
            br.add_row_u32("Time Moving");
            br.add_row_u32("Time Ideling");
            br.add_row_u32("Total Fuel");
            br.add_row_u32("Odometer (m)");
            br.add_row_u32("Flags", true, (flags) => {  
                let text = `Raw: ${br.hex_u32(flags)} \r\n`;
                text += "Bits:  \r\n";
                text += `   *Odometer Accumulated: ${(flags & 0x00000001) ? "1" : "0"}\r\n`;
                text += `   *Flag Calibration -> Avail:${(flags & 0x00000002) ? "1" : "0"}, Status:${(flags & 0x00000004) ? "1" : "0"}\r\n`;
                text += `   *Clutch -> Avail:${(flags & 0x00000008) ? "1" : "0"}, Status:${(flags & 0x00000010) ? "1" : "0"}\r\n`;
                text += `   *Brake -> Avail:${(flags & 0x00000020) ? "1" : "0"}, Status:${(flags & 0x00000040) ? "1" : "0"}\r\n`;
                text += `   *Parking Brake -> Avail:${(flags & 0x00000080) ? "1" : "0"}, Status:${(flags & 0x00000100) ? "1" : "0"}\r\n`;
                text += `   *Retarder -> Avail:${(flags & 0x00000200) ? "1" : "0"}, Status:${(flags & 0x00000400) ? "1" : "0"}\r\n`;
                text += `   *Wiper Status:${(flags & 0x00000800) ? "1" : "0"}\r\n`;
                text += `   *Rain Detected:${(flags & 0x00001000) ? "1" : "0"}\r\n`;
                return text;
            });

            if (br.getLength() > br.getOffset()) {
                br.add_row_i16("Arref Temp (°C)");
                br.add_row_i16("Fuel Temp (°C)");
                br.add_row_i16("Oil Temp (°C)");
                br.add_row_u16("Bat (mV)");
                br.add_row_u16("Oil Press (kpa)");
                br.add_row_u16("Air Brake Press (kpa)");
            }
            break;
        }
/*
        case 0x1401: {
            br.add_row_u8("Type");
            br.add_row_u32("Time RPM Blue");
            br.add_row_u32("Time RPM Green");
            br.add_row_u32("Time RPM Yellow");
            br.add_row_u32("Time RPM Red");
            br.add_row_u32("Total Time");
            br.add_row_u32("Time Ideling");
            br.add_row_u32("Time Retarder");
            br.add_row_u32("Fuel (ml)");
            br.add_row_u32("Distance (m)");
            br.add_row_u32("RFU");
            br.add_row_u32("RFU");
            br.add_row_u32("Driver ID");
            break;
        }
*/
        case 0x1405: {
            br.add_row_u8("Type");
            const unidades = ["Tempo", "Distância"];
            const parameters = ["Total ON", "Inercia", "Torque", "Ascendente", "Descendente"];
            const faixas = ["Lenta", "Transição", "Verde", "Amarela", "Perigo", "Extra Verde"];
            unidades.forEach(unidade => {
                parameters.forEach(param => {
                    faixas.forEach(faixa => {
                        br.add_row_u16(`${unidade} ${param} - ${faixa}`);
                    });
                });
            })
            br.add_row_u16("Tempo Total Parado ON");
            br.add_row_u32("Tempo Total do Delta");
            br.add_row_u32("Total Combustivel Consumido");
            br.add_row_u32("Driver ID");
            break;
        }
/*
        case 0x4010: {
            const strList = util.splitNullTerminatedAscii(data);

            if (strList.length < 6) {
                rows.push(["Erro", "Error in Data Buffer"]);
                break;
            }

            const protoCode = strList[0];
            const strProto =
                protoCode === "1" ? "http" :
                    protoCode === "2" ? "https" :
                        protoCode === "3" ? "ftp" : "";

            rows.push(["Protocol", `${strList[0]} (${strProto})`]);
            rows.push(["Host", strList[1]]);
            rows.push(["Port", strList[2]]);
            rows.push(["Login", strList[3]]);
            rows.push(["Pwd", strList[4]]);
            rows.push(["PathFile", strList[5]]);
            rows.push(["***URL***", `${strProto}://${strList[1]}:${strList[2]}${strList[5]}`]);
            break;
        }

        case 0x1200:
        case 0x200B: {
            if (msgID === 0x1200) {
                rows.push(["Message Type", hex_u16(read_u16())]);
                br.add_row_u32("RFU");
            }

            rows.push(["Timestamp", util.epochSecondsToString(read_u32())]);

            br.add_row_u32("Message ID");
            br.add_row_u32("RFU");

            rows.push(["Message", util.asciiFromOffset(count)]);
            count = data.length;
            break;
        }

        case 0x1300:
        case 0x3000: {
            while (count < dv.byteLength) {
                const b0 = read_u8();
                const b1 = read_u8();
                const b2 = read_u8();
                const strID = `${b0.toString(16).toUpperCase().padStart(2, "0")} ` +
                    `${b1.toString(16).toUpperCase().padStart(2, "0")} ` +
                    `${b2.toString(16).toUpperCase().padStart(2, "0")}`;

                const size = read_u8();
                const blob = read_bytes(size);

                rows.push([strID, String(size), util.bufferToHex(blob)]);
            }

            util.createTable(ui.packageTable, ["ID", "Size", "Data (Hex Buffer)"], rows);
            return true;
        }

        case 0x1310: {
            while (count < dv.byteLength) {
                const id = read_u16();
                const val = read_u32();
                rows.push([String(id), (val >>> 0).toString(16).toUpperCase().padStart(8, "0")]);
            }

            util.createTable(ui.packageTable, ["ID (index)", "Data (Hex)"], rows);
            return true;
        }

        case 0x3100:
        case 0x3200: {
            while (count < dv.byteLength) {
                if (msgID === 0x3100) {
                    const a = read_u8();
                    const b = read_u8();
                    const c = read_u8();
                    rows.push([`${a.toString(16).toUpperCase().padStart(2, "0")} ${b.toString(16).toUpperCase().padStart(2, "0")} ${c.toString(16).toUpperCase().padStart(2, "0")}`]);
                } else {
                    rows.push([String(read_u16())]);
                }
            }

            util.createTable(ui.packageTable, ["ID"], rows);
            return true;
        }

        case 0x4004: {
            rows.push([getAsciiStringAll()]);
            util.createTable(ui.packageTable, ["File Name"], rows);
            return true;
        }
*/
        case 0x1402: {
            const eventID = br.add_row_u8('Event ID', (v) => {
                let evDesc;
                if(telemetryEventsList.has(v)) 
                    evDesc = telemetryEventsList.get(v);
                else
                    evDesc = "Evento Desconhecido";
                return `${v} - ${evDesc}`;
            });

            br.add_row_u16("Max RPM");
            br.add_row_u16("Min RPM");
            br.add_row_u16("Max Speed");
            br.add_row_u16("Min Speed");
            br.add_row_u16("Event Duration");
            br.add_row_u16("Break Duration");
            br.add_row_u16("RPM Limit");
            br.add_row_u16("Speed Limit");
            br.add_row_i32_coord("Latitude");
            br.add_row_i32_coord("Longitude");

            if (eventID === 19) {
                br.add_row_u8("Event Type", (v) => {
                    return `${v} - ${v === 1 ? "Left" : v === 2 ? "Right" : ""}`;
                });
                br.add_row_u8("Event Level", (v) => {
                    return `${v} - ${v === 1 ? "Fraca" : v === 2 ? "Média" : v === 3 ? "Forte" : ""}`;
                });
                br.add_row_u16("Threshold");
                br.add_row_u16("Max LevelUp");
                br.add_row_i16("Forward");
                br.add_row_i16("Lateral");
                br.add_row_i16("Vertical");
            } else if (eventID === 20) {
                br.add_row_u16("Press Threshold");
                br.add_row_u16("Lowest Pressure");
            } else if (eventID === 22) {
                br.add_row_u8("Fall Threshold");
                br.add_row_u16("Window");
                br.add_row_u8("previous tank level");
                br.add_row_u8("current tank level");
                br.add_row_u32_timestamp("previous tank timestamp");
                br.add_row_u32_timestamp("current tank timestamp");
            } else if (br.getLength() > br.getOffset()) {
                br.add_row_bytes_hex("Additional Data", br.getLength() - br.getOffset());
            }
            break;
        }

        case 0x1404: {
            // Info of packet (bb_pck_info_t)
            br.add_row_u8("status", (v) => {
                let text = "";
                switch(v) {
                    case 0x00: text = "ACK"; break;
                    case 0xAA: text = "Save"; break;
                    case 0xFF: text = "Free"; break;
                    default: text = "Unknown";
                }
                return `${br.hex_u8(v)} = ${text}`;
            });
            br.add_row_u8("currentDelta");
            br.add_row_u32_timestamp("Timestamp");
            br.add_row_u16("sizePck");
            br.add_row_u16("posPck");

            // Type of equipment (bb_pck_type_t)
            br.add_row_u8("protocol");
            br.add_row_u8("hardware");
            br.add_row_bytes_hex("firmware", 4, (buf) => {
                return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
            });
            br.add_row_u8("power_source", (v) => {
                return `(${v} / 4) = ${(v / 4.0).toFixed(2).replace(/\.?0+$/, "")} V`;
            });
            br.add_row_u8("power_battery", (v) => {
                return `(${v} / 50) = ${(v / 50.0).toFixed(2).replace(/\.?0+$/, "")} V`;
            });
            br.add_row_u8("temp_battery (°C)");
            br.add_row_bytes_BCD("SerialNumber", 5);

            // Info of vehicle (bb_pck_vehicle_t)
            br.add_row_u32("odometer (meters)");
            br.add_row_u32("horimeter (minutes)");
            br.add_row_u32("total_fuel (ml)");
            br.add_row_u8("level_fuel (%)");
            br.add_row_u8("can_protocol");

            // Info of drivers (bb_pck_driver_t) 
            br.add_row_u32("primaryDriver");
            br.add_row_u32("secondaryDriver");

            // Info location GPS
            br.add_row_i32_coord("Latitude");
            br.add_row_i32_coord("Longitude");
            br.add_row_u8("GPS speed (km/h)");
            br.add_row_u8("altitude (m x10)");
            br.add_row_u8("course (degress x2)");
            br.add_row_u8("GPS flags", (v) => {
                let text = `Raw: ${br.hex_u8(v)} \r\n`;
                text += `Bits: \r\n`;
                text += `   *satellites: ${v & 0x1F} (5 bits)\r\n`;

                let statusAntena = "";
                let valAntena = (v >> 5) & 0x03; 
                switch(valAntena) {
                    case 0: statusAntena = "Normal"; break;
                    case 1: statusAntena = "Open"; break;
                    case 2: statusAntena = "Short"; break;
                    case 3: statusAntena = "Unknown"; break;
                }

                text += `   *antenna: ${valAntena}, ${statusAntena} (2 bits)\r\n`;
                text += `   *fix: ${(v >> 7) & 0x01} (1 bit)\r\n`; 
                return text;
            });

            // Info IOs Events (bb_pck_io_events_t)
            br.add_row_hex_u8("dataAvailableMask");
            br.add_row_hex_u8("reserved");
            br.add_row_hex_u8("outputs");

            // Info available (bb_pck_available_t.telemetry)
            br.add_row_u16("TM available", true, (v) => {
                let text = `Raw: ${br.hex_u16(v)} \r\n`;
                text += `Bits: \r\n`;
                text += `   *speed: ${(v & 0x0001)}\r\n`;
                text += `   *rpm: ${(v & 0x0002) === 0 ? 0 : 1 }\r\n`;
                text += `   *odometer: ${(v & 0x0004) === 0 ? 0 : 1 }\r\n`;
                text += `   *fuel (rate?): ${(v & 0x0008) === 0 ? 0 : 1 }\r\n`;
                text += `   *total fuel: ${(v & 0x0010) === 0 ? 0 : 1 }\r\n`;
                text += `   *level tank: ${(v & 0x0020) === 0 ? 0 : 1 }\r\n`;
                text += `   *brake: ${(v & 0x0040) === 0 ? 0 : 1 }\r\n`;
                text += `   *parking brake: ${(v & 0x0080) === 0 ? 0 : 1 }\r\n`;

                text += `   *clutch: ${(v & 0x0100) === 0 ? 0 : 1 }\r\n`;
                text += `   *retarder: ${(v & 0x0200) === 0 ? 0 : 1 }\r\n`;
                text += `   *gears: ${(v & 0x0400) === 0 ? 0 : 1 }\r\n`;
                text += `   *reserved: ${(v & 0xF800) >> 11 } (5 bits)\r\n`;
                return text;
            });

            // Info available (bb_pck_available_t.module)
            br.add_row_u8("Module Enabled", (v) => {
                let text = `Raw: ${br.hex_u8(v)} \r\n`;
                text += `Bits: \r\n`;
                text += `   *ISV: ${(v & 0x01) === 0 ? 0 : 1 }\r\n`;
                text += `   *Telemetry: ${(v & 0x02) === 0 ? 0 : 1 }\r\n`;
                text += `   *Data Terminal: ${(v & 0x04) === 0 ? 0 : 1 }\r\n`;
                text += `   *Satellital: ${(v & 0x08) === 0 ? 0 : 1 }\r\n`;
                text += `   *Drive Time: ${(v & 0x10) === 0 ? 0 : 1 }\r\n`;
                text += `   *Rede de Acessorios: ${(v & 0x20) === 0 ? 0 : 1 }\r\n`;
                text += `   *RFU1: ${(v & 0x40) === 0 ? 0 : 1 }\r\n`;
                text += `   *RFU2: ${(v & 0x80) === 0 ? 0 : 1 }\r\n`;
                return text;
            });

            if (br.getLength() > br.getOffset()) {
                br.add_row_bytes_hex("SecondsPayload", br.getLength() - br.getOffset());
            }

            break;
        }

/*
        case 0x1600: {
            br.add_row_u64("Device Serial");

            rows.push(["Timestamp", util.epochSecondsToString(read_u32())]);

            br.add_row_u8("Device Position");
            br.add_row_u8("Pairing Status");

            rows.push(["Nominal Pressure", read_u8() * 5490]);
            rows.push(["Low-Pressure Warning", `${read_u8()}%`]);
            rows.push(["Low-Pressure Alert", `${read_u8()}%`]);
            br.add_row_u8("High-Temperature Alert");

            br.add_row_u32("RFU");

            need(1);
            const sensorsCount = dv.getUint8(count);
            count += 1;
            rows.push(["Sensors Count", sensorsCount]);

            for (let i = 0; i < sensorsCount; i++) {
                const prefix = `  [${i}] - `;

                const id = read_u32();
                rows.push([`${prefix}ID`, `0x${id.toString(16).toUpperCase()}`]);

                const rawPressure = read_u8();
                const psi = Math.round((rawPressure * 5490) / 6894.7448);
                rows.push([`${prefix}PRESSURE`, `${psi} PSI`]);

                rows.push([`${prefix}TEMPERATURE`, `${read_u8() - 50} Celsius`]);

                rows.push([`${prefix}POSITION`, hex_u8(read_u8())]);

                rows.push([`${prefix}RSSI`, read_u8()]);

                need(1);
                const b1 = dv.getUint8(count);
                count += 1;
                rows.push([`${prefix}STA COMM`, (b1 & 0x07)]);
                rows.push([`${prefix}MOVING`, ((b1 & 0x08) > 0).toString()]);
                rows.push([`${prefix}OPE MODE`, ((b1 >> 4) & 0x0F)]);

                need(1);
                const b2 = dv.getUint8(count);
                count += 1;
                rows.push([`${prefix}ALERT PRES`, (b2 & 0x03)]);
                rows.push([`${prefix}ALERT TEMP`, ((b2 & 0x04) > 0).toString()]);
                rows.push([`${prefix}ALERT BAT`, ((b2 & 0x08) > 0).toString()]);
                rows.push([`${prefix}vBAT`, ((((b2 >> 4) & 0x0F) + 20) / 10.0).toString()]);
            }

            count = data.length;
            break;
        }
*/
        default: {
            implemented = false;
        }
    }

    if(showOnTable) {
        showParsedMessageOnTable(implemented, msgID, br.headers, br.rows);
    }

    return true;
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
    util.createTable(ui.packageTable, headers, rows);
    ui.mainSplitter._setPaneVisible?.(2, true); // painel dp pacote parseado visivel
}

function showParsedMessageOnTable(implemented, msgID, headers, rows) {
    if(implemented) {
        ui.labelMessageDescription.textContent = getMsgName(msgID);
        util.createTable(ui.messageTable, headers, rows);
    } else {
        ui.labelMessageDescription.textContent = `Parseamento Não Implementado para ${getMsgName(msgID)}`;
        ui.messageTable.innerHTML = "";
    }
    ui.tableSplitter._setPaneVisible(2, true); // painel de mensagem parseado visivel
}

function getMsgName(id) {
    // garante 16 bits e formato X4
    const hex = id.toString(16).toUpperCase().padStart(4, "0");
    let ret = `0x${hex} - `;

    if (msgsList.has(id)) {
        ret += msgsList.get(id).description;
    }

    return ret;
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
