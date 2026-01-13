const cbAnalyzePkg = document.getElementById("analyzePackage");

function isHexOnly(str) {
    return /^[0-9a-fA-F]+$/.test(str);
}

// Aplica highlight dos pacotes com CC33
function analyzePackages(text) {
    let collectingFrame = false;
    let frameStr = "";
    const lines = text.split(/\r?\n/);
    const logStartSample = "[20251104-100340][0314593097][DBG][MEM ]: ";
    let indexN = logStartSample.length;

    lines.forEach((line, lineNumber) => {
        if (line.length > indexN) {
            let substr = line.substr(indexN);

            if (substr.startsWith("CC33") && isHexOnly(substr)) {
                collectingFrame = true;
            } else if (collectingFrame && isHexOnly(substr) === false) {
                collectingFrame = false;
            }
            
            if(collectingFrame) {
                frameStr = frameStr + substr;    
                const re = new RegExp(escapeRegex(substr), "g");
                text = text.replace(re, (x) => `<span class="hl-package">${x}</span>`);
            } else {
                if (frameStr.length > 0) {
                    console.log("Frame: ", frameStr);
                }
                frameStr = ""
                collectingFrame = false;
            }
        }
    });
    
    return text;
}

// Eventos
cbAnalyzePkg.addEventListener("change", () => {
    renderLogText();
});