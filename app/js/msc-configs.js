import { util } from "./utils.js";

/** @type {XMLDocument} */
let xmlDoc;

export async function loadMscConfigsXml () {
  try {
    const response = await fetch("/app/MSC830Configs.xml"); // caminho do seu xml
    if (!response.ok) throw new Error("Erro ao carregar XML");

    const xmlText = await response.text();

    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(xmlText, "application/xml");

  } catch (err) {
    console.error("Falha ao carregar XML:", err);
  }
};

/**
 * @typedef {Object} CfgInfo
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string|null} len
 * @property {string|null} display
 * @property {string|null} default
 * @property {string|null} desc
 * @property {string} moduleId
 * @property {string} moduleName
 */

/**
 * @typedef {CfgInfo & {
 *   valueRaw?: Uint8Array,
 *   valueFormatted?: (number|string|{hex:string, bytes:number[]}|null),
 *   valueNote?: (string|null)
 * }} CfgInfoWithValue
 */

function normalizeCfgHexId(id) {
  if (typeof id === "number") {
    if (!Number.isFinite(id) || id < 0) {
      throw new Error("ID number inválido (precisa ser número finito e >= 0).");
    }
    return id.toString(16).toUpperCase().padStart(6, "0");
  }

  if (typeof id === "string") {
    let s = id.trim();
    if (s.startsWith("0x") || s.startsWith("0X")) s = s.slice(2);

    if (!/^[0-9a-fA-F]+$/.test(s)) {
      throw new Error(`ID string inválido (não é HEX): "${id}"`);
    }
    if (s.length > 6) {
      throw new Error(`ID string inválido (maior que 6 dígitos): "${id}"`);
    }

    return s.toUpperCase().padStart(6, "0");
  }

  throw new Error("ID inválido (use number ou string).");
}

/**
 * Tenta formatar um valor (Uint8Array) de acordo com o tipo do CFG.
 * Observação: para números (u16/u32/i16/i32), aqui assumimos LITTLE-ENDIAN
 *
 * @param {string} type
 * @param {number|null} maxLen
 * @param {Uint8Array} raw
 * @returns {{ formatted: any, note: (string|null) }}
 */
function formatCfgValue(type, maxLen, raw) {
  const useLen = Number.isFinite(maxLen) ? Math.min(raw.length, maxLen) : raw.length;
  const data = raw.slice(0, useLen);

  // string: até \0 ou até len
  if (type === "string") {
    const zeroIndex = data.indexOf(0);
    const slice = zeroIndex >= 0 ? data.slice(0, zeroIndex) : data;

    // TextDecoder é o mais simples; assume UTF-8 (ok para ASCII também)
    let str = "";
    try {
      str = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    } catch {
      // fallback bem simples
      str = Array.from(slice).map(c => String.fromCharCode(c)).join("");
    }

    return { formatted: str, note: null };
  }

  // array: devolve bytes e hex
  if (type === "array") {
    return {
      formatted: "0x" + util.bufferToHex(data),
      note: null,
    };
  }

  // numéricos via DataView
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const littleEndian = true;

  const need = (n) => {
    if (data.length < n) {
        throw new Error(`valorRaw tem ${data.length} byte(s), mas type=${type} precisa de ${n}.`);
    }
  };

  if (type === "u8") {
    need(1);
    return { formatted: dv.getUint8(0), note: null };
  }
  if (type === "i8") {
    need(1);
    return { formatted: dv.getInt8(0), note: null };
  }
  if (type === "u16") {
    need(2);
    return { formatted: dv.getUint16(0, littleEndian), note: null };
  }
  if (type === "i16") {
    need(2);
    return { formatted: dv.getInt16(0, littleEndian), note: null };
  }
  if (type === "u32") {
    need(4);
    return { formatted: dv.getUint32(0, littleEndian), note: null };
  }
  if (type === "i32") {
    need(4);
    return { formatted: dv.getInt32(0, littleEndian), note: null };
  }

  // tipo desconhecido: devolve hex
  return {
    formatted: "0x" + util.bufferToHex(data),
    note: `type desconhecido: "${type}" (retornando como bytes/hex)`,
  };
}

/**
 * Procura uma tag <cfg> pelo ID (number ou string HEX).
 * Se você passar `valueRaw` (Uint8Array), tenta retornar também `valueFormatted`.
 *
 * @param {number|string} id Number (ex: 0x010600) ou string (ex: "010600" / "0x010600")
 * @param {Uint8Array} [valueRaw] valor lido/configurado para esse CFG
 * @returns {CfgInfoWithValue|null}
 */
export function findCfg(id, valueRaw) {
  if (!xmlDoc) {
    console.warn("XML ainda não foi carregado.");
    return null;
  }

  let hexId;
  try {
    hexId = normalizeCfgHexId(id);
  } catch (err) {
    console.warn("ID inválido:", err);
    return null;
  }

   const cfg = xmlDoc.querySelector(`cfg[id="${hexId}"]`);
  if (!cfg) {
    //console.warn(`CFG não encontrado para id ${hexId}`);
    return null;
  }

  const moduleEl = cfg.closest("module");
  const moduleName = moduleEl?.getAttribute("name") ?? undefined;
  const moduleId = moduleEl?.getAttribute("id") ?? null;

  const type = cfg.getAttribute("type") ?? "";
  const lenStr = cfg.getAttribute("len");
  const maxLen = lenStr != null ? Number(lenStr) : null;

  /** @type {CfgInfoWithValue} */
  const result = {
    id: cfg.getAttribute("id") ?? hexId,
    name: cfg.getAttribute("name") ?? "",
    type,
    len: lenStr,
    display: cfg.getAttribute("display"),
    default: cfg.getAttribute("default"),
    desc: cfg.getAttribute("desc"),
    moduleName,
    moduleId,
  };

  if (valueRaw instanceof Uint8Array) {
    const { formatted, note } =
      formatCfgValue(type, Number.isFinite(maxLen) ? maxLen : null, valueRaw);

    result.valueRaw = valueRaw;
    result.valueFormatted = formatted;
    result.valueNote = note;
  }

  return result;
}

/**
 * @param {Array<{id: string, data?: Uint8Array}>} configs
 * @param {boolean} showData
 * @returns {string}
 */
export function htmlMscConfigsTable(configs, showData = false)
{
  const header = `
    <thead>
      <tr>
        <th style="width: 50px !important;">ID</th>
        <th style="width: 100px !important;">Module</th>
        <th>Name</th>
        ${showData ? `
        <th>Size</th>
        <th>Value</th>
        <th>Raw Value</th>`:""}
      </tr>
    </thead>
  `;

  const body = `
    <tbody>
      ${configs.map(config => {
        const c = findCfg(config.id, config.data);
        return `
        <tr>
          <td>${config.id}</td>
          <td>${c?.moduleName}</td>
          <td>${c?.name}</td>
          ${showData ? `
          <td>${config?.data?.length}</td>
          <td>${c?.valueFormatted}</td>
          <td>0x${util.bufferToHex(config?.data)}</td>`:""}
        </tr>`;
    }).join("")}
    </tbody>
  `;

  return `
    <table class="mscConfigsTable">
      ${header}
      ${body}
    </table>
`;
}