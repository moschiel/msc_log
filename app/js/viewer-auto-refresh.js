let refreshTimer = null;

function ajaxUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ajax", "1");
    url.searchParams.set("file_len", getRawLog().length);
    url.searchParams.delete("view");
    url.searchParams.delete("download");
    return url.toString();
}

async function refreshNow() {
  try {
    const resp = await fetch(ajaxUrl(), { cache: "no-store" });
    console.log(resp.status);
    if (resp.status === 204) {
      return; // nada mudou
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