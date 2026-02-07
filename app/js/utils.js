/**
 * @typedef {Object} TableHelper
 * @property {(table: HTMLTableElement, headers: string[], rows: Array<Array>)=>void} Create
 * @property {(table: HTMLTableElement, row: Array)=>void} AddRow
 * @property {(table: HTMLTableElement, rows: Array)=>void} AddRows
 */

/**
 * @typedef {Object} Util
 * @property {(s: string)=>string} escapeHtml
 * @property {(s: string)=>string} escapeRegex
 *
 * @property {(str: string)=>boolean} isHexOnly
 * @property {(hex: string)=>Uint8Array} hexToBuffer
 * @property {(buffer: Uint8Array)=>string} bufferToHex
 * @property {(buffer: Uint8Array)=>string} uint8ArrayToBCD
 *
 * @property {TableHelper} Table
 *
 * @property {(sec: number)=>string} epochSecondsToString
 *
 * @property {(data: Uint8Array)=>string} getAsciiStringAll
 * @property {(u8arr: Uint8Array)=>string[]} splitNullTerminatedAscii
 * @property {(data: Uint8Array, offset: number)=>string} asciiFromOffset
 *
 * @property {(el: Element, visible: boolean)=>void} setVisible
 * @property {(el: Element)=>boolean} isVisible
 * @property {(el: Element)=>void} toogleVisible
 *
 * @property {(el: Element, pressed: boolean)=>void} setToogleButton
 * @property {(el: Element)=>boolean} toogleButton
 * @property {(el: Element)=>boolean} isToogleButtonPressed
 */

