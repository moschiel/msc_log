class MessageData {
    constructor(id, data) {
        this.id = id;
        /** @type {Uint8Array} */
        this.data = data;
    }
}
class PackageData {
  constructor(size, option, esnSize, esn, packgIndex, serviceType, messages) {
    this.size = size;
    this.option = option;
    this.esnSize = esnSize;
    this.esn = esn;
    this.packgIndex = packgIndex;
    this.serviceType = serviceType;
    /** @type {MessageData[]} */
    this.messages = messages;
  }
}

const cbAnalyzePkg = document.getElementById("analyzePackage");

cbAnalyzePkg.addEventListener("change", () => {
    renderLogText();
});

function isHexOnly(str) {
    return /^[0-9a-fA-F]+$/.test(str);
}

function hexToBuffer(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error("Hex string inválida (tamanho ímpar)");
    }

    const buffer = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
        buffer[i / 2] = parseInt(hex.substr(i, 2), 16);
    }

    return buffer; // Uint8Array
}

function bufferToHex(buffer) {
    if (!(buffer instanceof Uint8Array)) {
        throw new Error("Esperado Uint8Array");
    }

    let hex = "";

    for (let i = 0; i < buffer.length; i++) {
        hex += buffer[i].toString(16).padStart(2, "0");
    }

    return hex.toUpperCase(); // opcional
}

function uint8ArrayToBCD(buffer) {
    if (!(buffer instanceof Uint8Array)) {
        throw new Error("Entrada não é Uint8Array");
    }

    let result = "";

    for (const byte of buffer) {
        const high = (byte >> 4) & 0x0F;
        const low  = byte & 0x0F;

        if (high > 9 || low > 9) {
            throw new Error(`Nibble inválido em BCD: 0x${byte.toString(16)}`);
        }

        result += high.toString();
        result += low.toString();
    }

    return result;
}



// Aplica highlight dos pacotes com CC33
let globalFrames = [];
function analyzePackages(text) {
    const lines = text.split(/\r?\n/);
    const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
    let isCollectingFrame = false;
    let frameStr = "";
    let linesToReplace = [];
    globalFrames = [];

    lines.forEach((line, lineNumber) => {
        if (line.length > LOG_HEADER_EXAMPLE.length) {
            let substrFrame = line.substr(LOG_HEADER_EXAMPLE.length);

            if (!isCollectingFrame && substrFrame.startsWith("CC33") && isHexOnly(substrFrame)) {
                isCollectingFrame = true;
                frameStr = "";
                linesToReplace = [];
            } else if (isCollectingFrame && isHexOnly(substrFrame) === false) {
                isCollectingFrame = false;
            }
            
            if(isCollectingFrame) {
                frameStr += substrFrame;
                linesToReplace.push(line);   
            } else {
                if (frameStr.length > 0) {
                    frameStr = frameStr.replace("\r", "").replace("\n", "");
                    globalFrames.push(frameStr);
                    
                    const classPkgGroup = `pkg-${globalFrames.length}`;
                    let classPkgStatus = "";
                    let parsedPkg = new PackageData();
                    try {
                        parsedPkg = parseCC33Frame(frameStr);
                        classPkgStatus = 'hl-pkg-ok';
                    } catch (e) {
                        console.error(e.message, ", Line: ", line);
                        classPkgStatus = 'hl-pkg-err';
                    }

                    linesToReplace.forEach((oldLine, lineIndex) => {
                        let classBorder = "hl-border-sides";
                        if(lineIndex == 0)
                            classBorder += " hl-border-top"
                        if(lineIndex == (linesToReplace.length - 1))
                            classBorder += " hl-border-bottom"

                        const headerPart = oldLine.slice(0, LOG_HEADER_EXAMPLE.length);
                        const hexPart = oldLine.substr(LOG_HEADER_EXAMPLE.length);
                        let newLine = "";
                        
                        if ( linesToReplace.length >= 2 // Se o pacote tem mais de duas linhas no log
                            && lineIndex === (linesToReplace.length - 2) // Se essa é a penultima linha
                            && (linesToReplace[linesToReplace.length - 1].length < linesToReplace[linesToReplace.length - 2].length) // E a ultima linha eh menor que a penultima linha
                        )
                        {
                            const diffSize = linesToReplace[linesToReplace.length - 2].length - linesToReplace[linesToReplace.length - 1].length;
                            const startHexPart = hexPart.slice(0, hexPart.length - diffSize) 
                            const endHexPart =  hexPart.slice(hexPart.length - diffSize);
                            const spanEndHexPart = `<span class="${classPkgGroup} hl-border-bottom">${endHexPart}</span>`
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${startHexPart}${spanEndHexPart}</span>`;
                        }
                        else
                        {
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${hexPart}</span>`;
                        }
                        
                        text = text.replace(oldLine, newLine);
                    });

                    if (classPkgStatus === 'hl-pkg-ok') {
                        logBox.addEventListener("click", e => {
                            if (e.target.classList.contains(classPkgGroup)) {
                                //console.log("clicou:", classPkgGroup);
                                const index = Number(classPkgGroup.replace("pkg-", "")) - 1;
                                //console.log(globalFrames[index]);
                                createPackageTable(parsedPkg);
                            }
                        });
                    }
                    // logBox.addEventListener("mouseover", e => {
                    //     if (e.target.classList.contains(classPkgGroup)) {
                    //         console.log("mouseEnter:", classPkgGroup);
                    //     }
                    // });
                    // logBox.addEventListener("mouseout", e => {
                    //     if (e.target.classList.contains(classPkgGroup)) {
                    //         console.log("mouseLeave:", classPkgGroup);
                    //     }
                    // });
                    //const elements = document.getElementsByClassName(classPkgGroup);
                    //for (const el of elements) {
                    //    el.classList.add(`hl-pkg-hover`);
                    //}

                    frameStr = "";
                    linesToReplace = [];
                }

                isCollectingFrame = false;
            }
        }
    });
    
    return text;
}

