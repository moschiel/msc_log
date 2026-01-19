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

    const delta = await resp.text();
    if (delta.length > 0) {
      setRawLog(getRawLog() + delta);   // concatena só o que chegou
      renderLogText();
      scrollToBottomIfNeeded();
    }
  } catch (e) {
    setRawLog("Erro ao carregar arquivo: " + e);
    setLogBoxInnerHTML("Erro ao carregar arquivo: " + e);
  }
}


function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(()=> {
        if(ui.cbAutoRefresh.checked) {
            refreshNow();
        }
    }, 3000);
}

function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
}

function setAutoRefresh() {
    if (ui.cbAutoRefresh.checked) 
        startAutoRefresh();
    else 
        stopAutoRefresh();
}