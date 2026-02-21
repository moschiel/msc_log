import { util } from "./utils.js";
import { LOG_HEADER_SIZE } from "./viewer-package-parser.js";
import { getLogHtmlTextWrapper, getSafeHtmlText, virtualLog } from "./viewer-render-log.js";
import { ui } from "./viewer-ui-elements.js";

const PKG_HIGHLIGHT_VERSION = "V1";


/** 
* Aplica estilos nas linhas do log que são compostas de pacotes
 
* seta direto no vetor lines de acordo com os indexes passados
* 
* @param {number} pkgIndex index do pacote para criar a classe CSS de grupo do pacote (ex: pkg-1, pkg-2, etc)
* @param {boolean} parseOk se o parse do pacote foi bem sucedido ou nao (pacote com erro de formato, etc)
* @param {boolean} isIncommingPkg indica se o pacote foi recebido pelo equipamento ao invez de enviado.
* @param {"Online" | "Offline" | null} connState estado da conexao no momento do pacote (Online, Offline, etc)
* @param {Array<string>} lines array de linhas do log,
* @param {Array<number>} lineIndexes indexes das linhas onde está presente os frames hexadecimais do pacote (ex: se o pacote tem 3 linhas, e os frames hexadecimais estão nas linhas 10, 11 e 12 do log, entao lineIndexes = [10, 11, 12])
*/
export function highlightPackage(pkgIndex, parseOk, isIncommingPkg, connState, lines, lineIndexes) {
    let classPkgStatus = "";

    if (parseOk) {
        if (isIncommingPkg)
            classPkgStatus = "hl-pkg-incomming";
        else
            classPkgStatus = connState === "Online" ? "hl-pkg-online" : "hl-pkg-offline";
    } else {
        classPkgStatus = "hl-pkg-err";
    }

    // 'pkgClassName' sera incluida em todas linhas (tags span) que pertencam a um mesmo pacote
    // assim em outros modulos, via className podemos recuperar todo os elementos "span" de um pacote especifico
    const pkgClassName = `pkg-${pkgIndex}`;
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
            lines[firstIdx] = `<span class="${pkgClassName} ${classPkgStatus}">${lines[firstIdx]}</span>`;
        } else if (total > 1) {
            // abre span na primeira linha
            lines[firstIdx] = `<span class="${pkgClassName} ${classPkgStatus}">${lines[firstIdx]}`;
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

            const headerPart = oldLine.slice(0, headerLen);
            const hexPart = oldLine.slice(headerLen);

            let newLine = "";

            // verifica se é penúltima linha
            if (
                total >= 2 && // Se o pacote tem mais de duas linhas no log
                i === (total - 2) && // Se essa é a penultima linha
                (lines[lineIndexes[total - 1]].length < lines[lineIndexes[total - 2]].length) // E a ultima linha é menor que a penultima linha
            ) {
                // é penultima linha,
                // entao temos que aplicar borda embaixo dessa linha tambem, 
                // mas só na parte direita do frame que nao tenha caracteres de outro frame abaixo dele

                const lastLine = lines[lineIndexes[total - 1]];
                const penultLine = lines[lineIndexes[total - 2]];

                const diffSize = penultLine.length - lastLine.length;

                const startHexPart = hexPart.slice(0, hexPart.length - diffSize);
                const endHexPart = hexPart.slice(hexPart.length - diffSize);

                const spanEndHexPart =
                    `<span class="${pkgClassName} pkg-right-part hl-border-bottom hl-border-right">${endHexPart}</span>`;

                newLine =
                    `${headerPart}<span class="${pkgClassName} ${classPkgStatus} hl-border-left ${i === 0 ? 'hl-border-top' : ''}">` +
                    `${startHexPart}${spanEndHexPart}</span>`;
            } else {
                let classBorder = "hl-border-sides"; // adiciona borda nas laterais
                if (i === 0) classBorder += " hl-border-top"; // primeira linha do pacote tem borda no topo
                if (i === total - 1) classBorder += " hl-border-bottom"; //ultima linha do pacote tempo borda embaixo

                newLine =
                    `${headerPart}<span class="${pkgClassName} ${classPkgStatus} ${classBorder}">${hexPart}</span>`;
            }

            lines[idx] = newLine; // ✅ troca direto no array (O(1))
        }
    }
}

