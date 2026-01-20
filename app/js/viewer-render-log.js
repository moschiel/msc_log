let rawTextLog = "";

function setRawLog(rawText) {
    rawTextLog = rawText;
}

function getRawLog() {
    return rawTextLog;
}

/**
 * @param {string} mode: "set" | "append"
 * @param {string} type: "text" | "html"
 * @param {string} content
 */
function writeLogBox(mode, type, content) {
    if(mode === "set") 
    {
        if(type === "text")
            ui.logBox.textContent = content;
        else // html - lento demais se for muito grande o conteudo
            ui.logBox.innerHTML = content;
    }
    else //append
    {
        if(type === "text")
            ui.logBox.insertAdjacentText("beforeend", content);
        else //html
            ui.logBox.insertAdjacentHTML("beforeend", content);
    }
}


// Refaz a renderização de todo o conteudo do log
function rerenderLogContent(opt = {packagesHighlight: false, termsHighlight: false}) {
    if (opt.packagesHighlight === false && opt.termsHighlight === false) {
        // Nao tem nada pra fazer highlight
        writeLogBox("set", "text", getRawLog());
        return;
    }

    // IMPORTANTE: Escapa HTML primeiro
    // Escapa o conteúdo bruto do log antes de usar innerHTML.
    // Isso garante que qualquer "<", ">", "&", etc vindos do arquivo
    // sejam tratados como TEXTO, e não como HTML executável,
    // evitando interpretação indevida do log e riscos de XSS.
    // Após o escape, apenas os <span> inseridos pelo highlight
    // são HTML válido, mantendo controle total do markup.
    let innerHtml = escapeHtml(getRawLog());
    
    // Aplica highlight dos pacotes com CC33
    if(opt.packagesHighlight) {
        if (PKG_HIGHLIGHT_VERSION === "V1") 
            innerHtml = highlightPackagesV1(innerHtml);
        else // V2 ou V3
            innerHtml = fastHighlightPackages(innerHtml);
    }

    // Aplica highlight nos termos pesquisados
    if(opt.termsHighlight) {
        const termsToHighlight = getTermsToHighlight();
        if (termsToHighlight.length > 0) {
            innerHtml = highlightTerms(innerHtml, termsToHighlight);
        }
    }
    
    writeLogBox("set", "html", innerHtml);
}


function scrollToBottomIfNeeded() {
    if (!ui.cbAutoScroll.checked) return;
    ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

