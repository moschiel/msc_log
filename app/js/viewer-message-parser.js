// @ts-ignore
import { util } from "./utils.js";
// @ts-ignore
import { setSplitterPaneVisible } from "./split-pane.js";
// @ts-ignore
import { ui } from "./viewer-ui-elements.js";
// @ts-ignore
import { createBinaryReader } from "./viewer-binary-reader.js";

/**
 * ID e descrição das mensagens, e se suportam listagem
 */
export const msgsList = new Map([
    [0x0000, { description: "Keep Alive" }],

    [0x1000, { description: "Reset INFO", listSupport: true }],
    [0x1100, { description: "Basic Position" }],
    [0x1101, { description: "Extended Position", listSupport: true }],
    [0x1121, { description: "MSC830 aditional Data", listSupport: true }],
    [0x1122, { description: "MSC530  aditional Data" }],
    [0x1130, { description: "Risk Rules Data", listSupport: true }],
    [0x1140, { description: "Login Event" }],
    [0x1200, { description: "Data Terminal Msg", listSupport: true }],
    [0x1210, { description: "Data Terminal Auth" }],
    [0x1300, { description: "Report Configurations", listSupport: true }],
    [0x1310, { description: "Report Context", listSupport: true }],
    [0x1400, { description: "Telemetry Data", listSupport: true }],
    [0x1401, { description: "Telemetry Delta" }],
    [0x1402, { description: "TM Event", listSupport: true }],
    [0x1403, { description: "Black Box Delta" }],
    [0x1404, { description: "Black Box PKG", listSupport: true }],
    [0x1405, { description: "Telemetry Delta V2", listSupport: true }],
    [0x1406, { description: "G Force Event" }],
    [0x1407, { description: "Telemetry Delta V3" }],
    [0x1500, { description: "Accessory Report" }],
    [0x1501, { description: "Accessory Report V2" }],
    [0x1600, { description: "TPMS PKG" }],

    [0x2001, { description: "RESET" }],
    [0x2003, { description: "CYCLIC ACTUATORS" }],
    [0x2004, { description: "SECURITY ACTUATORS" }],
    [0x2005, { description: "ACTUATORS", listSupport: true }],
    [0x200A, { description: "REQUEST POSITION", listSupport: true }],
    [0x200B, { description: "TEXT MSG TO DATA TERMINAL", listSupport: true }],
    [0x200C, { description: "DATA TERMINAL AUDIO" }],
    [0x200D, { description: "Embedded Actions Filter" }],
    [0x200E, { description: "Factory Reset" }],
    [0x2010, { description: "SET ODOMETER" }],
    [0x2011, { description: "SET HOURMETER" }],
    [0x2012, { description: "RESET ALARM - CLEAR" }],
    [0x2013, { description: "RESET ALARM - KEEP" }],
    [0x2014, { description: "SET FUEL" }],
    [0x2015, { description: "SET TPMS TEST TIMEOUT" }],
    [0x201A, { description: "ENABLE RISK ANALYSIS" }],
    [0x201B, { description: "DISABLE RISK ANALYSIS" }],
    [0x201C, { description: "REQUEST BLACKBOX" }],
    [0x201D, { description: "START YMODEM RECEIVE" }],
    [0x201E, { description: "FORCE MDM REPORT" }],
    [0x2020, { description: "REQUEST UPLOAD DIR" }],
    [0x2021, { description: "REQUEST UPLOAD LOG" }],
    [0x2022, { description: "REQUEST TAIL LOG", listSupport: true }],
    [0x2027, { description: "CANCEL UPLOAD REQUEST", listSupport: true }],

    [0x3000, { description: "SET CONFIGURATIONS", listSupport: true }],
    [0x3100, { description: "READ CONFIGURATIONS", listSupport: true }],
    [0x3200, { description: "READ CONTEXT INFO", listSupport: true }],

    [0x4000, { description: "EMBEDDED FILE - GET" }],
    [0x4001, { description: "EMBEDDED FILE - CREATE" }],
    [0x4002, { description: "EMBEDDED FILE - WRITE" }],
    [0x4003, { description: "EMBEDDED FILE - CLOSE" }],
    [0x4004, { description: "EMBEDDED FILE - DELETE" }],
    [0x4010, { description: "EMBEDDED FILE - DNLD", listSupport: true }],
    [0x4011, { description: "EMBEDDED FILE - CANCEL DNLD" }],

    [0xFFFF, { description: "ACK/NACK Response" }]
]);


/**
 * ID e descrição das eventos de telemetria, e se suportam listagem
 */
