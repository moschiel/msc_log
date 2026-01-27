let refreshTimer = null;
let lastFileSize = 0;

function ajaxUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ajax", "1");
    url.searchParams.set("file_offset", lastFileSize); // Nao pede o arquivo inteiro, apenas conteudo adicional se houver
    url.searchParams.delete("view");
    url.searchParams.delete("download");
    return url.toString();
}

async function refreshNow() {
  try {
    const resp = await fetch(ajaxUrl(), { cache: "no-store" });
    
    //Armazena o tamanho total do arquivo no servidor
    const fileSize = resp.headers.get("X-File-Size");
    if (fileSize) {
      lastFileSize = Number(fileSize);
    }

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const deltaRaw = await resp.text();
    if (deltaRaw.length > 0) {
      setRawLog(getRawLog() + deltaRaw);   // atualiza raw log
      writeLogBox("append", "text", deltaRaw);   // faz append do texto
      scrollLogBoxToBottomIfNeeded();
    }
  } catch (e) {
    setRawLog("Erro ao carregar arquivo: " + e);
    writeLogBox("set", "text", "Erro ao carregar arquivo: " + e);
  }
}


function startAutoRefreshViewer() {
    stopAutoRefreshViewer();
    refreshTimer = setInterval(()=> {
        if(util.isOnOffButtonPressed(ui.btnAutoRefreshViewer)) {
            refreshNow();
        }
    }, 3000);
}

function stopAutoRefreshViewer() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
}

function setAutoRefreshViewer() {
    if (util.isOnOffButtonPressed(ui.btnAutoRefreshViewer)) 
        startAutoRefreshViewer();
    else 
        stopAutoRefreshViewer();
}