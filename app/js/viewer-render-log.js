const logBox = document.getElementById("logBox");
const cbAutoScroll = document.getElementById("autoScroll");
let rawTextLog = "";

function setRawLog(rawText) {
    rawTextLog = rawText;
}

function getRawLog() {
    return rawTextLog;
}

function setLogBoxInnerHTML(text) {
    logBox.innerHTML = text;
}

function renderLogText() {
    const termsToHighlight = getTermsToHighlight();
    if (termsToHighlight.length === 0 && cbAnalyzePkg.checked === false) {
        setLogBoxInnerHTML(rawTextLog);
        return;
    }

    // Escapa HTML primeiro
    let html = escapeHtml(rawTextLog);
    
    // Aplica highlight dos pacotes com CC33
    if(cbAnalyzePkg.checked) {
        html = analyzePackages(html);
    }
   
    // Aplica highlight nos termos pesquisados
    if (termsToHighlight.length > 0) {
        html = addHighlightStyleToTerms(html, termsToHighlight);
    }
    
    setLogBoxInnerHTML(html);
}

function scrollToBottomIfNeeded() {
    if (!cbAutoScroll.checked) return;
    logBox.scrollTop = logBox.scrollHeight;
}