const telemetryEventsList = new Map([
    [1, "WARNING EXCESS RPM"],
    [2, "EXCESS RPM"],
    [3, "WARNING SPEED EXCESS DRY"],
    [4, "SPEED EXCESS DRY"],
    [5, "WARNING SPEED EXCESS WET"],
    [6, "SPEED EXCESS WET"],
    [7, "WARNING NEUTRAL COASTING"],
    [8, "NEUTRAL COASTING"],
    [9, "WARNING EXCESS STOP TIME"],
    [10, "EXCESS STOP TIME"],
    [11, "WARNING CLUTCH EXCESS"],
    [12, "CLUTCH EXCESS"],
    [13, "ACC EXCESS"],
    [14, "BRAKE EXCESS"],
    [15, "ROTO WARNING SPEED EXCESS DRY"],
    [16, "ROTO SPEED EXCESS DRY"],
    [17, "ROTO WARNING SPEED EXCESS WET"],
    [18, "ROTO SPEED EXCESS WET"],
    [19, "G-FORCE LATERAL"],
    [20, "AIR BREAK PRESSURE TOO LOW"],
    [21, "SEATBELT FAULT"],
    [22, "FUEL TANK FALL EXCESS"],
    [23, "EXCESS LIQUID COOLING TEMPERATURE"],
    [24, "EXCESS MOTOR OIL TEMPERATURE"],
    [25, "EXCESS MOTOR OIL PRESSURE"],
    [26, "KICKDOWN_EXCESS"],
    [27, "LIQUID_COOLING_LEVEL_TOO_LOW"],
    [28, "OIL_LEVEL_TOO_LOW"],
    [29, "CATALYST_LEVEL_TOO_LOW"],
    [30, "WATER_IN_FUEL"],
    [31, "DIFFERENTIAL_BLOCKED"]
]);

/**
 * Retorna a descrição de uma mensagem pelo seu ID.
 *
 * @param {Number} id id da mensagem
 * @param {Number|null} evId id de evento de telemetria
 * @returns {string} descrição da mensagem
 */
export function getMsgName(id, evId = null) {
    // garante 16 bits e formato X4
    const hex = id.toString(16).toUpperCase().padStart(4, "0");
    let ret = `0x${hex} - `;

    if (msgsList.has(id)) {
        ret += msgsList.get(id).description;
        if (evId) {
            ret += ` (${evId} - ${telemetryEventsList.get(evId)})`;
        }
    }

    return ret;
}


/**
 * Preenche a tabela #parsedMessageTable com os parâmetros da mensagem parseada
 *
 * @param {boolean} implemented diz se foi implementado o parseamento dessa mensagem
 * @param {Number} msgID id da mensagem a ser mostrada na tabela
 * @param {Array<string>} headers dados dos headers da tabela
 * @param {Array<Array>} rows dados dos rows da tabela
 */
export function showParsedMessageOnTable(implemented, msgID, headers, rows) {
    ui.labelMessageDescription.textContent = getMsgName(msgID);
    if (implemented) {
        util.Table.Create(ui.parsedMessageTable, headers, rows);
    } else {
        ui.parsedMessageTable.innerHTML = `Parseamento dessa mensagem não foi desenvolvido.`;
    }

    setSplitterPaneVisible(ui.parsedPackageSplitter, 2, true);
}

export let hlMessagesCountStatistics = []; // objeto que guarda contagem de cada mensagem por id

/**
 * Atualiza contador de mensagens por ID, 
 * cada chamada incrementa o contador do ID passado
 */
export function updateMessageCounterStatistics(id, evId = null) {

    let entry = evId ?
        hlMessagesCountStatistics.find(m => m.id === id && m.evId === evId) :
        hlMessagesCountStatistics.find(m => m.id === id);

    if (!entry) {
        // Nova mensagem inserida
        entry = {
            id,
            description: getMsgName(id, evId),
            count: 1
        };

        if (evId) entry["evId"] = evId;

        hlMessagesCountStatistics.push(entry);
        revealMessageOption(evId ? getTmEventOptionId(evId) : id);
    } else {
        // Incrementa contador da mensagem já existente
        entry.count++;
    }

    return entry;
}

// Xunxo para diferenciar eventos de telemetria de diferentes tipos
export function getTmEventOptionId(evId) {
    //return (0x1402 >> 8) + evId;
    return `${0x1402}-${evId}`;
}

export function clearMessageCounter() {
    hlMessagesCountStatistics = [];
    hideAllListMessageOptions();
}

