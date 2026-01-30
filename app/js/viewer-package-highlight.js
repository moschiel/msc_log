const PKG_HIGHLIGHT_VERSION = "V1";


// Aplica estilos aos pacotes com CC33 
// (sem operacao de replace() no texto inteiro pois ia ser lento demais, 
// seta direto no vetor lines de acordo com os indexes passados)
function highlightPackage(pkgCounter, parseOk, connState, lines, lineIndexes) {
    let classPkgStatus = "";
    
    if(parseOk) {
        classPkgStatus = "hl-pkg-ok";
        if(connState === "Offline") {
            classPkgStatus += " hl-pkg-offline";
        }
    } else {
        classPkgStatus = "hl-pkg-err";
    }
    
    // 'classPkgGroup' sera incluida em todas linhas (tags span) que pertencam a um mesmo pacote
    // assim em outros modulos, via className podemos recuperar todo os elementos "span" de um pacote especifico
    const classPkgGroup = `pkg-${pkgCounter}`;
    const headerLen = LOG_HEADER_EXAMPLE.length; 
    const total = lineIndexes.length;
    
    if (PKG_HIGHLIGHT_VERSION === "V2") 
    {
        // Versao 2 gera apenas uma tag <span> POR PACOTE, tendo menos elementos DOM para o browser gerenciar, deixando a pagina mais leve.
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
    else if (PKG_HIGHLIGHT_VERSION === "V1")
    {            
        // Versao 1 gera uma tag <span> PARA CADA LINHA DO PACOTE, o que pode deixar o browser lento devido a muitos elementos no DOM.
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
}

function getHexFromPackageClassGroup(classPkgGroup) {
    if(PKG_HIGHLIGHT_VERSION === "V2") 
    {
        let frameStr = "";
        const elements = document.getElementsByClassName(classPkgGroup);
        const lines = elements[0].textContent.split("\n");
        for (const line of lines) {
            frameStr += line.slice(LOG_HEADER_EXAMPLE.length);
        }
        return frameStr;
    }
    else //V1 
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
