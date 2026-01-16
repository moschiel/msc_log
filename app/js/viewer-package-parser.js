const tablesContainer = document.getElementById("tablesContainer");
const packageTable = document.getElementById("packageTable");
const messageTableWrapper =  document.getElementById("messageTableWrapper");
const btnClosePkgTable = document.getElementById("btnClosePkgTable");

btnClosePkgTable.addEventListener("click", () => {
    if(tablesContainer.classList.contains("hl-hidden") === false)
        tablesContainer.classList.add("hl-hidden");
    if(messageTableWrapper.classList.contains("hl-hidden") === false)
        messageTableWrapper.classList.add("hl-hidden");
});

packageTable.addEventListener("dblclick", (ev) => {
    try
    {
        const tr = ev.target.closest("tr");
        if (!tr) return;
    
        // se tiver <thead>, evita clicar no header
        if (tr.closest("thead")) return;
    
        const tds = Array.from(tr.cells);
        if (tds.length < 3) return;
    
        const col1Text = tds[0].textContent.trim();
        const col3Text = tds[2].textContent.trim();
    
        // 1) Primeira coluna: se começa com "0x" e len >= 6 -> Number
        let col1Number = null;
        if (col1Text.startsWith("0x") && col1Text.length >= 6 && isHexOnly(col1Text.substr(2, 4))) {
            col1Number = Number(col1Text.substr(0, 6)); // funciona com "0x...."
            if (Number.isNaN(col1Number)) return;
        } else {
            return;
        }
    
        // 2) Terceira coluna: se for texto hex -> Uint8Array
        let col3Bytes = null;
        try {
            col3Bytes = hexToBuffer(col3Text);
        } catch (e) {
            console.warn("Falha ao converter coluna 3 para Uint8Array:", e);
        }

        // 3) imprimir no log o valor da primeira coluna (convertido se aplicável)
        console.log("LOG col1:", col1Text.substr(0, 6));
        createTable("messageTable", ["Test1", "Test2", "Test3"], [
            [1,2,3],
            [4,5,6],
            [1,2,3],
            [4,5,6],
            [1,2,3],
            [4,5,6],
            [1,2,3],
            [4,5,6]
        ]);
        if(messageTableWrapper.classList.contains("hl-hidden"))
            messageTableWrapper.classList.remove("hl-hidden");
    }
    catch(e) 
    {
        console.error(e.message);
    }
});

// Mapa equivalente ao Dictionary<UInt16, string>
const msgsList = new Map([
    [0x0000, "Keep Alive"],
    [0x1000, "Reset INFO"],
    [0x1100, "Basic Position"],
    [0x1101, "Extended Position"],
    [0x1121, "MSC830 aditional Data"],
    [0x1122, "MSC530  aditional Data"],
    [0x1130, "Risk Rules Data"],
    [0x1140, "Login Event"],
    [0x1200, "Data Terminal Msg"],
    [0x1210, "Data Terminal Auth"],
    [0x1300, "Report Configurations"],
    [0x1310, "Report Context"],
    [0x1400, "Telemetry Data"],
    [0x1401, "Telemetry Delta"],
    [0x1402, "Telemetry Events"],
    [0x1403, "Black Box Delta"],
    [0x1404, "Black Box PKG"],
    [0x1405, "Telemetry Delta V2"],
    [0x1406, "G Force Event"],
    [0x1407, "Telemetry Delta V3"],
    [0x1500, "Accessory Report"],
    [0x1501, "Accessory Report V2"],
    [0x1600, "TPMS PKG"],
    [0xFFFF, "ACK/NACK Response"],
    [0x2001, "RESET"],
    [0x200A, "REQUEST POSITION"],
    [0x2005, "ACTUATORS"],
    [0x2004, "SECURITY ACTUATORS"],
    [0x2003, "CYCLIC ACTUATORS"],
    [0x200B, "TEXT MSG TO DATA TERMINAL"],
    [0x200C, "DATA TERMINAL AUDIO"],
    [0x2010, "SET ODOMETER"],
    [0x2011, "SET HOURMETER"],
    [0x2014, "SET FUEL"],
    [0x2012, "RESET ALARM - CLEAR"],
    [0x2013, "RESET ALARM - KEEP"],
    [0x2015, "SET TPMS TEST TIMEOUT"],
    [0x3000, "SET CONFIGURATIONS"],
    [0x3100, "READ CONFIGURATIONS"],
    [0x3200, "READ CONTEXT INFO"],
    [0x201A, "ENABLE RISK ANALYSIS"],
    [0x201B, "DISABLE RISK ANALYSIS"],
    [0x201C, "REQUEST BLACKBOX"],
    [0x201D, "START YMODEM RECEIVE"],
    [0x201E, "FORCE MDM REPORT"],
    [0x2020, "REQUEST UPLOAD DIR"],
    [0x2021, "REQUEST UPLOAD LOG"],
    [0x2022, "REQUEST TAIL LOG"],
    [0x4000, "EMBEDDED FILE - GET"],
    [0x4001, "EMBEDDED FILE - CREATE"],
    [0x4002, "EMBEDDED FILE - WRITE"],
    [0x4003, "EMBEDDED FILE - CLOSE"],
    [0x4004, "EMBEDDED FILE - DELETE"],
    [0x4010, "EMBEDDED FILE - DNLD"],
    [0x4011, "EMBEDDED FILE - CANCEL DNLD"],
    [0x200D, "Embedded Actions Filter"],
    [0x200E, "Factory Reset"]
]);

