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
    setLogBoxPendingPacket("");
}

/**
 * @param {string} mode: "set" | "append"
 * @param {string} type: "text" | "html"
 * @param {string} content
 */
function writeLogBox(mode, type, content, isPendingCC33Content = false) {
    const el = isPendingCC33Content ? ui.logPendingPacketContent : ui.logContent;

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
function setLogBoxPendingPacket(content) {
    writeLogBox("set", "text", content, true);
}

function getLogBoxPendingPacket() {
    return ui.logPendingPacketContent.textContent;
}

function scrollLogBoxToBottomIfNeeded() {
    if (util.isToogleButtonPressed(ui.btnAutoScroll))
        ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