/** @type {Util} */
export const util = {
  // ======== Strings / Segurança ========

  /**
   * Escapa o conteúdo bruto do log antes de usar innerHTML.
   * Isso garante que qualquer "<", ">", "&", etc vindos do arquivo
   * sejam tratados como TEXTO, e não como HTML executável.
   *
   * @param {string} s
   * @returns {string}
   */
  escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Escapa uma string para uso seguro dentro de RegExp.
   * @param {string} s
   * @returns {string}
   */
  escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  // ======== Hex / Buffer ========

  /**
   * @param {string} str
   * @returns {boolean}
   */
  isHexOnly(str) {
    return /^[0-9a-fA-F]+$/.test(str);
  },

  /**
   * Converte uma string HEX (sem espaços) para Uint8Array.
   * Remove \r e \n antes de processar.
   *
   * @param {string} hex
   * @returns {Uint8Array}
   */
  hexToBuffer(hex) {
    hex = hex.replaceAll("\r", "").replaceAll("\n", "");

    if (this.isHexOnly(hex) === false) {
      throw new Error("Frame caracter invalido");
    }

    if (hex.length % 2 !== 0) {
      throw new Error("Hex string inválida (tamanho ímpar)");
    }

    const buffer = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
      buffer[i / 2] = parseInt(hex.substr(i, 2), 16);
    }

    return buffer;
  },

  /**
   * Converte Uint8Array para HEX string (uppercase).
   *
   * @param {Uint8Array} buffer
   * @returns {string}
   */
  bufferToHex(buffer) {
    if (!(buffer instanceof Uint8Array)) {
      throw new Error("Esperado Uint8Array");
    }

    let hex = "";

    for (let i = 0; i < buffer.length; i++) {
      hex += buffer[i].toString(16).padStart(2, "0");
    }

    return hex.toUpperCase();
  },

  /**
   * Converte bytes em BCD para string numérica.
   *
   * @param {Uint8Array} buffer
   * @returns {string}
   */
  uint8ArrayToBCD(buffer) {
    if (!(buffer instanceof Uint8Array)) {
      throw new Error("Entrada não é Uint8Array");
    }

    let result = "";

    for (const byte of buffer) {
      const high = (byte >> 4) & 0x0f;
      const low = byte & 0x0f;

      if (high > 9 || low > 9) {
        throw new Error(`Nibble inválido em BCD: 0x${byte.toString(16)}`);
      }

      result += high.toString();
      result += low.toString();
    }

    return result;
  },

  // ======== Table Helper ========

  /** @type {TableHelper} */
  Table: {
    /**
     * @param {HTMLTableElement} table
     * @param {string[]} headers
     * @param {Array<Array>} rows
     * @returns {void}
     */
    Create(table, headers, rows) {
      table.innerHTML = "";

      const thead = document.createElement("thead");
      const trHead = document.createElement("tr");

      headers.forEach((h) => {
        const th = document.createElement("th");
        th.textContent = h;
        trHead.appendChild(th);
      });

      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
          const td = document.createElement("td");
          td.textContent = String(cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
    },

    /**
     * @param {HTMLTableElement} table
     * @param {Array} row
     * @returns {void}
     */
    AddRow(table, row) {
      /** @type {HTMLTableSectionElement|null} */
      const tbody = table.querySelector("tbody");

      if (!tbody) {
        console.warn("Tabela não possui <tbody>");
        return;
      }

      const tr = document.createElement("tr");

      row.forEach((cell) => {
        const td = document.createElement("td");
        td.textContent = String(cell);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    },

    /**
     * @param {HTMLTableElement} table
     * @param {Array<Array>} rows
     * @return {void}
     */
    AddRows(table, rows) {
      /** @type {HTMLTableSectionElement|null} */
      const tbody = table.querySelector("tbody");
      
      if (!tbody) {
        console.warn("Tabela não possui <tbody>");
        return;
      }

      rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
          const td = document.createElement("td");
          td.textContent = String(cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
  },

  // ======== Time ========

  /**
   * @param {number} sec
   * @returns {string}
   */
  epochSecondsToString(sec) {
    return new Date(sec * 1000)
      .toISOString()
      .replace("T", " ")
      .replace(".000Z", "");
  },

  // ======== ASCII helpers ========

  /**
   * @param {Uint8Array} data
   * @returns {string}
   */
  getAsciiStringAll(data) {
    let s = "";
    for (let i = 0; i < data.length; i++) {
      s += String.fromCharCode(data[i] & 0x7f);
    }
    return s;
  },

  /**
   * @param {Uint8Array} u8arr
   * @returns {string[]}
   */
  splitNullTerminatedAscii(u8arr) {
    const parts = [];
    let cur = "";

    for (let i = 0; i < u8arr.length; i++) {
      const b = u8arr[i];
      if (b === 0x00) {
        parts.push(cur);
        cur = "";
      } else {
        cur += String.fromCharCode(b & 0x7f);
      }
    }

    parts.push(cur);
    return parts;
  },

  /**
   * @param {Uint8Array} data
   * @param {number} offset
   * @returns {string}
   */
  asciiFromOffset(data, offset) {
    let s = "";
    for (let i = offset; i < data.length; i++) {
      s += String.fromCharCode(data[i] & 0x7f);
    }
    return s;
  },

  // ======== DOM / Visibility ========

  /**
   * @param {Element} el
   * @param {boolean} visible
   * @returns {void}
   */
  setVisible(el, visible) {
    if (visible) el.classList.remove("hidden");
    else el.classList.add("hidden");
  },

  /**
   * @param {Element} el
   * @returns {boolean}
   */
  isVisible(el) {
    return !el.classList.contains("hidden");
  },

  /**
   * @param {Element} el
   * @returns {void}
   */
  toogleVisible(el) {
    el.classList.toggle("hidden");
  },

  // ======== TWO STATES BUTTON ========

  /**
   * @param {Element} el
   * @param {boolean} pressed
   * @returns {void}
   */
  setToogleButton(el, pressed) {
    if (pressed) el.classList.add("is-pressed");
    else el.classList.remove("is-pressed");
  },

  /**
   * @param {Element} el
   * @returns {boolean}
   */
  toogleButton(el) {
    el.classList.toggle("is-pressed");
    return el.classList.contains("is-pressed");
  },

  /**
   * @param {Element} el
   * @returns {boolean}
   */
  isToogleButtonPressed(el) {
    return el.classList.contains("is-pressed");
  },
};