function parseCC33Frame(frameStr) {
    frameStr = frameStr.replace("\r\n", "");

    if(isHexOnly(frameStr) === false) {
        throw new Error("Frame caracter invalido");
    }

    if (frameStr.length % 2 != 0) {
        throw new Error("Frame string com tamanho impar");
    }

    u8buf = hexToBuffer(frameStr);

    const dv = new DataView(u8buf.buffer, u8buf.byteOffset, u8buf.byteLength);
    let offset = 0;

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
    need2read(2, 'tamanho do pacote');
    const size = dv.getUint16(offset, true);
    offset += 2;

    const frameEnd = offset + size;
    if (frameEnd > dv.byteLength)
        throw new Error(`Frame Size (${size}) é maior que o buffer (${dv.byteLength})`);

    // option
    need2read(1, 'option');
    const option = dv.getUint8(offset);
    offset += 1;

    if (option !== 0 && option !== 3)
        throw new Error("Option inválida, deve ser 0 ou 3");

    let esnSize, esn, packgIndex, serviceType;
    if (option === 0) {
        esn = "";
    }
    else
    {
        offset += 2; //pula + 2
        
        need2read(1, 'tamanho do ESN');
        esnSize = dv.getUint8(offset);
        offset += 1;
        
        need2read(esnSize, 'ESN');
        esn = uint8ArrayToBCD(u8buf.slice(offset, offset + esnSize));
        offset += esnSize;
    }

    need2read(2, 'Index do Pacote');
    packgIndex = dv.getUint16(offset, true); 
    offset += 2;

    need2read(1, "Tipo de Serviço");
    serviceType = dv.getUint8(offset);
    offset += 1;


    let newMsg = true;
    const messages = [];
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

        messages.push(new MessageData (msgId, msgData));
    }

    return new PackageData(
        size,
        option,
        esnSize,
        esn,
        packgIndex,
        serviceType,
        messages
    );
}


/**
 * @param {PackageData} pkgData
 */
function createPackageTable(pkgData) {
    let rows = [];
    rows.push(["Pkg Size", pkgData.size]);
    rows.push(["Option", pkgData.option === 0 ? "0 - Not Provider" : `3 - Provider`]);
    if(pkgData.option === 3) {
        rows.push(["ESN Size", pkgData.esnSize]);
        rows.push(["ESN (BCD)", pkgData.esn]);   
    }
    rows.push(["Pkg Index", pkgData.packgIndex]);
    rows.push(["Service Type", `0x${pkgData.serviceType.toString(16)}`]);

    createTable(
        "packageTableContainer",
        ["Parameter", "Value"],
        rows
    );

    rows = [];
    pkgData.messages.forEach((msg) => {
        rows.push([`0x${msg.id.toString(16).toUpperCase()}`, bufferToHex(msg.data)]);
    });

    createTable(
        "MessagesTableContainer",
        ["Message ID", "Data"],
        rows
    );
}

function createTable(containerId, headers, rows) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    let table = document.createElement("table");

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");

    headers.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        trHead.appendChild(th);
    });

    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}


