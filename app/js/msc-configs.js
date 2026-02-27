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
 * @param {string} display
 * @param {CfgItem[] } items
 * @param {number|null} maxLen
 * @param {Uint8Array} raw
 * @returns {string}
 */
function formatCfgValue(type, display, items, maxLen, raw) {
  const useLen = Number.isFinite(maxLen) ? Math.min(raw.length, maxLen) : raw.length;
  const data = raw.slice(0, useLen);
  
  // numéricos via DataView
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const littleEndian = true;

  const need = (n) => {
    if (data.length < n) {
        throw new Error(`valorRaw tem ${data.length} byte(s), mas type=${type} precisa de ${n}.`);
    }
  };

  if(display === "roVersion") {
    return `${data[0]}.${data[1]}.${data[2]}-${data[3]}`;
  }
  else if(display === "u8_list") {
    let text = "";
    for(const item of items) {
      const index = item.value;
      if(index >= maxLen) 
        continue;
      text += `<b>${item.name}:</b> ${data[index]}\n`;
    }
    return text;
  } else if(display === "u16_list") {
    let text = "";
    for(const item of items) {
      const index = item.value;
      if(index >= maxLen/2) 
        continue;
      text += `<b>${item.name}:</b> ${dv.getUint16(0, littleEndian)}\n`;
    }
    return text;
  }
  // string: até \0 ou até len
  else if (type === "string") {
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

    return str;
  }
  // array: devolve bytes e hex
  else if (type === "array") {
    return "0x" + util.bufferToHex(data);
  }

  // tipos numericos
  let numberVal = null;
  if (type === "u8") {
    need(1);
    numberVal = dv.getUint8(0);
  }
  else if (type === "i8") {
    need(1);
    numberVal = dv.getInt8(0);
  }
  else if (type === "u16") {
    need(2);
    numberVal = dv.getUint16(0, littleEndian);
  }
  else if (type === "i16") {
    need(2);
    numberVal = dv.getInt16(0, littleEndian);
  }
  else if (type === "u32") {
    need(4);
    numberVal = dv.getUint32(0, littleEndian);
  }
  else if (type === "i32") {
    need(4);
    numberVal = dv.getInt32(0, littleEndian);
  }
  else {
    // tipo desconhecido: devolve hex
    return "0x" + util.bufferToHex(data);
  }

  // altera valores numericos dependendo do "display"
  if(display === "check") {
    return numberVal > 0 ? `<span style="color: green;">ATIVO</span>` : `<span style="color: red;">INATIVO</span>`;
  } 
  else if(display === "combo") {
    const founditem = items.find(item => item.value == numberVal);
    if(founditem) 
      return founditem.name;
  }
  else if(display === "bitmask") {
    let text = "";
    for (const item of items) {
      const bitActive = numberVal & (Number(item.value) << 1);
      text += `${item.name}: ${bitActive ? `<span style="color: green;">ATIVO</span>` : `<span style="color: red;">INATIVO</span>`}\n`;
    }
    return text;
  }

  // nao precisa alterar, só retorna o valor numerico
  return String(numberVal);
}

/**
 * @typedef {Object} CfgItem
 * @property {string} name
 * @property {number} value
 * @property {"value"|"index"} key
 */

/**
 * @typedef {CfgInfo & {
 *   moduleName?: string,
 *   moduleId?: (string|null),
 *   valueRaw?: Uint8Array,
 *   valueFormatted?: (number|string|{hex:string, bytes:number[]}|null),
 *   items?: CfgItem[]
 * }} CfgInfoWithValue
 */

/**
 * Extrai <item> e <bit> (ou qualquer filho chamado "item") dentro de um <cfg>.
 * Cada item pode ter "value" ou "index" + "name".
 *
 * @param {Element} cfgEl
 * @returns {CfgItem[]}
 */
function extractCfgItems(cfgEl) {
  // aceita tanto <item> quanto <bit> (no seu XML é comum aparecer como <bit index="..">)
  const els = cfgEl.querySelectorAll(":scope > item, :scope > bit");

  /** @type {CfgItem[]} */
  const items = [];

  for (const el of els) {
    const name = el.getAttribute("name") ?? "";

    /** @type {"value"|"index"} */
    let key = null;
    let rawNum = null;

    const v = el.getAttribute("value");
    const i = el.getAttribute("index");

    if (v != null) {
      key = "value";
      rawNum = v;
    } else if (i != null) {
      key = "index";
      rawNum = i;
    } else {
      continue; // não tem nem value nem index
    }

    const num = Number(rawNum);
    if (!Number.isFinite(num)) continue;

    items.push({ name, value: num, key });
  }

  return items;
}

/**
 * Procura uma tag <cfg> pelo ID (number ou string HEX).
 * Se você passar `valueRaw` (Uint8Array), tenta retornar também `valueFormatted`.
 *
 * Também retorna `moduleName/moduleId` e `items` (filhos <item> ou <bit>).
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
  if (!cfg) return null;

  const moduleEl = cfg.closest("module");
  const moduleName = moduleEl?.getAttribute("name") ?? undefined;
  const moduleId = moduleEl?.getAttribute("id") ?? null;

  const lenStr = cfg.getAttribute("len");
  const maxLen = lenStr != null ? Number(lenStr) : null;

  /** @type {CfgInfoWithValue} */
  const result = {
    id: cfg.getAttribute("id") ?? hexId,
    name: cfg.getAttribute("name") ?? "",
    type: cfg.getAttribute("type") ?? "",
    len: lenStr,
    display: cfg.getAttribute("display") ?? "",
    default: cfg.getAttribute("default"),
    desc: cfg.getAttribute("desc"),
    moduleName,
    moduleId,
    items: extractCfgItems(cfg),
  };

  if (valueRaw instanceof Uint8Array) {
    const formatted =
      formatCfgValue(result.type, result.display, result.items, Number.isFinite(maxLen) ? maxLen : null, valueRaw);

    result.valueRaw = valueRaw;
    result.valueFormatted = formatted;
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