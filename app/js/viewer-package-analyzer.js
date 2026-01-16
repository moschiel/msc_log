const cbAnalyzePkg = document.getElementById("analyzePackage");
const pkgTableContainer = document.getElementById("packageTableContainer");
const btnClosePkgTable = document.getElementById("btnClosePkgTable");

cbAnalyzePkg.addEventListener("change", () => {
    renderLogText();
});
btnClosePkgTable.addEventListener("click", () => {
    pkgTableContainer.classList.toggle("hl-hidden");
});


// Aplica highlight dos pacotes com CC33
let globalFrames = [];
function analyzePackages(text) {
    const lines = text.split(/\r?\n/);
    const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
    let isCollectingFrame = false;
    let frameStr = "";
    let linesToReplace = [];
    let pkgCounter = 0;

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
                    pkgCounter++;
                    const classPkgGroup = `pkg-${pkgCounter}`;
                    const frameBuf = hexToBuffer(frameStr);
                    let classPkgStatus = "";

                    try {
                        if(parseCC33Frame(frameBuf, false)) 
                            classPkgStatus = 'hl-pkg-ok';
                        else
                            classPkgStatus = 'hl-pkg-err';
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

                    // Associa Eventos
                    if (classPkgStatus === 'hl-pkg-ok') {
                        linkClickEventToFrame(classPkgGroup, frameBuf);
                        linkHoverEventToFrame(classPkgGroup);
                    }

                    frameStr = "";
                    linesToReplace = [];
                }

                isCollectingFrame = false;
            }
        }
    });
    
    return text;
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
        
        if (showOnTable) rows.push([`0x${msgId.toString(16).toUpperCase().padStart(4, '0')}`, msgSize, bufferToHex(msgData)]);
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

/**
 * @param {string} classPkgGroup
 * @param {Uint8Array} frameBuf
 */
function linkClickEventToFrame(classPkgGroup, frameBuf) {
    // Note que associamos o eventos ao logBox, 
    // quando faria mais sentido associar ao proprio elemento com a classe 'classPkgGroup' usando 'document.getElementsByClassName(classPkgGroup)'
    // O problema é que getElementsByClassName vai retorna nada, pois só quando retorna dessa funcao que a classe vai existir no innerHTML de fato, 
    // nao podemos associar eventos a classes que ainda nao foram renderizadas.
    logBox.addEventListener("click", e => {
        if (e.target.classList.contains(classPkgGroup)) {
            //console.log("clicou:", classPkgGroup);
            //const index = Number(classPkgGroup.replace("pkg-", "")) - 1;
            parseCC33Frame(frameBuf, true);
        }
    });
}

function linkHoverEventToFrame(classPkgGroup) {
    logBox.addEventListener("mouseover", e => {
        if (e.target.classList.contains(classPkgGroup)) {
            const elements = document.getElementsByClassName(classPkgGroup);
            for (const el of elements) {
                if (el.classList.contains(`hl-pkg-mouseover`) === false)
                    el.classList.add(`hl-pkg-mouseover`);
            }
        }
    });
    logBox.addEventListener("mouseout", e => {
        if (e.target.classList.contains(classPkgGroup)) {
            const elements = document.getElementsByClassName(classPkgGroup);
            for (const el of elements) {
                if (el.classList.contains(`hl-pkg-mouseover`))
                    el.classList.remove(`hl-pkg-mouseover`);
            }
        }
    });
}


