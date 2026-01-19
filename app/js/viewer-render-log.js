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

function renderLogText() {
    const termsToHighlight = getTermsToHighlight();
    if (termsToHighlight.length === 0 && ui.cbAnalyzePkg.checked === false) {
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
    if(ui.cbAnalyzePkg.checked) {
        console.log("analisando pacotes");
        if (PKG_HIGHLIGHT_VERSION === "V1") htmlEscaped = highlightPackagesV1(htmlEscaped);
        else if (PKG_HIGHLIGHT_VERSION === "V2") htmlEscaped = HighlightPackagesV2(htmlEscaped);
        else if (PKG_HIGHLIGHT_VERSION === "V3") htmlEscaped = highlightPackagesV3(htmlEscaped);
        console.log("concluído análise de pacotes");
    }

    // Aplica highlight nos termos pesquisados
    if (termsToHighlight.length > 0) {
        console.log("pesquisando termos");
        htmlEscaped = highlightTerms(htmlEscaped, termsToHighlight);
        console.log("concluído pesquisa dos termos")
    }
    
    setLogBoxInnerHTML(htmlEscaped);
}

function scrollToBottomIfNeeded() {
    if (!ui.cbAutoScroll.checked) return;
    ui.logBox.scrollTop = ui.logBox.scrollHeight;
}