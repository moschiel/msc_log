let rawTextLog = "";

function setRawLog(rawText) {
    rawTextLog = rawText;
}

function getRawLog() {
    return rawTextLog;
}

// Lento demais se for muito grande o conteudo
function setLogBoxInnerHTML(text) {
    ui.logBox.innerHTML = text;
}

// Rapido pois tudo é tratado como texto (inlusive as tags html), 
// logo nao da pra estilizar o texto com as tags
function setLogBoxTextContent(text) {
    ui.logBox.textContent = text;
}

function renderLogText(opt = {packagesHighlight: false, termsHighlight: false}) {
    if (opt.packagesHighlight === false && opt.termsHighlight === false) {
        // Nao tem nada pra fazer highlight
        setLogBoxTextContent(getRawLog());
        return;
    }

    // IMPORTANTE: Escapa HTML primeiro
    // Escapa o conteúdo bruto do log antes de usar innerHTML.
    // Isso garante que qualquer "<", ">", "&", etc vindos do arquivo
    // sejam tratados como TEXTO, e não como HTML executável,
    // evitando interpretação indevida do log e riscos de XSS.
    // Após o escape, apenas os <span> inseridos pelo highlight
    // são HTML válido, mantendo controle total do markup.
    let htmlEscaped = escapeHtml(getRawLog());
    
    // Aplica highlight dos pacotes com CC33
    if(opt.packagesHighlight) {
        if (PKG_HIGHLIGHT_VERSION === "V1") 
            htmlEscaped = highlightPackagesV1(htmlEscaped);
        else // V2 ou V3
            htmlEscaped = fastHighlightPackages(htmlEscaped);
    }

    // Aplica highlight nos termos pesquisados
    if(opt.termsHighlight) {
        const termsToHighlight = getTermsToHighlight();
        if (termsToHighlight.length > 0) {
            htmlEscaped = highlightTerms(htmlEscaped, termsToHighlight);
        }
    }
    
    setLogBoxInnerHTML(htmlEscaped);
}

function scrollToBottomIfNeeded() {
    if (!ui.cbAutoScroll.checked) return;
    ui.logBox.scrollTop = ui.logBox.scrollHeight;
}