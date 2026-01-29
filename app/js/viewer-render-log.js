let rawTextLog = "";

function setRawLog(rawText) {
    rawTextLog = rawText;
}

function getRawLog() {
    return rawTextLog;
}

function clearRawLog() {
    setRawLog("");
}

function clearLogBox() {
    writeLogBox("set", "html", "Carregando...");
    writeLogBoxPending("set", "html", "");
}

/**
 * @param {string} mode: "set" | "append"
 * @param {string} type: "text" | "html"
 * @param {string} content
 */
function writeLogBox(mode, type, content, isPendingCC33Content = false) {
    const el = isPendingCC33Content ? ui.logPendingCC33Content : ui.logContent;

    if(mode === "set") 
    {
        if(type === "text")
            el.textContent = content;
        else if(type === "html") // html - lento demais se for muito grande o conteudo
            el.innerHTML = content;
    }
    else if(mode === "append")
    {
        if(type === "text")
            el.insertAdjacentText("beforeend", content);
        else if(type === "html")
            el.insertAdjacentHTML("beforeend", content);
    }

    scrollLogBoxToBottomIfNeeded();
}

/**
 * @param {string} mode: "set" | "append"
 * @param {string} type: "text" | "html"
 * @param {string} content
 */
function writeLogBoxPending(mode, type, content) {
    writeLogBox(mode, type, content, true);
}


function scrollLogBoxToBottomIfNeeded() {
    if (util.isToogleButtonPressed(ui.btnAutoScroll))
        ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

