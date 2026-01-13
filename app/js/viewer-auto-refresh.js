const cbAutoRefresh = document.getElementById("autoRefresh");
let refreshTimer = null;

function ajaxUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ajax", "1");
    url.searchParams.delete("view");
    url.searchParams.delete("download");
    return url.toString();
}

async function refreshNow() {
    try {
        const resp = await fetch(ajaxUrl(), { cache: "no-store" });
        const text = await resp.text();
        setRawLog(text);
        renderLogText();
        scrollToBottomIfNeeded();
    } catch (e) {
        setRawLog("Erro ao carregar arquivo: " + e)
        setLogBoxInnerHTML("Erro ao carregar arquivo: " + e);
    }
}

function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(()=> {
        if(cbAutoRefresh.checked) {
            refreshNow();
        }
    }, 3000);
}

function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
}

// Eventos
cbAutoRefresh.addEventListener("change", () => {
    if (cbAutoRefresh.checked) 
        startAutoRefresh();
    else 
        stopAutoRefresh();
});