/**
 * Inicializa as opções do select #selListMessage 
 * com as mensagens que suportam listagem na tabela #listMessageTable
 * OBS: todas iniciam "hidden", então ao ativar analise de pacotes, 
 * se uma mensagem existir no log, ai deve ficar visivel para selecionar.
 */
export function initSelectMessageIDOptions() {
    for (const [id, info] of msgsList) {
        if (info.listSupport) {
            if (id === 0x1402) // Eventos de Telemetria
                continue;

            const opt = document.createElement("option");
            const idHex = "0x" + id.toString(16).toUpperCase().padStart(4, "0");

            opt.value = String(id);
            opt.textContent = `${idHex} - ${info.description}`;
            opt.classList.add("hidden");
            ui.selListMessage.appendChild(opt);
        }
    }

    // Eventos de Telemetria 0x1402
    // @ts-ignore
    for (const [evId, description] of telemetryEventsList) {
        const opt = document.createElement("option");

        opt.value = `${getTmEventOptionId(evId)}`;
        opt.textContent = getMsgName(0x1402, evId);
        opt.classList.add("hidden");
        ui.selListMessage.appendChild(opt);
    }
}

function revealMessageOption(id) {
    const option = ui.selListMessage.querySelector(
        `option[value="${id}"]`
    );

    if (option) {
        option.classList.remove("hidden");
    }
}

/**
 * Esconde todas as opcoes de mensagens
 * Deixa visivel apenas "none" e "all"
 */
export function hideAllListMessageOptions() {
    const options = ui.selListMessage.querySelectorAll("option");

    options.forEach((opt, index) => {
        if (index > 1) {
            opt.classList.add("hidden");
        }
    });
}


// esconde painel de mensagens e limpa tabela
export function hideListMessagePane() {
    ui.selListMessage.classList.remove("is-selected");
    ui.listMessageTable.innerHTML = "";
    setSplitterPaneVisible(ui.mainSplitter, 2, false);
}



/** Parsea uma mensagem, e retorna as rows dos parâmetros parseados
 * 
 * @param {number} msgID
 * @param {Uint8Array} data
 * @param {"nv" | "nsv"} dataMode nv=Name/Value, nsv=Name/Size/Value
 * @param {"v" | "h"} dataOrientation v=Vertical / h=Horizontal
 * @returns {{ 
 *  isImplemented: boolean,
 *  rows: Array<Array> }}
 */
