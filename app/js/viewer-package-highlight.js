const PKG_HIGHLIGHT_VERSION = "V3";
const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
let globalFrames = [];

// Aplica estilos aos pacotes com CC33 (lento pois usa replace() em cada linha)
function highlightPackagesV1(text) {
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
                //Encontrou inicio do frame, inicia a coleta das linhas seguintes
                isCollectingFrame = true;
                frameStr = "";
                linesToReplace = [];
            } else if (isCollectingFrame && isHexOnly(substrFrame) === false) {
                // Terminou de coletar linhas desse pacote
                isCollectingFrame = false;
            }
            
            if(isCollectingFrame) {
                // Coleta mais uma linha do pacote atual
                frameStr += substrFrame;
                linesToReplace.push(line);   
            } else {
                if (frameStr.length > 0) {
                    pkgCounter++;
                    console.log("Analisando pacote ", pkgCounter);
                    // essa classe sera incluida em todas linhas (tags span) que pertencam a um mesmo pacote
                    // assim em outros mudulos, via className podemos recuperar todo os elementos "span" de um pacote especifico
                    const classPkgGroup = `pkg-${pkgCounter}`; 
                    let classPkgStatus = "";

                    try {
                        if(parseCC33Frame(hexToBuffer(frameStr), false)) 
                            classPkgStatus = 'hl-pkg-ok'; //classe para ficar com highlight ok
                        else
                            classPkgStatus = 'hl-pkg-err'; //classe para ficar com highlight de erro
                    } catch (e) {
                        console.error(e.message, ", Line: ", line);
                        classPkgStatus = 'hl-pkg-err';
                    }
                    
                    // substitui todas as linhas desse pacote, por linhas estilizadas com a tag span
                    linesToReplace.forEach((oldLine, lineIndex) => {
                        let classBorder = "hl-border-sides"; // adiciona borda nas laterais
                        if(lineIndex == 0)
                            classBorder += " hl-border-top"; // primeira linha do pacote tem borda no topo
                        if(lineIndex == (linesToReplace.length - 1))
                            classBorder += " hl-border-bottom"; //ultima linha do pacote tempo borda embaixo

                        const headerPart = oldLine.slice(0, LOG_HEADER_EXAMPLE.length);
                        const hexPart = oldLine.substr(LOG_HEADER_EXAMPLE.length);
                        let newLine = "";
                        
                        if ( linesToReplace.length >= 2 // Se o pacote tem mais de duas linhas no log
                            && lineIndex === (linesToReplace.length - 2) // Se essa é a penultima linha
                            && (linesToReplace[linesToReplace.length - 1].length < linesToReplace[linesToReplace.length - 2].length) // E a ultima linha eh menor que a penultima linha
                        )
                        {
                            // entao temos que aplicar borda embaixo dessa linha tambem, mas so na parte do frame que nao tenha caracteres de outro frame abaixo dele

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

// Aplica estilos aos pacotes com CC33 (versão rápida: sem operacao de replace(), seta direto no vetor lines)
function highlightPackagesV2(text) {
    const lines = text.split(/\r?\n/);
    const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
    const headerLen = LOG_HEADER_EXAMPLE.length;

    let isCollectingFrame = false;
    let frameParts = [];          // guarda as partes hex de cada linha (sem header)
    let lineIndexes = [];         // guarda os índices das linhas que pertencem ao pacote
    let pkgCounter = 0;

    function flushPackage() {
        if (frameParts.length === 0) return;

        pkgCounter++;
        //console.log("Analisando pacote ", pkgCounter);
        
        // essa classe sera incluida em todas linhas (tags span) que pertencam a um mesmo pacote
        // assim em outros mudulos, via className podemos recuperar todo os elementos "span" de um pacote especifico
        const classPkgGroup = `pkg-${pkgCounter}`;
        let classPkgStatus = "";

        const frameStr = frameParts.join("");

        try {
            if (parseCC33Frame(hexToBuffer(frameStr), false))
                classPkgStatus = "hl-pkg-ok"; //classe para ficar com highlight ok
            else
                classPkgStatus = "hl-pkg-err"; //classe para ficar com highlight de erro
        } catch (e) {
            console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            classPkgStatus = 'hl-pkg-err';
        }

        const total = lineIndexes.length;

        // substitui todas as linhas desse pacote, por linhas estilizadas com a tag span
        for (let i = 0; i < total; i++) {
            const idx = lineIndexes[i];
            const oldLine = lines[idx];

            // segurança
            if (!oldLine || oldLine.length < headerLen) continue;

            let classBorder = "hl-border-sides"; // adiciona borda nas laterais
            if (i === 0) classBorder += " hl-border-top"; // primeira linha do pacote tem borda no topo
            if (i === total - 1) classBorder += " hl-border-bottom"; //ultima linha do pacote tempo borda embaixo

            const headerPart = oldLine.slice(0, headerLen);
            const hexPart = oldLine.slice(headerLen);

            let newLine = "";

            // sua regra especial da penúltima linha
            if (
                total >= 2 && // Se o pacote tem mais de duas linhas no log
                i === (total - 2) && // Se essa é a penultima linha
                (lines[lineIndexes[total - 1]].length < lines[lineIndexes[total - 2]].length) // E a ultima linha é menor que a penultima linha
            ) {
                // entao temos que aplicar borda embaixo dessa linha tambem, 
                // mas só na parte direita do frame que nao tenha caracteres de outro frame abaixo dele

                const lastLine = lines[lineIndexes[total - 1]];
                const penultLine = lines[lineIndexes[total - 2]];

                const diffSize = penultLine.length - lastLine.length;

                const startHexPart = hexPart.slice(0, hexPart.length - diffSize);
                const endHexPart = hexPart.slice(hexPart.length - diffSize);

                const spanEndHexPart =
                    `<span class="${classPkgGroup} pkg-right-part hl-border-bottom">${endHexPart}</span>`;

                newLine =
                    `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">` +
                    `${startHexPart}${spanEndHexPart}</span>`;
            } else {
                newLine =
                    `${headerPart}<span class="${classPkgGroup} ${classPkgStatus} ${classBorder}">${hexPart}</span>`;
            }

            lines[idx] = newLine; // ✅ troca direto no array (O(1))
        }

        // reset do pacote
        frameParts = [];
        lineIndexes = [];
    }

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];

        if (line.length <= headerLen) {
            // se estava coletando e “quebrou”, fecha pacote
            if (isCollectingFrame) {
                isCollectingFrame = false;
                flushPackage();
            }
            continue;
        }

        const substrFrame = line.slice(headerLen);

        if (!isCollectingFrame) {
            if (substrFrame.startsWith("CC33") && isHexOnly(substrFrame)) {
                //Encontrou inicio do frame, inicia a coleta das linhas seguintes
                isCollectingFrame = true;
                frameParts = [];
                lineIndexes = [];
            }
        } else {
            // está coletando: se não for hex, termina pacote
            if (!isHexOnly(substrFrame)) {
                // Terminou de coletar linhas desse pacote
                isCollectingFrame = false;
                flushPackage();
                continue;
            }
        }

        if (isCollectingFrame) {
            // Coleta mais uma linha do pacote atual
            frameParts.push(substrFrame);     // ✅ sem += (usa join no final)
            lineIndexes.push(lineNumber);
        } else {
            // se não está coletando, segue normal
        }
    }

    // se o arquivo acabou no meio de um pacote, fecha ele também
    if (isCollectingFrame) {
        flushPackage();
    }

    return lines.join("\n");
}

// Aplica estilos aos pacotes com CC33 (A mesma velocidade do V2, mas a pagina nao fica pesada/lenta)
// Versao gera apenas uma tag <span> por pacote, assim tendo bem menos elementos no DOM para o browser gerenciar.
// Tambem nao é necessário escutar evento de hover via javascript em cada pedaço do frame, pois tudo está em um único span
// O estilo fica porco, não da pra aplicar bordas, e o header de cada linha tambem fica com background colorido)
// E ja que o estilo fica porco, dane-se o efeito de hover tambem, removemos.
function highlightPackagesV3(text) {
    const lines = text.split(/\r?\n/);
    const headerLen = LOG_HEADER_EXAMPLE.length;

    let isCollectingFrame = false;
    let lineIndexes = [];         // índices das linhas do pacote
    let pkgCounter = 0;
    let errPkgCounter = 0;

    function flushPackage() {
        if (lineIndexes.length === 0) return;

        pkgCounter++;

        const classPkgGroup = `pkg-${pkgCounter}`;
        let classPkgStatus = "";

        const total = lineIndexes.length;
        let frameStr = "";
        for (let i = 0; i < total; i++) {
            frameStr += lines[lineIndexes[i]].slice(headerLen);
        }

        try {
            classPkgStatus = parseCC33Frame(hexToBuffer(frameStr), false)
                ? "hl-pkg-ok"
                : "hl-pkg-err";
        } catch (e) {
            console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            classPkgStatus = "hl-pkg-err";
            errPkgCounter++;
        }

        const firstIdx = lineIndexes[0];
        const lastIdx = lineIndexes[total - 1];
        if(total === 1) {
            //se tem só uma linha, abre e fecha o span nessa linha
            lines[firstIdx] = `<span class="${classPkgGroup} ${classPkgStatus}">${lines[firstIdx]}</span>`;
        } else if (total > 1) {
            // abre span na primeira linha
            lines[firstIdx] = `<span class="${classPkgGroup} ${classPkgStatus}">${lines[firstIdx]}`;
            // fecha na ultima
            lines[lastIdx] += "</span>";
        }

        // reset do pacote
        lineIndexes = [];
    }

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];

        if (!line || line.length <= headerLen) {
            if (isCollectingFrame) {
                isCollectingFrame = false;
                flushPackage();
            }
            continue;
        }

        const substrFrame = line.slice(headerLen);

        if (!isCollectingFrame) {
            if (substrFrame.startsWith("CC33") && isHexOnly(substrFrame)) {
                isCollectingFrame = true;
                lineIndexes = [];
            }
        } else {
            if (!isHexOnly(substrFrame)) {
                isCollectingFrame = false;
                flushPackage();
                continue;
            }
        }

        if (isCollectingFrame) {
            lineIndexes.push(lineNumber);
        }
    }

    if (isCollectingFrame) {
        flushPackage();
    }
    
    //console.log(`Total Pacotes: ${pkgCounter}, com erro: ${errPkgCounter}`);
    alert(`Total Pacotes: ${pkgCounter}\r\nPacotes com erro: ${errPkgCounter}`);
    return lines.join("\n");
}


function getHexDataFromPackage(classPkgGroup) {
    if(PKG_HIGHLIGHT_VERSION === "V3") 
    {
        let frameStr = "";
        const elements = document.getElementsByClassName(classPkgGroup);
        const lines = elements[0].textContent.split("\n");
        for (const line of lines) {
            frameStr += line.slice(LOG_HEADER_EXAMPLE.length);
        }
        return frameStr;
    }
    else 
    {
        let frameStr = "";
        const elements = document.getElementsByClassName(classPkgGroup);
        for (const el of elements) {
            if(el.classList.contains('pkg-right-part'))
                continue;
            frameStr += el.textContent;
        }
        return frameStr;
    }
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