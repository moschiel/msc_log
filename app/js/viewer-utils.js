function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHexOnly(str) {
    return /^[0-9a-fA-F]+$/.test(str);
}

function hexToBuffer(hex) {
    hex = hex.replaceAll("\r","").replaceAll("\n","");

    if(isHexOnly(hex) === false) {
        throw new Error("Frame caracter invalido");
    }

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