export function parseMessage(msgID, data, dataMode, dataOrientation) {
    const br = createBinaryReader(data, {
        processMode: "collect", // collect parsed data
        dataMode,
        dataOrientation
    });

    let isImplemented = true;

    // -------- switch principal --------
    switch (msgID) {
        case 0x1101: {
            br.add_row_u8("Protocol Version");
            br.add_row_u32_timestamp("Timestamp");
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

            let text = "";
            for (let i = 0; i < gzCount; i++) {
                const group = br.read_u8(`Geozone Group[${i}]`);
                const id = br.read_u32(`Geozone ID[${i}]`);
                const gzId = (id & 0x00FFFFFF) >>> 0;
                const flags = (id >>> 24) & 0xFF;
                if (dataOrientation === "v")
                    br.add_row(`GZ[${i}]`, 5, `Group=${group}, ID=${gzId}, Flags=${flags}`);
                else // "h"
                    text += `{ Group=${group}, ID=${gzId}, Flags=${flags} }, \r\n`;
            }

            if (dataOrientation === "h")
                br.add_row("Geozones", gzCount * 5, text);

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

            const flags = br.read_u32("Flags");
            br.add_row("Odom Accum", "1 bit", (flags & 0x00000001) ? "1" : "0");
            br.add_row("Flag Cal", "2 bits", `Avail: ${(flags & 0x00000002) ? "1" : "0"}, Val: ${(flags & 0x00000004) ? "1" : "0"}`);
            br.add_row("Clutch", "2 bits", `Avail: ${(flags & 0x00000008) ? "1" : "0"}, Val: ${(flags & 0x00000010) ? "1" : "0"}`);
            br.add_row("Brake", "2 bits", `Avail: ${(flags & 0x00000020) ? "1" : "0"}, Val: ${(flags & 0x00000040) ? "1" : "0"}`);
            br.add_row("Parking Brake", "2 bits", `Avail: ${(flags & 0x00000080) ? "1" : "0"}, Val: ${(flags & 0x00000100) ? "1" : "0"}`);
            br.add_row("Retarder", "2 bits", `Avail: ${(flags & 0x00000200) ? "1" : "0"}, Val: ${(flags & 0x00000400) ? "1" : "0"}`);
            br.add_row("Wiper", "1 bit", (flags & 0x00000800) ? "1" : "0");
            br.add_row("Rain", "1 bit", (flags & 0x00001000) ? "1" : "0");
            br.add_row("RFU", "19 bits", `0x${((flags & 0xFFFFE000) >>> 13).toString(16).toUpperCase()}`);

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

        case 0x4010: {
            const protoCode = br.add_row_cstring("Protocol");
            const host = br.add_row_cstring("Host");
            const port = br.add_row_cstring("Port");
            br.add_row_cstring("Login");
            br.add_row_cstring("Pwd");
            const pathFile = br.add_row_cstring("PathFile");

            const strProto =
                protoCode === "1" ? "http" :
                    protoCode === "2" ? "https" :
                        protoCode === "3" ? "ftp" : "";

            br.add_row("***URL***", "N/A", `${strProto}://${host}:${port}${pathFile}`);
            break;
        }

        case 0x1200:
        case 0x200B: {
            if (msgID === 0x1200) {
                br.add_row_hex_u16("Message Type");
                br.add_row_u32("RFU");
            }
            br.add_row_u32_timestamp("Timestamp");
            br.add_row_u32("Message ID");
            br.add_row_u32("RFU");
            br.add_row_cstring("Message", { allowToEnd: true });
            break;
        }

        case 0x1300:
        case 0x3000: {
            let text = "";
            while (br.getOffset() < br.getLength()) {
                const id = br.read_bytes("config id", 3);
                const size = br.read_u8("config size");
                const value = br.read_bytes("config value", size);
                if (dataOrientation === "v")
                    br.add_row(util.bufferToHex(id), size, util.bufferToHex(value));
                else
                    text += `{ ID: ${util.bufferToHex(id)}, Value: 0x${util.bufferToHex(value)} }, \r\n`;
            }
            if (dataOrientation === "h")
                br.add_row("Configurações", "N/A", text);
            break;
        }

        case 0x1310: {
            let text = "";
            while (br.getOffset() < br.getLength()) {
                const id = br.read_u16("context id");
                const value = br.read_u32("context value");
                if (dataOrientation === "v")
                    br.add_row(String(id), 4, value.toString(16).toUpperCase().padStart(8, "0"));
                else
                    text += `{ ID: ${id}, Value: ${br.hex_u32(value)} }, \r\n`;
            }

            if (dataOrientation === "h")
                br.add_row("Contexto", "N/A", text);
            break;
        }

        case 0x3100:
        case 0x3200: {
            let value = "";
            while (br.getOffset() < br.getLength()) {
                let id = "";
                if (msgID === 0x3100) {
                    id = util.bufferToHex(br.read_bytes("config_id", 3));
                } else {
                    id = String(br.read_u16("context_id"));
                }
                value += id + ", "
            }

            br.add_row("IDs Solicitados", br.getLength(), value);
            break;
        }

        case 0x1402: {
            const eventID = br.add_row_u8('Event ID', (v) => {
                let evDesc;
                if (telemetryEventsList.has(v))
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
                switch (v) {
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

            const gpsFlags = br.read_u8("GPS flags");
            const antennaVal = (gpsFlags >> 5) & 0x03;
            let antennaStatus = "";
            switch (antennaVal) {
                case 0: antennaStatus = "Normal"; break;
                case 1: antennaStatus = "Open"; break;
                case 2: antennaStatus = "Short"; break;
                case 3: antennaStatus = "Unknown"; break;
            }
            br.add_row("Satellites", "5 bits", gpsFlags & 0x1F);
            br.add_row("Antenna", "2 bits", `${antennaVal}, ${antennaStatus}`);
            br.add_row("Fix", "1 bit", (gpsFlags >> 7) & 0x01);


            // Info IOs Events (bb_pck_io_events_t)
            br.add_row_hex_u8("dataAvailableMask");
            br.add_row_hex_u8("reserved");
            br.add_row_hex_u8("outputs");

            // Info available (bb_pck_available_t.telemetry)
            const tmAvail = br.read_u16("TM available");
            br.add_row("Avail Speed", "1 bit", (tmAvail & 0x0001) ? 1 : 0);
            br.add_row("Avail RPM", "1 bit", (tmAvail & 0x0002) ? 1 : 0);
            br.add_row("Avail Odom", "1 bit", (tmAvail & 0x0004) ? 1 : 0);
            br.add_row("Avail FuelRate", "1 bit", (tmAvail & 0x0008) ? 1 : 0);
            br.add_row("Avail TotalFuel", "1 bit", (tmAvail & 0x0010) ? 1 : 0);
            br.add_row("Avail LevelTank", "1 bit", (tmAvail & 0x0020) ? 1 : 0);
            br.add_row("Avail Brake", "1 bit", (tmAvail & 0x0040) ? 1 : 0);
            br.add_row("Avail ParkBrake", "1 bit", (tmAvail & 0x0080) ? 1 : 0);

            br.add_row("Avail Clutch", "1 bit", (tmAvail & 0x0100) ? 1 : 0);
            br.add_row("Avail Retarder", "1 bit", (tmAvail & 0x0200) ? 1 : 0);
            br.add_row("Avail Gears", "1 bit", (tmAvail & 0x0400) ? 1 : 0);
            br.add_row("Avail RFU", "5 bits", (tmAvail & 0xF800) >> 11);

            // Info available (bb_pck_available_t.module)
            const moduleEnabled = br.read_u8("Module Enabled");
            br.add_row("Enable ISV", "1 bit", (moduleEnabled & 0x01) ? 1 : 0);
            br.add_row("Enable TM", "1 bit", (moduleEnabled & 0x02) ? 1 : 0);
            br.add_row("Enable DT", "1 bit", (moduleEnabled & 0x04) ? 1 : 0);
            br.add_row("Enable Sat", "1 bit", (moduleEnabled & 0x08) ? 1 : 0);
            br.add_row("Enable DriveTime", "1 bit", (moduleEnabled & 0x10) ? 1 : 0);
            br.add_row("Enable Acessorios", "1 bit", (moduleEnabled & 0x20) ? 1 : 0);
            br.add_row("Enable RFU", "2 bits", (moduleEnabled & 0x40) ? 1 : 0);

            if (br.getLength() > br.getOffset()) {
                br.add_row_bytes_hex("SecondsPayload", br.getLength() - br.getOffset());
            }

            break;
        }

        case 0x2005: {
            const mask = br.add_row_hex_u16("Mask");
            const state = br.add_row_hex_u16("State");
            let text = "";
            for (let bit = 0; bit < 16; bit++) {
                if (mask & (1 << bit)) {
                    const value = ((state >> bit) & 1) === 0 ? "OFF" : "ON";
                    text += `Saída ${bit + 1}: ${value}, `;
                }
            }
            br.add_row("Comando", "N/A", text);
            break;
        }

        case 0x1130: {
            const total = br.add_row_u8("Quantidade de Ações Disparadas");
            let text = "";
            for (let i = 0; i < total; i++) {
                const ruleId = br.read_u16(`Rule ID (index ${i})`);
                const violationId = br.read_u16(`Violation ID (index ${i})`);
                br.skip("RFU", 6);

                if (dataOrientation === "v")
                    br.add_row(`Ação[${i}]`, 10, `RuleID: ${ruleId}, ViolationID: ${violationId}`);
                else
                    text += `{ RuleID: ${ruleId}, ViolationID: ${violationId} }, \r\n`;
            }

            if (dataOrientation === "h")
                br.add_row("Ações Disparadas", total * 10, text);

            break;
        }

        case 0x200A: {
            br.add_row_u8("Data", (v) => {
                if (v === 0) return "0x00 - Padrão (envia pelo canal padrão: GSM)";
                if (v === 1) return "0x01 - Força satelital";
                return `${br.hex_u8(v)} - Desconhecido`;
            });
            break;
        }

        case 0x1000: {
            const resetReason = br.read_u8("Reset Reason");
            br.add_row("Low-power management reset", "1 bit", (resetReason & 0x01) ? 1 : 0);
            br.add_row("Window watchdog reset", "1 bit", (resetReason & 0x02) ? 1 : 0);
            br.add_row("Independent watchdog reset (VDD)", "1 bit", (resetReason & 0x04) ? 1 : 0);
            br.add_row("Software reset", "1 bit", (resetReason & 0x08) ? 1 : 0);
            br.add_row("POR/PDR reset", "1 bit", (resetReason & 0x10) ? 1 : 0);
            br.add_row("Pin reset flag", "1 bit", (resetReason & 0x20) ? 1 : 0);
            br.add_row("POR/PDR or BOR reset", "1 bit", (resetReason & 0x40) ? 1 : 0);
            br.add_row("RFU", "1 bit", (resetReason & 0x80) ? 1 : 0);
            br.add_row_u32("Reset Counter");
            br.add_row_bytes_hex("Firmware Version", 4, (buf) => {
                return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
            });
            break;
        }

        case 0x2022: {
            br.add_row_u32("Timeout (s)");
            br.add_row_cstring("Host:Port");
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
            isImplemented = false;
        }
    }

    return {
        isImplemented,
        rows: br.rows
    }
}