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
 */

/**
 * Normaliza um ID para o formato do XML: HEX com 6 caracteres, maiúsculo.
 *
 * - number: converte para HEX, padStart(6, "0"), upper.
 * - string: remove prefixo 0x/0X se existir, valida HEX, padStart(6, "0"), upper.
 *
 * @param {number|string} id
 * @returns {string} ex: "010600"
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

    if (s.startsWith("0x") || s.startsWith("0X")) {
      s = s.slice(2);
    }

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
 * Procura uma tag <cfg> pelo ID (number ou string HEX).
 * O ID no XML é uma string HEX de 6 caracteres maiúsculos.
 *
 * @param {number|string} id Number (ex: 0x010600) ou string (ex: "010600" / "0x010600")
 * @returns {CfgInfo|null}
 */
export function findCfg(id) {
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

  const result = {
    id: cfg.getAttribute("id") ?? hexId,
    name: cfg.getAttribute("name") ?? "",
    type: cfg.getAttribute("type") ?? "",
    len: cfg.getAttribute("len"),
    display: cfg.getAttribute("display"),
    default: cfg.getAttribute("default"),
    desc: cfg.getAttribute("desc"),
  };

  //console.log("CFG encontrado:", result);

  return result;
}