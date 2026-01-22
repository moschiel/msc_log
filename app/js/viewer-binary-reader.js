// binaryReader.js

/**
 * Cria um leitor sequencial (DataView) com helpers de parse + helpers de tabela.
 *
 * @param {Uint8Array} u8buf
 * @param {{
 *   processMode?: "validate" | "collect",
 *   tableMode?: "nv" | "nsv", // nv=Name/Value, nsv=Parameter/Size/Value
 * }} [opts]
 */
function createBinaryReader(u8buf, opts = {}) {
    const dv = new DataView(u8buf.buffer, u8buf.byteOffset, u8buf.byteLength);

    let offset = 0;
    const collectData = opts.processMode === "collect";
    const tableMode = opts.tableMode ?? "nv";

    /** @type {Array<Array<any>>} */
    const rows = [];

    const headers =
        collectData
            ? (tableMode === "nsv"
                ? ["Name", "Size", "Value"]
                : ["Name", "Value"])
            : [];

    // ======== check mínimo (com name) ========
    function need(name, n) {
        if (offset + n > dv.byteLength) {
            throw new RangeError(
                `Frame truncado ao tentar ler ${name}: offset=${offset}, precisa=${n}, len=${dv.byteLength}`
            );
        }
    }

    // ======== readers ========
    const read_u8 = (name) => {
        need(name, 1);
        const v = dv.getUint8(offset);
        offset += 1;
        return v;
    };

    const read_i16 = (name, le = true) => {
        need(name, 2);
        const v = dv.getInt16(offset, le);
        offset += 2;
        return v;
    };

    const read_u16 = (name, le = true) => {
        need(name, 2);
        const v = dv.getUint16(offset, le);
        offset += 2;
        return v;
    };

    const read_i32 = (name, le = true) => {
        need(name, 4);
        const v = dv.getInt32(offset, le);
        offset += 4;
        return v;
    };

    const read_u32 = (name, le = true) => {
        need(name, 4);
        const v = dv.getUint32(offset, le);
        offset += 4;
        return v;
    };

    const read_u64 = (name, le = true) => {
        need(name, 8);
        // precisa de BigInt (ok na maioria dos browsers modernos)
        const v = dv.getBigUint64(offset, le);
        offset += 8;
        return v;
    };

    const read_bytes = (name, n) => {
        need(name, n);
        const s = u8buf.slice(offset, offset + n);
        offset += n;
        return s;
    };

    const skip = (name, n) => {
        need(name, n);
        offset += n;
    };

    // ======== formatadores ========
    const hex_u8 = (v) => `0x${(v & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`;
    const hex_u16 = (v) => `0x${(v & 0xFFFF).toString(16).toUpperCase().padStart(4, "0")}`;
    const hex_u32 = (v) => `0x${(v >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
    
    // ======== adders ========
    function add_row(name, size, value) {
        // console.log(name, size, value);

        if (!collectData) return;

        if (tableMode === "nsv") {
            rows.push([name, size, value]);
        } else {
            // "nv": ignora size
            rows.push([name, value]);
        }
    }

    // add numéricos
    const add_row_u8 = (name, Fn = null) => {
        const v = read_u8(name);
        add_row(name, 1, Fn ? Fn(v) : v);
        return v;
    };

    const add_row_i16 = (name, le = true, Fn = null) => {
        const v = read_i16(name, le);
        add_row(name, 2, v);
        return v;
    };

    const add_row_u16 = (name, le = true, Fn = null) => {
        const v = read_u16(name, le);
        add_row(name, 2, Fn ? Fn(v) : v);
        return v;
    };

    const add_row_i32 = (name, le = true, Fn = null) => {
        const v = read_i32(name, le);
        add_row(name, 4, Fn ? Fn(v) : v);
        return v;
    };

    const add_row_u32 = (name, le = true, Fn = null) => {
        const v = read_u32(name, le);
        add_row(name, 4, Fn ? Fn(v) : v);
        return v;
    };

    const add_row_u64 = (name, le = true, Fn = null) => {
        const v = read_u64(name, le);
        add_row(name, 8, Fn ? Fn(v) : v);
        return v;
    };

    // add hex (lê e já formata)
    const add_row_hex_u8 = (name) => {
        const v = read_u8(name);
        add_row(name, 1, hex_u8(v));
        return v;
    };

    const add_row_hex_u16 = (name, le = true) => {
        const v = read_u16(name, le);
        add_row(name, 2, hex_u16(v));
        return v;
    };

    const add_row_hex_u32 = (name, le = true) => {
        const v = read_u32(name, le);
        add_row(name, 4, hex_u32(v));
        return v;
    };

    // add bytes (opcional: você escolhe como representar)
    const add_row_bytes_hex = (name, n, toHexFn = null) => {
        const b = read_bytes(name, n);
        const hex = toHexFn ? toHexFn(b) : bytesToHex(b);
        add_row(name, n, hex);
        return b;
    };

    // fallback simples caso você não passe util.bufferToHex
    function bytesToHex(arr) {
        let s = "";
        for (let i = 0; i < arr.length; i++) {
            s += arr[i].toString(16).toUpperCase().padStart(2, "0");
        }
        return s;
    }

    const add_row_bytes_BCD = (name, n) => {
        const b = read_bytes(name, n);
        const v = util.uint8ArrayToBCD(b);
        add_row(name, `${n} bytes em BCD`, v);
        return v;
    };

    const add_row_u32_timestamp = (name) => {
        const u = read_u32(name);
        const v = epochSecondsToString(u);
        add_row(name, 4, v);
        return v;
    }

    const add_row_i32_coord = (name) => {
        const i = read_i32(name);
        const v = (i / 10000000.0).toFixed(7).replace(/\.?0+$/, "");
        add_row(name, 4, v);
        return v;
    }

    return {
        // estado
        dv,
        u8buf,
        rows,
        headers,

        // offset helpers
        getOffset: () => offset,
        setOffset: (v) => { offset = v; },
        getLength: () => dv.byteLength,

        // core
        need,
        skip,

        // readers
        read_u8,
        read_i16,
        read_u16,
        read_i32,
        read_u32,
        read_u64,
        read_bytes,

        // format
        hex_u8,
        hex_u16,
        hex_u32,

        // table adders
        add_row,
        add_row_u8,
        add_row_i16,
        add_row_u16,
        add_row_i32,
        add_row_u32,
        add_row_u64,
        add_row_hex_u8,
        add_row_hex_u16,
        add_row_hex_u32,
        add_row_bytes_hex,
        add_row_bytes_BCD,
        add_row_u32_timestamp,
        add_row_i32_coord,
    };
}
