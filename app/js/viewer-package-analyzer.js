const cbAnalyzePkg = document.getElementById("analyzePackage");

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
function analyzePackages(text) {
    const lines = text.split(/\r?\n/);
    const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
    let isCollectingFrame = false;
    let frameStr = "";
    let linesToReplace = [];

    lines.forEach((line, lineNumber) => {
        if (line.length > LOG_HEADER_EXAMPLE.length) {
            let substrFrame = line.substr(LOG_HEADER_EXAMPLE.length);

            if (substrFrame.startsWith("CC33") && isHexOnly(substrFrame)) {
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
                    try {
                        res = parseCC33Frame(frameStr);
                        className = 'hl-package-valid';
                    } catch (e) {
                        console.error("Erro:", e.message);
                        className = 'hl-package-error';
                    }

                    linesToReplace.forEach((oldLine) => {                     
                        const headerPart = oldLine.slice(0, LOG_HEADER_EXAMPLE.length);
                        const hexPart = oldLine.substr(LOG_HEADER_EXAMPLE.length);
                        const newLine = `${headerPart}<span class="${className}">${hexPart}</span>`;
                        text = text.replace(oldLine, newLine);
                    });

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
        throw new Error("Frame com tamanho impar");
    }

    u8buf = hexToBuffer(frameStr);

    const dv = new DataView(u8buf.buffer, u8buf.byteOffset, u8buf.byteLength);
    let offset = 0;

    function need(n) {
        if (offset + n > dv.byteLength)
        throw new Error("Frame truncado");
    }

    // CC33
    need(2);
    if (dv.getUint16(offset, false) !== 0xCC33)
        throw new Error("Starting frame inválido");
    offset += 2;

    // size
    need(2);
    const size = dv.getUint16(offset, true);
    offset += 2;

    const frameEnd = offset + size;
    if (frameEnd > dv.byteLength)
        throw new Error("Frame Size maior que buffer");

    // option
    need(1);
    const option = dv.getUint8(offset);
    offset += 1;

    if (option !== 0 && option !== 3)
        throw new Error("Option inválida");

    let esn, packgIndex, serviceType;
    if (option === 0) {
        esn = "not provider";
    }
    else
    {
        offset += 2; //pula + 2
        
        need(1);
        const esnSize = dv.getUint8(offset);
        offset += 1;
        
        need(esnSize);
        esn = u8buf.slice(offset, offset + esnSize);
        offset += esnSize;
    }
    
    need(2);
    packgIndex = dv.getUint16(offset, true); 
    offset += 2;

    need(1);
    serviceType = dv.getUint8(offset);
    offset += 1;


    let newMsg = true;
    const messages = [];
    while (newMsg && (offset < frameEnd)) {
        need(2);
        const msgId  = dv.getUint16(offset, true); 
        offset += 2;

        need(2);
        msgSize = dv.getUint16(offset, true); 
        offset += 2;

        newMsg = (msgSize & 0x8000) > 0;
        msgSize = (msgSize & 0x7FFF);

        need(msgSize);
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



// Eventos
cbAnalyzePkg.addEventListener("change", () => {
    renderLogText();
});