function getMsgName(id) {
    // garante 16 bits e formato X4
    const hex = id.toString(16).toUpperCase().padStart(4, "0");
    let ret = `0x${hex} - `;

    if (msgsList.has(id)) {
        ret += msgsList.get(id);
    }

    return ret;
}

/**
 * @param {Uint8Array} u8buf
 * @param {boolean} showOnTable,
 */
function parseCC33Frame(u8buf, showOnTable) {
    const br = createBinaryReader(u8buf, {
        processMode: showOnTable ? "collect" : "validate",
        tableMode: "nsv"
    });

    const start = br.read_u16("frame incial", false);
    if (start !== 0xCC33) throw new Error("Frame inicial invalido");

    const pkgSize = br.add_u16("Tamanho do pacote");

    const frameEnd = br.getOffset() + pkgSize;
    if (frameEnd > br.getLength()) {
        throw new Error(`Frame Size (${pkgSize}) é maior que o buffer (${br.getLength()})`);
    }

    const option = br.add_u8("Option", (v) => {
        if (v !== 0 && v !== 3) {
            throw new Error("Option inválida, deve ser 0 ou 3");
        }
        return (v === 0) ? "0 - Not Provider" : (v === 3) ? "3 - Provider" : v;
    });

    // ESN (se provider)
    if (option === 3) {
        br.add_hex_u16("Ignore", false);
        const esnSize = br.add_u8("Tamanho do SN");
        br.add_bytes_BCD("SerialNumber", esnSize);
    }

    // index / service type
    br.add_u16("Index do Pacote");
    br.add_hex_u8("Tipo de Serviço");

    // mensagens
    let newMsg = true;
    while (newMsg && (br.getOffset() < frameEnd)) {
        const msgId = br.read_u16("msgId", true);

        let msgSize = br.read_u16("msgSize", true);

        newMsg = (msgSize & 0x8000) !== 0;
        msgSize = (msgSize & 0x7FFF);

        const msgData = br.read_bytes("msgData", msgSize);

        br.add_row(getMsgName(msgId), msgSize, bufferToHex(msgData));
    }

    // (opcional) se sobrar algo até frameEnd, você pode logar/mostrar:
    // if (offset < frameEnd) add("Trailing bytes", frameEnd - offset, bufferToHex(br.read_bytes(frameEnd - offset)));

    if (showOnTable) {
        createTable("packageTable", br.headers, br.rows);
        tablesContainer.classList.remove("hl-hidden");
        if(messageTableWrapper.classList.contains("hl-hidden") === false)
            messageTableWrapper.classList.add("hl-hidden");
    }

    return true;
}


