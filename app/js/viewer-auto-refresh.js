import { util } from "./utils.js";
import { ui } from "./viewer-ui-elements.js";
import {
  clearLogBox, clearRawLog, setRawLog, getRawLog, writeLogBox, setLogBoxPendingPacket,
  processLogChunkAndRender
} from "./viewer-render-log.js";
import { clearHighlightPkgCounters } from "./viewer-package-parser.js";


let refreshTimer = null;
let lastFileSize = 0;

function clearAllLogData() {
  clearHighlightPkgCounters();
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
 * 
 * Atualiza o logBox e o rawLog com o novo conteudo.
 */
export async function tailRefreshNow() {
  try {
    const resp = await fetch(ajaxUrl(), { cache: "no-store" });

    const fileSizeHeader = resp.headers.get("X-File-Size");
    const fileSize = fileSizeHeader ? Number(fileSizeHeader) : null;

    if (fileSize !== null && fileSize < lastFileSize) {
      // Ué, o arquivo diminuiu? 
      // alguem deve ter editado o conteudo do arquivo manualmente, 
      // nesse caso relemos o conteudo do arquivo do inicio      // arquivo "voltou"/diminuiu: reset geral
      ui.btnTailAutoRefresh.disabled = true;
      if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) stopTailAutoRefresh();
      clearAllLogData();
      tailRefreshNow();
      if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) startTailAutoRefresh();
      ui.btnTailAutoRefresh.disabled = false;
      return;
    }

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    if (fileSize !== null) {
      if (lastFileSize === 0) {
        // lendo arquivo do inicio, limpa tudo
        clearAllLogData();
      }
      lastFileSize = fileSize;
    }

    const tailText = await resp.text();
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
  }, 3000);
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