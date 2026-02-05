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
    url.searchParams.set("file_offset", lastFileSize); // Nao pede o arquivo inteiro, apenas conteudo adicional se houver
    url.searchParams.delete("view");
    url.searchParams.delete("download");
    return url.toString();
}


async function tailRefreshNow() {
  try {
    const resp = await fetch(ajaxUrl(), { cache: "no-store" });

    const fileSizeHeader = resp.headers.get("X-File-Size");
    const fileSize = fileSizeHeader ? Number(fileSizeHeader) : null;

    if (fileSize !== null && fileSize < lastFileSize) {
      // Ué, o arquivo diminuiu? 
      // alguem deve ter editado o conteudo do arquivo manualmente, 
      // nesse caso relemos o conteudo do arquivo do inicio      // arquivo "voltou"/diminuiu: reset geral
      ui.btnTailAutoRefresh.disable = true;
      if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) stopTailAutoRefresh();
      clearAllLogData();
      tailRefreshNow();
      if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) startTailAutoRefresh();
      ui.btnTailAutoRefresh.disable = false;
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

    const deltaText = await resp.text();
    if (deltaText.length === 0) return;

    // Atualiza raw log
    setRawLog(getRawLog() + deltaText);

    if(util.isToogleButtonPressed(ui.btnHighlightPkg)) 
    {
      writeLogWithHighlightPackage("append", deltaText);
    } 
    else 
    {
      writeLogBox("append", "text", deltaText);
    }
  } catch (e) {
    setRawLog("Erro ao carregar arquivo: " + e);
    writeLogBox("set", "text", "Erro ao carregar arquivo: " + e);
    setLogBoxPendingPacket("");
  }
}


function startTailAutoRefresh() {
    stopTailAutoRefresh();
    refreshTimer = setInterval(()=> {
        if(util.isToogleButtonPressed(ui.btnTailAutoRefresh)) {
            tailRefreshNow();
        }
    }, 3000);
}

function stopTailAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
}

function setTailAutoRefresh() {
    if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) 
        startTailAutoRefresh();
    else 
        stopTailAutoRefresh();
}