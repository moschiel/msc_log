let rawTextLog = "";

function setRawLog(rawText) {
    rawTextLog = rawText;
}

function getRawLog() {
    return rawTextLog;
}

function setLogBoxInnerHTML(text) {
    ui.logBox.innerHTML = text;
}

function renderLogText() {
    const termsToHighlight = getTermsToHighlight();
    if (termsToHighlight.length === 0 && ui.cbAnalyzePkg.checked === false) {
        setLogBoxInnerHTML(rawTextLog);
        return;
    }

    // Escapa HTML primeiro
    let html = escapeHtml(rawTextLog);
    
    // Aplica highlight dos pacotes com CC33
    if(ui.cbAnalyzePkg.checked) {
        html = highlightPackages(html);
    }
   
    // Aplica highlight nos termos pesquisados
    if (termsToHighlight.length > 0) {
        html = highlightTerms(html, termsToHighlight);
    }
    
    setLogBoxInnerHTML(html);

}

function scrollToBottomIfNeeded() {
    if (!ui.cbAutoScroll.checked) return;
    ui.logBox.scrollTop = ui.logBox.scrollHeight;
}