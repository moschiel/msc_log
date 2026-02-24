// viewer-binary-reader.js
// @ts-ignore
import { util } from "./utils.js?v=__PLACEHOLDER_BUILD_VERSION__";

/**
 * @typedef {"validate" | "collect"} ProcessMode
 * @typedef {"nv" | "nsv"} DataMode
 * @typedef {"v" | "h"} DataOrientation
 *
 * @typedef {Object} BinaryReaderOpts
 * @property {ProcessMode=} processMode
 * @property {DataMode=} dataMode    - nv=Name/Value, nsv=Name/Size/Value
 * @property {DataOrientation=} dataOrientation - v=Vertical, h=Horizontal
 */

/**
 * @callback BytesToHexFn
 * @param {Uint8Array} bytes
 * @returns {string}
 */

/**
 * @typedef {Object} ReadCStringOptions
 * @property {boolean} [allowToEnd] - Permite ler até o final se não houver NULL
 */

/**
 * @typedef {Object} BinaryReader
 * @property {DataView} dv
 * @property {Uint8Array} u8buf
 * @property {Array<Array>} rows
 *
 * @property {function(): number} getOffset
 * @property {function(number): void} setOffset
 * @property {function(): number} getLength
 *
 * @property {function(string, number): void} need
 * @property {function(string, number): void} skip
 *
 * @property {function(string): number} read_u8
 * @property {function(string, boolean=): number} read_i16
 * @property {function(string, boolean=): number} read_u16
 * @property {function(string, boolean=): number} read_i32
 * @property {function(string, boolean=): number} read_u32
 * @property {function(string, boolean=): bigint} read_u64
 * @property {function(string, number): Uint8Array} read_bytes
 * @property {(name: string, opts?: ReadCStringOptions) => string} read_cstring
 *
 * @property {function(number): string} hex_u8
 * @property {function(number): string} hex_u16
 * @property {function(number): string} hex_u32
 *
 * @property {function(string, number|string, any): void} add_row
 * @property {function(string, (function(number): any)=): number} add_row_u8
 * @property {function(string, boolean=, (function(number): any)=): number} add_row_i16
 * @property {function(string, boolean=, (function(number): any)=): number} add_row_u16
 * @property {function(string, boolean=, (function(number): any)=): number} add_row_i32
 * @property {function(string, boolean=, (function(number): any)=): number} add_row_u32
 * @property {function(string, boolean=, (function(bigint): any)=): bigint} add_row_u64
 *
 * @property {function(string): number} add_row_hex_u8
 * @property {function(string, boolean=): number} add_row_hex_u16
 * @property {function(string, boolean=): number} add_row_hex_u32
 *
 * @property {function(string, number, BytesToHexFn=): Uint8Array} add_row_bytes_hex
 * @property {function(string, number): any} add_row_bytes_BCD
 * @property {function(string): string} add_row_u32_timestamp
 * @property {function(string): string} add_row_i32_coord
 * @property {(name: string, opts?: ReadCStringOptions) => string} add_row_cstring
 */

/**
 * Cria um leitor sequencial (DataView) com helpers de parse.
 *
 * Conforma a leitura é realizada, é montada uma estrutura tabular (rows) contendo os parâmetros parseados,
 * onde cada célula representa:
 *
 * ```
 * [ Nome, Size, Valor ]
 * ```
 * 
 * A orientação das rows depende da opção de layout:
 *
 * Layout VERTICAL:
 *
 * ```
 * [
 *   [ Nome 1, Size 1, Valor 1 ],
 *   [ Nome 2, Size 2, Valor 2 ],
 *   [ Nome N, Size N, Valor N ]
 * ]
 * ```
 *
 * Layout HORIZONTAL:
 *
 * ```
 * [
 *   [ Nome 1,  Nome 2,  Nome N  ],
 *   [ Size 1,  Size 2,  Size N  ],
 *   [ Valor 1, Valor 2, Valor N ]
 * ]
 * ```
 *  
 * @param {Uint8Array} u8buf
 *        Buffer de entrada contendo os dados binários a serem parseados.
 * @param {BinaryReaderOpts} [opts]
 *        Opções de configuração do leitor
 * @returns {BinaryReader}
 */
export function createBinaryReader(u8buf, opts = {}) {
    const dv = new DataView(u8buf.buffer, u8buf.byteOffset, u8buf.byteLength);

    let offset = 0;
    const collectData = opts.processMode === "collect";
    const dataMode = opts.dataMode ?? "nv";
    const dataOrientation = opts.dataOrientation ?? "v";

    /** @type {Array<Array<any>>} */
    // if dataOrientation === "v"
    const rows = dataOrientation === "v"
        ? []
        : dataMode === "nv"
            ? [[], []]  //nv
            : [[], [], []]; //nsv

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

    const read_cstring = (name, opts) => {
        const o = opts || {};
        const allowToEnd = !!o.allowToEnd;

        let start = offset;
        let end = offset;

        while (end < u8buf.length && u8buf[end] !== 0x00) {
            end++;
        }

        const foundNull = (end < u8buf.length && u8buf[end] === 0x00);

        if (!foundNull && !allowToEnd) {
            // não achou '\0' e não pode ir até o fim
            need(name, (end - start) + 1); // força o mesmo erro padrão do seu reader
        }

        const text = new TextDecoder("utf-8").decode(u8buf.slice(start, end));

        // avança offset: se achou '\0', pula ele; senão, vai até o final
        offset = foundNull ? (end + 1) : end;

        return text;
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

        if (dataOrientation === "v") {
            if (dataMode === "nsv") {
                rows.push([name, size, value]);
            } else {
                // "nv": ignora size
                rows.push([name, value]);
            }
        } else {
            if (dataMode === "nsv") {
                rows[0].push(name);
                rows[1].push(size);
                rows[2].push(value);
            } else {
                // "nv": ignora size
                rows[0].push(name);
                rows[1].push(value);
            }
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

    const add_row_cstring = (name, opts) => {
        const startOffset = offset;
        const value = read_cstring(name, opts);
        const size = offset - startOffset;

        add_row(name, size, value);
        return value;
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
        add_row(name, `${n} (BCD)`, v);
        return v;
    };

    const add_row_u32_timestamp = (name) => {
        const u = read_u32(name);
        const v = util.epochSecondsToString(u);
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
        //headers,

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
        read_cstring,

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
        add_row_cstring,
        add_row_bytes_BCD,
        add_row_u32_timestamp,
        add_row_i32_coord,
    };
}
