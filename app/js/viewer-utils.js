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

// Edita tabela existente dinamicamente
function createTable(tableId, headers, rows) {
    const table = document.getElementById(tableId);
    table.innerHTML = "";

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
}

const epochSecondsToString = (sec) => new Date(sec * 1000).toISOString();

// ======== ASCII helpers ========
function getAsciiStringAll() {
    let s = "";
    for (let i = 0; i < data.length; i++) s += String.fromCharCode(data[i] & 0x7F);
    return s;
}

function splitNullTerminatedAscii(u8arr) {
    const parts = [];
    let cur = "";
    for (let i = 0; i < u8arr.length; i++) {
        const b = u8arr[i];
        if (b === 0x00) { parts.push(cur); cur = ""; }
        else cur += String.fromCharCode(b & 0x7F);
    }
    parts.push(cur);
    return parts;
}

function asciiFromOffset(offset) {
    let s = "";
    for (let i = offset; i < data.length; i++) s += String.fromCharCode(data[i] & 0x7F);
    return s;
}
