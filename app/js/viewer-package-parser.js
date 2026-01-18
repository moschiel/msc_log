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
    br.add_row_u16("Index do Pacote");
    br.add_row_u8("Tipo de Serviço", (v) => {
        let ackType = "";
        switch(v & 0x03) {
            case 0x00: ackType = "No ACK requested"; break;
            case 0x01: ackType = "ACK requested"; break;
            case 0x02: ackType = "ACK message"; break;
            case 0x03: ackType = "ACK invalid option"; break;
        }
        let connState = (v & 0x80) > 0 ? "Online" : "Offline";
        return `${br.hex_u8(v)} - ${ackType}, ${connState}`;
    });

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
        createTable(ui.packageTable, br.headers, br.rows);
        ui.tablesContainer.classList.remove("hl-hidden");
        if(ui.messageTableWrapper.classList.contains("hl-hidden") === false)
            ui.messageTableWrapper.classList.add("hl-hidden");
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
function parseMessage(msgID, data, showOnTable = true) {
    const br = createBinaryReader(data, {
        processMode: showOnTable ? "collect" : "validate",
        tableMode: "nsv"
    });
    
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
                let innerHTML = `Raw: ${br.hex_u32(flags)} \r\n`;
                innerHTML += "Bits:  \r\n";
                innerHTML += `   *Odometer Accumulated: ${(flags & 0x00000001) ? "1" : "0"}\r\n`;
                innerHTML += `   *Flag Calibration -> Avail:${(flags & 0x00000002) ? "1" : "0"}, Status:${(flags & 0x00000004) ? "1" : "0"}\r\n`;
                innerHTML += `   *Clutch -> Avail:${(flags & 0x00000008) ? "1" : "0"}, Status:${(flags & 0x00000010) ? "1" : "0"}\r\n`;
                innerHTML += `   *Brake -> Avail:${(flags & 0x00000020) ? "1" : "0"}, Status:${(flags & 0x00000040) ? "1" : "0"}\r\n`;
                innerHTML += `   *Parking Brake -> Avail:${(flags & 0x00000080) ? "1" : "0"}, Status:${(flags & 0x00000100) ? "1" : "0"}\r\n`;
                innerHTML += `   *Retarder -> Avail:${(flags & 0x00000200) ? "1" : "0"}, Status:${(flags & 0x00000400) ? "1" : "0"}\r\n`;
                innerHTML += `   *Wiper Status:${(flags & 0x00000800) ? "1" : "0"}\r\n`;
                innerHTML += `   *Rain Detected:${(flags & 0x00001000) ? "1" : "0"}\r\n`;
                return innerHTML;
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
                br.add_row_u32("RFU");
            }

            rows.push(["Timestamp", epochSecondsToString(read_u32())]);

            br.add_row_u32("Message ID");
            br.add_row_u32("RFU");

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

            createTable(ui.packageTable, ["ID", "Size", "Data (Hex Buffer)"], rows);
            return true;
        }

        case 0x1310: {
            while (count < dv.byteLength) {
                const id = read_u16();
                const val = read_u32();
                rows.push([String(id), (val >>> 0).toString(16).toUpperCase().padStart(8, "0")]);
            }

            createTable(ui.packageTable, ["ID (index)", "Data (Hex)"], rows);
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

            createTable(ui.packageTable, ["ID"], rows);
            return true;
        }

        case 0x4004: {
            rows.push([getAsciiStringAll()]);
            createTable(ui.packageTable, ["File Name"], rows);
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
/*
        case 0x1404: {
            br.add_row_u8("status");
            br.add_row_u8("currentDelta");

            rows.push(["Timestamp", epochSecondsToString(read_u32())]);

            br.add_row_u16("sizePck");
            br.add_row_u16("posPck");

            br.add_row_u8("protocol");
            br.add_row_u8("hardware");

            rows.push(["firmware", bufferToHex(read_bytes(4))]);

            rows.push(["power_source", (read_u8() / 4.0).toFixed(2).replace(/\.?0+$/, "")]);
            rows.push(["power_battery", (read_u8() / 50.0).toFixed(2).replace(/\.?0+$/, "")]);
            br.add_row_u8("temp_battery");

            rows.push(["serial_number", bufferToHex(read_bytes(5))]);

            br.add_row_u32("odometer");
            br.add_row_u32("horimeter");
            br.add_row_u32("total_fuel");

            br.add_row_u8("level_fuel");
            br.add_row_u8("can_protocol");

            br.add_row_u32("primaryDriver");
            br.add_row_u32("secondaryDriver");

            rows.push(["Latitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);
            rows.push(["Longitude", (read_i32() / 10000000.0).toFixed(7).replace(/\.?0+$/, "")]);

            br.add_row_u8("speed");
            br.add_row_u8("altitude");
            br.add_row_u8("course");

            const bbAux = read_u8();
            rows.push(["satellites", (bbAux & 0x1F)]);
            rows.push(["antenna", ((bbAux >> 5) & 0x03)]);
            rows.push(["fix", ((bbAux >> 7) & 0x01)]);

            rows.push(["dataAvailableMask", hex_u8(read_u8())]);
            br.add_row_u8("reserved");
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
            br.add_row_u64("Device Serial");

            rows.push(["Timestamp", epochSecondsToString(read_u32())]);

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
            if (showOnTable)
                alert(`${getMsgName(msgID)} - Parseamento não implementado`);
            return false;
        }
    }

    if(showOnTable) {
        ui.labelMessageDescription.textContent = getMsgName(msgID);
        createTable(ui.messageTable, br.headers, br.rows);
        if(ui.messageTableWrapper.classList.contains("hl-hidden"))
            ui.messageTableWrapper.classList.remove("hl-hidden");
    }

    return true;
}

