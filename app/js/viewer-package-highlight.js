import { util } from "./utils.js";
import { tailSplitWithPendingCC33, LOG_HEADER_EXAMPLE, detectCC33Packages, LOG_HEADER_SIZE
} from "./viewer-package-parser.js";
import { getLogBoxPendingPacket, writeLogBox, setLogBoxPendingPacket 
} from "./viewer-render-log.js";

const PKG_HIGHLIGHT_VERSION = "V1";


/** 
* Aplica estilos nas linhas do log que são compostas de pacotes CC33
 
* seta direto no vetor lines de acordo com os indexes passados
* 
* @param {number} hlPkgCounter numero do pacote para criar a classe CSS de grupo do pacote (ex: pkg-1, pkg-2, etc)
* @param {boolean} parseOk se o parse do pacote foi bem sucedido ou nao (pacote com erro de formato, etc)
* @param {boolean} isReceived indica se o pacote foi recebido pelo equipamento ao invez de enviado.
* @param {"Online" | "Offline" | null} connState estado da conexao no momento do pacote (Online, Offline, etc)
* @param {Array<string>} lines array de linhas do log,
* @param {Array<number>} lineIndexes indexes das linhas onde está presente os frames hexadecimais do pacote (ex: se o pacote tem 3 linhas, e os frames hexadecimais estão nas linhas 10, 11 e 12 do log, entao lineIndexes = [10, 11, 12])
*/
export function highlightPackage(hlPkgCounter, parseOk, isReceived, connState, lines, lineIndexes) {
    let classPkgStatus = "";

    if (parseOk) {
        if(isReceived)
            classPkgStatus = "hl-pkg-received";
        else
            classPkgStatus = connState === "Online" ? "hl-pkg-online" : "hl-pkg-offline";
    } else {
        classPkgStatus = "hl-pkg-err";
    }

    // 'classPkgGroup' sera incluida em todas linhas (tags span) que pertencam a um mesmo pacote
    // assim em outros modulos, via className podemos recuperar todo os elementos "span" de um pacote especifico
    const classPkgGroup = `pkg-${hlPkgCounter}`;
    const headerLen = LOG_HEADER_SIZE;
    const total = lineIndexes.length;

    // @ts-ignore
    if (PKG_HIGHLIGHT_VERSION === "V2") {
        // Versao 2 gera apenas uma tag <span> POR PACOTE, tendo menos elementos DOM para o browser gerenciar, deixando a pagina mais leve.
        // O estilo fica porco, não da pra aplicar bordas, e o header de cada linha tambem fica com background colorido
        const firstIdx = lineIndexes[0];
        const lastIdx = lineIndexes[total - 1];
        if (total === 1) {
            //se tem só uma linha, abre e fecha o span nessa linha
            lines[firstIdx] = `<span class="${classPkgGroup} ${classPkgStatus}">${lines[firstIdx]}</span>`;
        } else if (total > 1) {
            // abre span na primeira linha
            lines[firstIdx] = `<span class="${classPkgGroup} ${classPkgStatus}">${lines[firstIdx]}`;
            // fecha na ultima
            lines[lastIdx] += "</span>";
        }
    }
    else if (PKG_HIGHLIGHT_VERSION === "V1") {
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


/**
 * Recupera o frame hexadecimal completo de um pacote CC33 que está no LogBox, 
 * a partir do nome da classe do grupo do pacote.
 * @param {string} classPkgGroup 
 * @returns 
 */
export function getHexFromPackageClassGroup(classPkgGroup) {
    // @ts-ignore
    if (PKG_HIGHLIGHT_VERSION === "V2") {
        let frameStr = "";
        const elements = document.getElementsByClassName(classPkgGroup);
        const lines = elements[0].textContent.split("\n");
        for (const line of lines) {
            frameStr += line.slice(LOG_HEADER_SIZE);
        }
        return frameStr;
    }
    else //V1 
    {
        let frameStr = "";
        const elements = document.getElementsByClassName(classPkgGroup);
        for (const el of elements) {
            if (el.classList.contains('pkg-right-part'))
                continue;
            frameStr += el.textContent;
        }
        return frameStr;
    }
}
