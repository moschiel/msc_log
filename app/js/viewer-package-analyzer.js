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

// Aplica highlight dos pacotes com CC33
let globalFrames = [];
function analyzePackages(text) {
    const lines = text.split(/\r?\n/);
    const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
    let isCollectingFrame = false;
    let frameStr = "";
    let linesToReplace = [];
    globalFrames = [];
    let pkgCounter = 0;

    lines.forEach((line, lineNumber) => {
        if (line.length > LOG_HEADER_EXAMPLE.length) {
            let substrFrame = line.substr(LOG_HEADER_EXAMPLE.length);

            if (!isCollectingFrame && substrFrame.startsWith("CC33") && isHexOnly(substrFrame)) {
                isCollectingFrame = true;
                frameStr = "";
                linesToReplace = [];
                pkgCounter++;
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

                    const classPkgGroup = `pkg-${pkgCounter}`;
                    let classPkgStatus = "";
                    try {
                        res = parseCC33Frame(frameStr);
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
                            const spanEndHexPart = `<span class="hl-border-bottom">${endHexPart}</span>`
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${startHexPart}${spanEndHexPart}</span>`;
                        }
                        else
                        {
                            //onclick="alert(globalFrames[${globalFrames.length-1}])"
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${hexPart}</span>`;
                        }
                        
                        text = text.replace(oldLine, newLine);
                    });

                    logBox.addEventListener("click", e => {
                        if (e.target.classList.contains(classPkgGroup)) {
                            console.log("clicou:", classPkgGroup);
                        }
                    });
                    logBox.addEventListener("mouseover", e => {
                        if (e.target.classList.contains(classPkgGroup)) {
                            console.log("mouseEnter:", classPkgGroup);
                        }
                    });
                    logBox.addEventListener("mouseout", e => {
                        if (e.target.classList.contains(classPkgGroup)) {
                            console.log("mouseLeave:", classPkgGroup);
                        }
                    });
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

    let esn, packgIndex, serviceType;
    if (option === 0) {
        esn = "not provider";
    }
    else
    {
        offset += 2; //pula + 2
        
        need2read(1, 'tamanho do ESN');
        const esnSize = dv.getUint8(offset);
        offset += 1;
        
        need2read(esnSize, 'ESN');
        esn = u8buf.slice(offset, offset + esnSize);
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

        messages.push({ msgId, msgSize, msgData });
    }

    return {
        size,
        option,
        esn,
        packgIndex,
        serviceType,
        messages
    };
}


