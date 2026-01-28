const PKG_HIGHLIGHT_VERSION = "V2";
const LOG_HEADER_EXAMPLE = "[20251104-100340][0314593097][DBG][MEM ]: ";
let globalFrames = [];

// Aplica estilos aos pacotes com CC33 (lento pois usa replace() em cada linha)
/*
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

            if (!isCollectingFrame && substrFrame.startsWith("CC33") && util.isHexOnly(substrFrame)) {
                //Encontrou inicio do frame, inicia a coleta das linhas seguintes
                isCollectingFrame = true;
                frameStr = "";
                linesToReplace = [];
            } else if (isCollectingFrame && util.isHexOnly(substrFrame) === false) {
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
                        if(parseCC33Frame(util.hexToBuffer(frameStr), false)) 
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
*/

// Aplica estilos aos pacotes com CC33 (versão rápida: sem operacao de replace(), seta direto no vetor lines)
function fastHighlightPackages(text) {
    const lines = text.split(/\r?\n/);
    const headerLen = LOG_HEADER_EXAMPLE.length;

    let isCollectingFrame = false;
    let lineIndexes = [];         // guarda os índices das linhas que pertencem ao pacote
    let pkgCounter = 0;
    let offlinePkgCounter = 0;
    let errPkgCounter = 0;

    function flushPackage() {
        if (lineIndexes.length === 0) return;

        pkgCounter++;
        let classPkgStatus = "";
        const total = lineIndexes.length;
        
        try {
            let frameStr = "";
            for (let i = 0; i < total; i++) {
                frameStr += lines[lineIndexes[i]].slice(headerLen);
            }

            const {parseOk, connState, messages} = parseCC33Frame(util.hexToBuffer(frameStr), "validate");
            if(ui.cbIgnoreAck.checked && messages !== null) {
                for (const msg of messages) {
                    if(msg.id === 0xFFFF || msg.id === 0x0000) { //ACK ou KeepAlive
                        lineIndexes = []; // reset linhas
                        pkgCounter--; // remove esse pacote da contagem
                        return; // pula pacote
                    }
                }
            }

            if(parseOk) {
                classPkgStatus = "hl-pkg-ok";
                if(connState === "Offline") {
                    classPkgStatus += " hl-pkg-offline";
                    offlinePkgCounter++;
                }
            } else {
                classPkgStatus = "hl-pkg-err";
            }

        } catch (e) {
            console.error(e.message, ", na linha: ", lines[lineIndexes[0]].slice(0, headerLen));
            classPkgStatus = "hl-pkg-err";
            errPkgCounter++;
        }
        
        // classPkgGroup sera incluida em todas linhas (tags span) que pertencam a um mesmo pacote
        // assim em outros modulos, via className podemos recuperar todo os elementos "span" de um pacote especifico
        const classPkgGroup = `pkg-${pkgCounter}`;

        if (PKG_HIGHLIGHT_VERSION === "V3") 
        {
            // Versao 3 gera apenas uma tag <span> POR PACOTE, tendo menos elementos DOM para o browser gerenciar, deixando a pagina mais leve.
            // O estilo fica porco, não da pra aplicar bordas, e o header de cada linha tambem fica com background colorido
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
        }
        else if (PKG_HIGHLIGHT_VERSION === "V2")
        {            
            // Versao 2 gera uma tag <span> PARA CADA LINHA DO PACOTE, o que pode deixar o browser lento devido a muitos elementos no DOM.
            // Mas pelo menos o estilo fica bem mais bonitinho, onde só o frame é destacado com borda, deixando o header de fora.
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
    
                // regra especial da penúltima linha
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
        } 

        // reset
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
            if (substrFrame.startsWith("CC33") && util.isHexOnly(substrFrame)) {
                //Encontrou inicio do frame, inicia a coleta das linhas seguintes
                isCollectingFrame = true;
                lineIndexes = [];
            }
        } else {
            // está coletando: se não for hex, termina pacote
            if (!util.isHexOnly(substrFrame)) {
                // Terminou de coletar linhas desse pacote
                isCollectingFrame = false;
                flushPackage();
                continue;
            }
        }

        if (isCollectingFrame) {
            lineIndexes.push(lineNumber); // Coleta mais uma linha do pacote atual
        }
    }

    // se o arquivo acabou no meio de um pacote, fecha ele também
    if (isCollectingFrame) {
        flushPackage();
    }

    //console.log(`Total Pacotes: ${pkgCounter}, com erro: ${errPkgCounter}`);
    //alert(`Quantidade Total de Pacotes: ${pkgCounter}\r\nPacotes Offline: ${offlinePkgCounter}\r\nPacotes com erro: ${errPkgCounter}`);
    return lines.join("\n");
}


function getHexFromPackageClassGroup(classPkgGroup) {
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