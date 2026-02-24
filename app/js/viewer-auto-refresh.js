import { util } from "./utils.js?v=__PLACEHOLDER_BUILD_VERSION__";
import { ui } from "./viewer-ui-elements.js?v=__PLACEHOLDER_BUILD_VERSION__";
import {
  clearVirtualLog, clearLogMemory, setRawLog, getRawLog, setPendingHtmlText,
  processLogChunkAndRender,
  setSafeHtmlText,
  appendRawLog
} from "./viewer-render-log.js?v=__PLACEHOLDER_BUILD_VERSION__";
import { clearPkgInfo } from "./viewer-package-parser.js?v=__PLACEHOLDER_BUILD_VERSION__";
import { virtualTextBox } from "./virtual-text-box.js?v=__PLACEHOLDER_BUILD_VERSION__";


let refreshTimer = null;
let lastFileSize = 0;
let localFileObj    = null;

export function clearAllLogData() {
  clearPkgInfo();
  clearVirtualLog();
  clearLogMemory();
  lastFileSize = 0;
}

function ajaxUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("ajax", "1");
  // @ts-ignore
  url.searchParams.set("file_offset", lastFileSize); // Nao pede o arquivo inteiro, apenas conteudo adicional se houver
  url.searchParams.delete("view");
  url.searchParams.delete("download");
  return url.toString();
}

/**
 * Requisita ao servidor o conteudo adicional do arquivo de log (tail) se existir.
 * Retorna um objeto com o conteudo do tail e um flag indicando se o arquivo "resetou" (diminuiu de tamanho, indicando que foi editado manualmente ou regravado).
 * @returns {Promise<{tailText: string}>} 
*/
async function readRemoteTailChunk() {
  const resp = await fetch(ajaxUrl(), { cache: "no-store" });

  const fileSizeHeader = resp.headers.get("X-File-Size");
  const fileSize = fileSizeHeader ? Number(fileSizeHeader) : null;

  if (fileSize !== null && fileSize < lastFileSize) {
    // Ué, o arquivo diminuiu? 
    // alguem deve ter editado o conteudo do arquivo manualmente, 
    // nesse caso relemos o conteudo do arquivo do inicio
    clearAllLogData();
    return readRemoteTailChunk();
  }

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  if(fileSize === lastFileSize) {
    // nao tem conteudo novo, retorna vazio
    return { tailText: "" };
  }

  if (fileSize !== null && lastFileSize === 0) {
    clearAllLogData(); // lendo arquivo do inicio, limpa tudo para garantir
    lastFileSize = fileSize;
    return { tailText: await resp.text() };
  }

  // retornando pedaço do arquivo a partir do ultimo offset conhecido (tail)
  if (fileSize !== null) {
    lastFileSize = fileSize;
  }
  const tailText = await resp.text();
  return { tailText };
}

// seleção de snapshot do arquivo local, 
// se o arquivo mudar nao detecta, usuario tem que selecionar arquivo novamente, 
// logo nao faz sentido auto-refresh
export function setLocalFileObject(file) {
  localFileObj = file || null;
  lastFileSize = 0;
}

/**
 * Lê o conteúdo adicional do arquivo de log local (tail) se existir.
 * Retorna um objeto com o conteudo do tail e um flag indicando se o arquivo "resetou" (diminuiu de tamanho, indicando que foi editado manualmente ou regravado). 
 * @returns {Promise<{tailText: string}>}
*/
async function readLocalTailChunk() {
  const file = localFileObj;
  if (!file) return { tailText: "" };

  const size = file.size;

  if (size === lastFileSize) {
    // nao tem conteudo novo, retorna vazio
    return { tailText: "" };
  }

  if (size < lastFileSize) {
    // Ué, o arquivo diminuiu? 
    // alguem deve ter editado o conteudo do arquivo manualmente, 
    // nesse caso relemos o conteudo do arquivo do inicio
    clearAllLogData();
    lastFileSize = size;
    return { tailText: await file.text() };
  }

  if (lastFileSize === 0) {
    clearAllLogData(); // lendo arquivo do inicio, limpa tudo para garantir
    lastFileSize = size;
    return { tailText: await file.text() };
  }

  // retorando pedaço do arquivo a partir do ultimo offset conhecido (tail)
  const tailText = await file.slice(lastFileSize, size).text();
  lastFileSize = size;
  return { tailText };
}


/**
 * Requisita ao servidor o conteudo adicional do arquivo de log (tail) se existir.
 * 
 * Atualiza o logBox e o rawLog com o novo conteudo.
 */
export async function tailRefreshNow() {
  try {
    const { tailText } = util.isLocalFile()
      ? await readLocalTailChunk()
      : await readRemoteTailChunk();

    if (tailText.length === 0) return;
    
    // Append raw log
    appendRawLog(tailText);

    const highlight = util.isToogleButtonPressed(ui.btnHighlightPkg);
    const searchMsgID = ui.selListMessage.value;
    if (highlight || searchMsgID != "none") {
      // Se highlight de pacote ou pesquisa de mensagem estiver ativo, 
      // processa o tail recebido para renderizar o novo conteudo de acordo com as opções.
      processLogChunkAndRender("append", tailText, { highlight, searchMsgID });
    }

    if (!highlight) {
      // highlight inativo, 
      // renderiza o texto bruto recebido
      // virtualTextBox.appendHtmlText(tailText);
      virtualTextBox.setHtmlText(util.escapeHtml(getRawLog()));
    }

  } catch (e) {
    const errMsg = "Erro ao carregar arquivo: " + e; 
    setRawLog(errMsg);
    setSafeHtmlText(errMsg);
    setPendingHtmlText("");
    virtualTextBox.setHtmlText(errMsg);
  }
}


function startTailAutoRefresh() {
  stopTailAutoRefresh();
  refreshTimer = setInterval(() => {
    if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) {
      tailRefreshNow();
    }
  }, util.isLocalFile() ? 1000 : 3000);
}

function stopTailAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

/**
 * Configura o auto refresh do tail do log de acordo com o estado do botão de auto refresh.
 */
export function setTailAutoRefresh() {
  if (util.isToogleButtonPressed(ui.btnTailAutoRefresh))
    startTailAutoRefresh();
  else
    stopTailAutoRefresh();
}