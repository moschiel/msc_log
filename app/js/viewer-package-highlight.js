const cbAnalyzePkg = document.getElementById("analyzePackage");
cbAnalyzePkg.addEventListener("change", () => {
    renderLogText();
});


// Aplica estilo e eventos aos pacotes com CC33
let globalFrames = [];
function analyzePackages(text) {
    const lines = text.split(/\r?\n/);
    const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
    let isCollectingFrame = false;
    let frameStr = "";
    let linesToReplace = [];
    let pkgCounter = 0;

    lines.forEach((line, lineNumber) => {
        if (line.length > LOG_HEADER_EXAMPLE.length) {
            let substrFrame = line.substr(LOG_HEADER_EXAMPLE.length);

            if (!isCollectingFrame && substrFrame.startsWith("CC33") && isHexOnly(substrFrame)) {
                isCollectingFrame = true;
                frameStr = "";
                linesToReplace = [];
            } else if (isCollectingFrame && isHexOnly(substrFrame) === false) {
                isCollectingFrame = false;
            }
            
            if(isCollectingFrame) {
                frameStr += substrFrame;
                linesToReplace.push(line);   
            } else {
                if (frameStr.length > 0) {
                    pkgCounter++;
                    const classPkgGroup = `pkg-${pkgCounter}`;
                    const frameBuf = hexToBuffer(frameStr);
                    let classPkgStatus = "";

                    try {
                        if(parseCC33Frame(frameBuf, false)) 
                            classPkgStatus = 'hl-pkg-ok';
                        else
                            classPkgStatus = 'hl-pkg-err';
                    } catch (e) {
                        console.error(e.message, ", Line: ", line);
                        classPkgStatus = 'hl-pkg-err';
                    }

                    linesToReplace.forEach((oldLine, lineIndex) => {
                        let classBorder = "hl-border-sides";
                        if(lineIndex == 0)
                            classBorder += " hl-border-top"
                        if(lineIndex == (linesToReplace.length - 1))
                            classBorder += " hl-border-bottom"

                        const headerPart = oldLine.slice(0, LOG_HEADER_EXAMPLE.length);
                        const hexPart = oldLine.substr(LOG_HEADER_EXAMPLE.length);
                        let newLine = "";
                        
                        if ( linesToReplace.length >= 2 // Se o pacote tem mais de duas linhas no log
                            && lineIndex === (linesToReplace.length - 2) // Se essa é a penultima linha
                            && (linesToReplace[linesToReplace.length - 1].length < linesToReplace[linesToReplace.length - 2].length) // E a ultima linha eh menor que a penultima linha
                        )
                        {
                            const diffSize = linesToReplace[linesToReplace.length - 2].length - linesToReplace[linesToReplace.length - 1].length;
                            const startHexPart = hexPart.slice(0, hexPart.length - diffSize) 
                            const endHexPart =  hexPart.slice(hexPart.length - diffSize);
                            const spanEndHexPart = `<span class="${classPkgGroup} hl-border-bottom">${endHexPart}</span>`
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${startHexPart}${spanEndHexPart}</span>`;
                        }
                        else
                        {
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${hexPart}</span>`;
                        }
                        
                        text = text.replace(oldLine, newLine);
                    });

                    // Associa Eventos
                    if (classPkgStatus === 'hl-pkg-ok') {
                        linkClickEventToFrame(classPkgGroup, frameBuf);
                        linkHoverEventToFrame(classPkgGroup);
                    }

                    frameStr = "";
                    linesToReplace = [];
                }

                isCollectingFrame = false;
            }
        }
    });
    
    return text;
}


/**
 * @param {string} classPkgGroup
 * @param {Uint8Array} frameBuf
 */
function linkClickEventToFrame(classPkgGroup, frameBuf) {
    // Note que associamos o eventos ao logBox, 
    // quando faria mais sentido associar ao proprio elemento com a classe 'classPkgGroup' usando 'document.getElementsByClassName(classPkgGroup)'
    // O problema é que getElementsByClassName vai retorna nada, pois só quando retorna dessa funcao que a classe vai existir no innerHTML de fato, 
    // nao podemos associar eventos a classes que ainda nao foram renderizadas.
    logBox.addEventListener("click", e => {
        if (e.target.classList.contains(classPkgGroup)) {
            //console.log("clicou:", classPkgGroup);
            //const index = Number(classPkgGroup.replace("pkg-", "")) - 1;
            parseCC33Frame(frameBuf, true);
        }
    });
}

function linkHoverEventToFrame(classPkgGroup) {
    logBox.addEventListener("mouseover", e => {
        if (e.target.classList.contains(classPkgGroup)) {
            const elements = document.getElementsByClassName(classPkgGroup);
            for (const el of elements) {
                if (el.classList.contains(`hl-pkg-mouseover`) === false)
                    el.classList.add(`hl-pkg-mouseover`);
            }
        }
    });
    logBox.addEventListener("mouseout", e => {
        if (e.target.classList.contains(classPkgGroup)) {
            const elements = document.getElementsByClassName(classPkgGroup);
            for (const el of elements) {
                if (el.classList.contains(`hl-pkg-mouseover`))
                    el.classList.remove(`hl-pkg-mouseover`);
            }
        }
    });
}