export function highlightPkgCreation(line, ticket) {
    const headerPart = line.slice(0, LOG_HEADER_SIZE);
    const contentPart = line.slice(LOG_HEADER_SIZE);
    return `${headerPart}<span class="ticket-${ticket}">${contentPart}</span>`;
}


/**
 * Recupera o frame hexadecimal completo de um pacote que está destacado no LogBox, 
 * a partir do nome da classe do grupo do pacote.
 * @param {string} pkgClassName 
 * @returns 
 */
export function getHexFromHighlightPackageClass(pkgClassName) {
    // @ts-ignore
    if (PKG_HIGHLIGHT_VERSION === "V2") {
        let frameStr = "";
        const elements = document.getElementsByClassName(pkgClassName);
        const lines = elements[0].textContent.split("\n");
        for (const line of lines) {
            frameStr += line.slice(LOG_HEADER_SIZE);
        }
        return frameStr;
    }
    else //V1 
    {
        let frameStr = "";
        const elements = document.getElementsByClassName(pkgClassName);
        for (const el of elements) {
            if (el.classList.contains('pkg-right-part'))
                continue;
            frameStr += el.textContent;
        }
        return frameStr;
    }
}

/**
 * Scrolla para um elemento destacado no log, de acordo com sua classe.
 * O elemento tambem terá seu estilo alterado (bordas amareladas).
 * 
 * @param {"pkg" | "ticket"} scrollTo
 * @param {number} pkgIndex
 * @param {number} pkgTicket
 * @returns 
 */
export function scrollToHighlightedElement(scrollTo, pkgIndex, pkgTicket) {
    //if (!ui.logBox) return;

    const pkgSelector = `pkg-${pkgIndex}`;
    const ticketSelector = `ticket-${pkgTicket}`;

    const lines = util.splitLines(getLogHtmlTextWrapper());
    if(!lines.length) return;

    const pkgLineIndex = lines.findIndex(line => line.includes(pkgSelector));
    const ticketLineIndex = lines.findIndex(line => line.includes(ticketSelector));

    if(scrollTo === "pkg" && pkgLineIndex)
        virtualLog.scrollToLine(pkgLineIndex, { center: true });
    else if(scrollTo === "ticket" && ticketLineIndex)
        virtualLog.scrollToLine(ticketLineIndex, { center: true });

    return;

    

    // Remove highlight anterior (opcional)
    ui.logBox.querySelectorAll(`.hl-pkg-selected`).forEach(el => el.classList.remove("hl-pkg-selected"));
    ui.logBox.querySelectorAll(`.hl-ticket-selected`).forEach(el => el.classList.remove("hl-ticket-selected"));

    // Pega todos
    const allPkgs = ui.logBox.querySelectorAll(`.${pkgSelector}`);
    const allTickets = ui.logBox.querySelectorAll(`.${ticketSelector}`);

    // Adiciona highlight em todos
    allPkgs.forEach(el => el.classList.add("hl-pkg-selected"));
    allTickets.forEach(el => el.classList.add("hl-ticket-selected"));

    if (scrollTo === "pkg" && !allPkgs.length) return;
    else if (scrollTo === "ticket" && !allTickets.length) return;

    // Scrolla até o primeiro elemento encontrado
    const first = scrollTo === "pkg" ? allPkgs[0] : allTickets[0];
    const elRect = first.getBoundingClientRect();
    const boxRect = ui.logBox.getBoundingClientRect();
    // posição relativa ao container
    const offset = elRect.top - boxRect.top + ui.logBox.scrollTop;

    ui.logBox.scrollTo({
        //top: offset, // no topo tela
        top: offset - ui.logBox.clientHeight / 2, // no centro da tela
        behavior: "smooth"
    });
}