/**
 * Mostra os campos (parse) de uma mensagem específica (msgId + payload data),
 * gerando uma tabela via createTable().
 *
 * @param {number} msgID  uint16
 * @param {Uint8Array} data
 */
function showMsgFields(msgID, data) {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let count = 0;

    /** @type {Array<Array<any>>} */
    const rows = [];

    // ======== check mínimo (sem name) ========
    function need(n) {
        if (count + n > dv.byteLength) {
            throw new RangeError(`Buffer truncado: offset=${count}, precisa=${n}, len=${dv.byteLength}`);
        }
    }

    // ======== readers (LE) ========
    const read_u8 = () => { need(1); const v = dv.getUint8(count); count += 1; return v; };
    const read_i16 = () => { need(2); const v = dv.getInt16(count, true); count += 2; return v; };
    const read_u16 = () => { need(2); const v = dv.getUint16(count, true); count += 2; return v; };
    const read_i32 = () => { need(4); const v = dv.getInt32(count, true); count += 4; return v; };
    const read_u32 = () => { need(4); const v = dv.getUint32(count, true); count += 4; return v; };
    const read_u64 = () => { need(8); const v = dv.getBigUint64(count, true); count += 8; return v; };

    const read_bytes = (n) => { need(n); const s = data.slice(count, count + n); count += n; return s; };
    const skip = (n) => { need(n); count += n; };

    // ======== formatadores ========
    const hex_u8 = (v) => `0x${(v & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
    const hex_u16 = (v) => `0x${(v & 0xFFFF).toString(16).toUpperCase().padStart(4, "0")}`;
    const hex_u32 = (v) => `0x${(v >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;

    // ======== adders básicos ========
    const add_u8 = (name) => rows.push([name, read_u8()]);
    const add_i16 = (name) => rows.push([name, read_i16()]);
    const add_u16 = (name) => rows.push([name, read_u16()]);
    const add_i32 = (name) => rows.push([name, read_i32()]);
    const add_u32 = (name) => rows.push([name, read_u32()]);
    const add_u64 = (name) => rows.push([name, read_u64().toString()]);

    // ======== adders hex (CORRETOS: lê e depois formata) ========
    const add_hex_u8 = (name) => rows.push([name, hex_u8(read_u8())]);
    const add_hex_u16 = (name) => rows.push([name, hex_u16(read_u16())]);
    const add_hex_u32 = (name) => rows.push([name, hex_u32(read_u32())]);

    // -------- switch principal --------
    switch (msgID) {
        case 0x1101: {
            add_u8("Protocol Version");

            rows.push(["Position Timestamp", epochSecondsToString(read_u32())]);

            rows.push(["Latitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);
            rows.push(["Longitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);

            add_u8("GPS Fix");
            add_u8("HDOP");
            add_u16("Altitude (m)");
            add_u8("GPS Speed (km/h)");

            add_hex_u16("Status Input");
            add_hex_u16("Status Output");

            add_u32("Odometer (m)");
            add_u32("Hourmeter (s)");

            rows.push(["Power Voltage (V)", (read_u16() / 100.0).toFixed(2).replace(/\.?0+$/, "")]);
            rows.push(["Internal Battery Voltage (V)", (read_u16() / 100.0).toFixed(2).replace(/\.?0+$/, "")]);

            add_hex_u32("Position Flags");

            add_u32("GPS Fix Timestamp");
            add_u16("GPS Course");

            add_u8("VDOP");
            add_u8("PDOP");
            add_u8("Satelites Count");
            add_u8("RSSI");
            add_u16("Carrier");
            add_u8("Temperature");

            add_hex_u32("Report Reason");
            break;
        }

        case 0x1121: {
            for (let i = 0; i < 6; i++) {
                rows.push([`A/D[${i}] (mV)`, read_i16()]);
            }

            add_hex_u16("Security Mode Input");
            add_hex_u16("Security Mode Output");

            add_u16("Macro ID");
            add_u32("Login ID 1");
            add_u32("Login ID 2");
            add_u32("RFU");

            const gzCount = read_u8();
            rows.push(["Geozones Count", gzCount]);

            for (let i = 0; i < gzCount; i++) {
                const group = read_u8();
                const id = read_u32();
                const gzId = (id & 0x00FFFFFF) >>> 0;
                const flags = (id >>> 24) & 0xFF;
                rows.push([`GZ[${i}]`, `Group=${group}, ID=${gzId}, Flags=${flags}`]);
            }
            break;
        }

        case 0x1400: {
            add_u8("Speed (km/h)");
            add_u8("Fuel Level");
            add_u16("RPM");

            add_u32("Time Engine ON");
            add_u32("Time RPM Blue");
            add_u32("Time RPM Yellow");
            add_u32("Time RPM Green");
            add_u32("Time RPM Red");
            add_u32("Time Moving");
            add_u32("Time Ideling");
            add_u32("Total Fuel");
            add_u32("Odometer (m)");

            const flags = read_u32();
            rows.push(["Flags*", hex_u32(flags)]);

            rows.push(["*Odometer Accumulated", (flags & 0x00000001) ? "1" : "0"]);
            rows.push(["*Flag Calibration",
                `Available:${(flags & 0x00000002) ? "1" : "0"}, Status:${(flags & 0x00000004) ? "1" : "0"}`
            ]);
            rows.push(["*Clutch",
                `Available:${(flags & 0x00000008) ? "1" : "0"}, Status:${(flags & 0x00000010) ? "1" : "0"}`
            ]);
            rows.push(["*Brake",
                `Available:${(flags & 0x00000020) ? "1" : "0"}, Status:${(flags & 0x00000040) ? "1" : "0"}`
            ]);
            rows.push(["*Parking Brake",
                `Available:${(flags & 0x00000080) ? "1" : "0"}, Status:${(flags & 0x00000100) ? "1" : "0"}`
            ]);
            rows.push(["*Retarder",
                `Available:${(flags & 0x00000200) ? "1" : "0"}, Status:${(flags & 0x00000400) ? "1" : "0"}`
            ]);
            rows.push(["*Wiper Status", (flags & 0x00000800) ? "1" : "0"]);
            rows.push(["*Rain Detected", (flags & 0x00001000) ? "1" : "0"]);

            if (dv.byteLength > count) {
                add_i16("Arref Temp (°C)");
                add_i16("Fuel Temp (°C)");
                add_i16("Oil Temp (°C)");
                add_u16("Bat (mV)");
                add_u16("Oil Press (kpa)");
                add_u16("Air Brake Press (kpa)");
            }
            break;
        }

        case 0x1401: {
            add_u8("Type");
            add_u32("Time RPM Blue");
            add_u32("Time RPM Green");
            add_u32("Time RPM Yellow");
            add_u32("Time RPM Red");
            add_u32("Total Time");
            add_u32("Time Ideling");
            add_u32("Time Retarder");
            add_u32("Fuel (ml)");
            add_u32("Distance (m)");
            add_u32("RFU");
            add_u32("RFU");
            add_u32("Driver ID");
            break;
        }

        case 0x1405: {
            add_u8("Type");

            const addU16 = (name) => rows.push([name, read_u16()]);

            addU16("Tempo Total ON - Lenta");
            addU16("Tempo Total ON - Transição");
            addU16("Tempo Total ON - Verde");
            addU16("Tempo Total ON - Amarela");
            addU16("Tempo Total ON - Perigo");
            addU16("Tempo Total ON - Extra Verde");

            addU16("Tempo Inercia - Lenta");
            addU16("Tempo Inercia - Transição");
            addU16("Tempo Inercia - Verde");
            addU16("Tempo Inercia - Amarela");
            addU16("Tempo Inercia - Perigo");
            addU16("Tempo Inercia - Extra Verde");

            addU16("Tempo Torque - Lenta");
            addU16("Tempo Torque - Transição");
            addU16("Tempo Torque - Verde");
            addU16("Tempo Torque - Amarela");
            addU16("Tempo Torque - Perigo");
            addU16("Tempo Torque - Extra Verde");

            addU16("Tempo Ascendente - Lenta");
            addU16("Tempo Ascendente - Transição");
            addU16("Tempo Ascendente - Verde");
            addU16("Tempo Ascendente - Amarela");
            addU16("Tempo Ascendente - Perigo");
            addU16("Tempo Ascendente - Extra Verde");

            addU16("Tempo Descendente - Lenta");
            addU16("Tempo Descendente - Transição");
            addU16("Tempo Descendente - Verde");
            addU16("Tempo Descendente - Amarela");
            addU16("Tempo Descendente - Perigo");
            addU16("Tempo Descendente - Extra Verde");

            addU16("Distancia Total ON - Lenta");
            addU16("Distancia Total ON - Transição");
            addU16("Distancia Total ON - Verde");
            addU16("Distancia Total ON - Amarela");
            addU16("Distancia Total ON - Perigo");
            addU16("Distancia Total ON - Extra Verde");

            addU16("Distancia Inercia - Lenta");
            addU16("Distancia Inercia - Transição");
            addU16("Distancia Inercia - Verde");
            addU16("Distancia Inercia - Amarela");
            addU16("Distancia Inercia - Perigo");
            addU16("Distancia Inercia - Extra Verde");

            addU16("Distancia Torque - Lenta");
            addU16("Distancia Torque - Transição");
            addU16("Distancia Torque - Verde");
            addU16("Distancia Torque - Amarela");
            addU16("Distancia Torque - Perigo");
            addU16("Distancia Torque - Extra Verde");

            addU16("Distancia Ascendente - Lenta");
            addU16("Distancia Ascendente - Transição");
            addU16("Distancia Ascendente - Verde");
            addU16("Distancia Ascendente - Amarela");
            addU16("Distancia Ascendente - Perigo");
            addU16("Distancia Ascendente - Extra Verde");

            addU16("Distancia Descendente - Lenta");
            addU16("Distancia Descendente - Transição");
            addU16("Distancia Descendente - Verde");
            addU16("Distancia Descendente - Amarela");
            addU16("Distancia Descendente - Perigo");
            addU16("Distancia Descendente - Extra Verde");

            addU16("Tempo Total Parado ON");
            add_u32("Tempo Total do Delta");
            add_u32("Total Combustivel Consumido");
            add_u32("Driver ID");
            break;
        }

        case 0x4010: {
            const strList = splitNullTerminatedAscii(data);

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
                add_u32("RFU");
            }

            rows.push(["Timestamp", epochSecondsToString(read_u32())]);

            add_u32("Message ID");
            add_u32("RFU");

            rows.push(["Message", asciiFromOffset(count)]);
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

                rows.push([strID, String(size), bufferToHex(blob)]);
            }

            createTable("packageTable", ["ID", "Size", "Data (Hex Buffer)"], rows);
            return true;
        }

        case 0x1310: {
            while (count < dv.byteLength) {
                const id = read_u16();
                const val = read_u32();
                rows.push([String(id), (val >>> 0).toString(16).toUpperCase().padStart(8, "0")]);
            }

            createTable("packageTable", ["ID (index)", "Data (Hex)"], rows);
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

            createTable("packageTable", ["ID"], rows);
            return true;
        }

        case 0x4004: {
            rows.push([getAsciiStringAll()]);
            createTable("packageTable", ["File Name"], rows);
            return true;
        }

        case 0x1402: {
            const eventID = read_u8();
            const evDesc = (typeof telemetryEventsList !== "undefined" && telemetryEventsList.has(eventID))
                ? ` - ${telemetryEventsList.get(eventID)}`
                : "";
            rows.push(["Event ID", `${eventID}${evDesc}`]);

            add_u16("Max RPM");
            add_u16("Min RPM");
            add_u16("Max Speed");
            add_u16("Min Speed");
            add_u16("Event Duration");
            add_u16("Break Duration");
            add_u16("RPM Limit");
            add_u16("Speed Limit");

            rows.push(["Latitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);
            rows.push(["Longitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);

            if (eventID === 19) {
                const evType = read_u8();
                const evLevel = read_u8();

                rows.push(["Event Type", `${evType} - ${evType === 1 ? "Left" : evType === 2 ? "Right" : ""}`]);
                rows.push(["Event Level", `${evLevel} - ${evLevel === 1 ? "Fraca" : evLevel === 2 ? "Média" : evLevel === 3 ? "Forte" : ""}`]);

                add_u16("Threshold");
                add_u16("Max LevelUp");
                add_i16("Forward");
                add_i16("Lateral");
                add_i16("Vertical");
            } else if (eventID === 20) {
                add_u16("Press Threshold");
                add_u16("Lowest Pressure");
            } else if (eventID === 22) {
                add_u8("Fall Threshold");
                add_u16("Window");
                add_u8("previous tank level");
                add_u8("current tank level");

                rows.push(["previous tank timestamp", epochSecondsToString(read_u32())]);
                rows.push(["current tank timestamp", epochSecondsToString(read_u32())]);
            } else if (dv.byteLength > count) {
                rows.push(["Additional Data", bufferToHex(data.slice(count))]);
                count = data.length;
            }
            break;
        }

        case 0x1404: {
            add_u8("status");
            add_u8("currentDelta");

            rows.push(["Timestamp", epochSecondsToString(read_u32())]);

            add_u16("sizePck");
            add_u16("posPck");

            add_u8("protocol");
            add_u8("hardware");

            rows.push(["firmware", bufferToHex(read_bytes(4))]);

            rows.push(["power_source", (read_u8() / 4.0).toFixed(2).replace(/\.?0+$/, "")]);
            rows.push(["power_battery", (read_u8() / 50.0).toFixed(2).replace(/\.?0+$/, "")]);
            add_u8("temp_battery");

            rows.push(["serial_number", bufferToHex(read_bytes(5))]);

            add_u32("odometer");
            add_u32("horimeter");
            add_u32("total_fuel");

            add_u8("level_fuel");
            add_u8("can_protocol");

            add_u32("primaryDriver");
            add_u32("secondaryDriver");

            rows.push(["Latitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);
            rows.push(["Longitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);

            add_u8("speed");
            add_u8("altitude");
            add_u8("course");

            const bbAux = read_u8();
            rows.push(["satellites", (bbAux & 0x1F)]);
            rows.push(["antenna", ((bbAux >> 5) & 0x03)]);
            rows.push(["fix", ((bbAux >> 7) & 0x01)]);

            rows.push(["dataAvailableMask", hex_u8(read_u8())]);
            add_u8("reserved");
            rows.push(["outputs", hex_u8(read_u8())]);

            const bb3 = read_bytes(3);
            rows.push(["bb_pck_available_t", "0x" + bufferToHex(bb3).match(/../g).join(" 0x")]);

            if (dv.byteLength > count) {
                rows.push(["SecondsPayload", bufferToHex(data.slice(count))]);
                count = data.length;
            }
            break;
        }

        case 0x1600: {
            add_u64("Device Serial");

            rows.push(["Timestamp", epochSecondsToString(read_u32())]);

            add_u8("Device Position");
            add_u8("Pairing Status");

            rows.push(["Nominal Pressure", read_u8() * 5490]);
            rows.push(["Low-Pressure Warning", `${read_u8()}%`]);
            rows.push(["Low-Pressure Alert", `${read_u8()}%`]);
            add_u8("High-Temperature Alert");

            add_u32("RFU");

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

        default: {
            rows.push(["Info", `${getMsgName(msgID)} - Package Details is not implemented yet`]);
            break;
        }
    }

    // default: tabela Name/Value
    createTable("packageTable", ["Name", "Value"], rows);
    return true;
}

