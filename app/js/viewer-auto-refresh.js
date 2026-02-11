import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import {
  clearLogBox, clearRawLog, setRawLog, getRawLog, writeLogBox, setLogBoxPendingPacket,
  processLogChunkAndRender,
  disableControlsForRender
} from "./viewer-render-log.js";
import { clearHighlightPkgCounters, clearSelectedMessageCounters } from "./viewer-package-parser.js";


let refreshTimer = null;
let lastFileSize = 0;
let localFileHandle = null;
let localFileObj    = null;

export function clearAllLogData() {
  clearHighlightPkgCounters();
  clearSelectedMessageCounters();
  clearLogBox();
  clearRawLog();
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

// handlers de seleção de arquivo local, permite verificar o estado atual do arquivo
export function setLocalFileHandle(handle) {
  localFileHandle = handle;
  localFileObj = null;
  lastFileSize = 0;
}
// esse handler só permite ver o snapshot do arquivo no momento da seleção, 
// ou seja, se o arquivo mudar, nao tem como saber, o usuário teria que selecionar o arquivo novamente
export function setLocalFileObject(file) {
  localFileObj = file;
  localFileHandle = null;
  lastFileSize = 0;
}

/**
 * Lê o conteúdo adicional do arquivo de log local (tail) se existir.
 * Retorna um objeto com o conteudo do tail e um flag indicando se o arquivo "resetou" (diminuiu de tamanho, indicando que foi editado manualmente ou regravado). 
 * @returns {Promise<{tailText: string}>}
*/
async function readLocalTailChunk() {
  let file;

  if (localFileHandle) {
    file = await localFileHandle.getFile();
  } else {
    return { tailText: "" };
  }

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
    
    // Atualiza raw log
    setRawLog(getRawLog() + tailText);

    const highlight = util.isToogleButtonPressed(ui.btnHighlightPkg);
    const searchMsgID = Number(ui.selListMessage.value);
    if (highlight || !isNaN(searchMsgID)) {
      // Se highlight de pacote ou pesquisa de mensagem estiver ativo, 
      // processa o tail recebido para renderizar o novo conteudo de acordo com as opções.
      processLogChunkAndRender("append", tailText, { highlight, searchMsgID });
    }

    if (!highlight) {
      // highlight inativo, 
      // renderiza o texto bruto do Tail recebido no logBox (área visível do log)
      writeLogBox("append", "text", tailText);
    }

  } catch (e) {
    setRawLog("Erro ao carregar arquivo: " + e);
    writeLogBox("set", "text", "Erro ao carregar arquivo: " + e);
    setLogBoxPendingPacket("");
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