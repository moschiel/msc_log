const pkgTableContainer = document.getElementById("packageTableContainer");
const btnClosePkgTable = document.getElementById("btnClosePkgTable");

btnClosePkgTable.addEventListener("click", () => {
    pkgTableContainer.classList.toggle("hl-hidden");
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
 */
function parseCC33Frame(u8buf, showOnTable) {
    const dv = new DataView(u8buf.buffer, u8buf.byteOffset, u8buf.byteLength);
    let offset = 0;
    let rows = [];

    function need2read(n, description) {
        if (offset + n > dv.byteLength)
        throw new Error(`Frame truncado ao tentar ler ${description}`);
    }

    // CC33
    need2read(2, 'frame incial');
    if (dv.getUint16(offset, false) !== 0xCC33)
        throw new Error("Frame inicial invalido");
    offset += 2;

    // size
    need2read(2, 'Tamanho do pacote');
    const pkgSize = dv.getUint16(offset, true);
    if (showOnTable) rows.push(["Tamanho do pacote", 2, pkgSize]);
    offset += 2;

    const frameEnd = offset + pkgSize;
    if (frameEnd > dv.byteLength)
        throw new Error(`Frame Size (${pkgSize}) é maior que o buffer (${dv.byteLength})`);

    // option
    need2read(1, 'Option');
    const option = dv.getUint8(offset);
    if (showOnTable) rows.push(["Option", 1, option === 0 ? "0 - Not Provider" : `3 - Provider`]);
    offset += 1;

    if (option !== 0 && option !== 3)
        throw new Error("Option inválida, deve ser 0 ou 3");

    let esnSize, esn, packgIndex, serviceType;
    if (option === 0) {
        esn = "";
    }
    else
    {
        if (showOnTable) rows.push(["Ignore", 2, "campo ignorado"]);
        offset += 2; //pula + 2
        
        need2read(1, 'Tamanho do SN');
        esnSize = dv.getUint8(offset);
        if (showOnTable) rows.push(['Tamanho do SN', 1, esnSize]);
        offset += 1;
        
        need2read(esnSize, 'SerialNumber');
        const esnBuf = u8buf.slice(offset, offset + esnSize)
        if (showOnTable) rows.push(['SerialNumber', `${esnSize} bytes em BCD`, `${uint8ArrayToBCD(esnBuf)}`]);
        offset += esnSize;
    }

    need2read(2, 'Index do Pacote');
    packgIndex = dv.getUint16(offset, true); 
    if (showOnTable) rows.push(['Index do Pacote', 2, packgIndex]);
    offset += 2;

    need2read(1, "Tipo de Serviço");
    serviceType = dv.getUint8(offset);
    if (showOnTable) rows.push(['Tipo de Serviço', 1, `0x${serviceType.toString(16)}`]);
    offset += 1;


    let newMsg = true;
    while (newMsg && (offset < frameEnd)) {
        need2read(2, 'ID de uma mensagem');
        const msgId  = dv.getUint16(offset, true);
        offset += 2;
        
        need2read(2, `Tamanho da mensagem 0x${msgId.toString(16)}`);
        msgSize = dv.getUint16(offset, true); 
        offset += 2;
        
        newMsg = (msgSize & 0x8000) > 0;
        msgSize = (msgSize & 0x7FFF);
        
        need2read(msgSize, `${msgSize} bytes de dados da mensagem 0x${msgId.toString(16)}`);
        const msgData = u8buf.slice(offset, offset + msgSize);
        offset += msgSize;
        
        if (showOnTable) rows.push([getMsgName(msgId), msgSize, bufferToHex(msgData)]);
    }

    if(showOnTable) {
        createTable(
            "packageTable",
            ["Parameter", "Size", "Value"],
            rows
        );
        pkgTableContainer.classList.remove("hl-hidden");
    }

    return true;
}