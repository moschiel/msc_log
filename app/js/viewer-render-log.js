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
        else if(type === "html") // html - lento demais se for muito grande o conteudo
            ui.logBox.innerHTML = content;
    }
    else if(mode === "append")
    {
        if(type === "text")
            ui.logBox.insertAdjacentText("beforeend", content);
        else if(type === "html")
            ui.logBox.insertAdjacentHTML("beforeend", content);
    }
}


function scrollLogBoxToBottomIfNeeded() {
    if (util.isOnOffButtonPressed(ui.btnAutoScroll))
        ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

