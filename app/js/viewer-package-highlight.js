let globalFrames = [];

// Aplica estilo e eventos aos pacotes com CC33
function highlightPackages(text) {
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
                    let classPkgStatus = "";

                    try {
                        if(parseCC33Frame(hexToBuffer(frameStr), false)) 
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
                            const spanEndHexPart = `<span class="${classPkgGroup} pkg-right-part hl-border-bottom">${endHexPart}</span>`
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${startHexPart}${spanEndHexPart}</span>`;
                        }
                        else
                        {
                            newLine = `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${hexPart}</span>`;
                        }
                        
                        text = text.replace(oldLine, newLine);
                    });

                    frameStr = "";
                    linesToReplace = [];
                }

                isCollectingFrame = false;
            }
        }
    });
    
    return text;
}

function getHexDataFromPackage(classPkgGroup) {
    let frameStr = "";
    const elements = document.getElementsByClassName(classPkgGroup);
    for (const el of elements) {
        if(el.classList.contains('pkg-right-part'))
            continue;
        frameStr += el.textContent;
    }
    return frameStr;
}

function setHoverEffectToPackage(classPkgGroup, isHover) {
    if(isHover) {
        // Se tem algum elemento diferente desse classPkgGroup com efeito de hover, removemos o efeito
        for (const el of document.getElementsByClassName(`hl-pkg-hover`)) {
            if (el.classList[0] != classPkgGroup) {
                el.classList.remove(`hl-pkg-hover`);
            }
        }
    }

    // setamos efeito de hover de acordo com o classPkgGroup
    for (const el of document.getElementsByClassName(classPkgGroup)) {
        if(isHover) {
            if (el.classList.contains(`hl-pkg-hover`) === false)
                el.classList.add(`hl-pkg-hover`);
        } else {
            if (el.classList.contains(`hl-pkg-hover`))
                el.classList.remove(`hl-pkg-hover`);
        }
    }
}

// Agenda hover effect aguardando o debounce
// se o estado mudar antes do debounce, cancelamos e reagendamos novamente
// Isso evita que o efeito seja aplicado/removido conforme movemos o mouse em diferentes partes do mesmo pacote
// Pois gerava um efeito "piscante"
let debouncePackageHoverRerender = null;
let lastClassPkgGroup = null
function schedulePackageHoverRerender(classPkgGroup, isHover) {
    if (debouncePackageHoverRerender && lastClassPkgGroup === classPkgGroup) 
        clearTimeout(debouncePackageHoverRerender);
    
    debouncePackageHoverRerender = setTimeout(() => {
        setHoverEffectToPackage(classPkgGroup, isHover);
    }, 50);

    lastClassPkgGroup = classPkgGroup;
}