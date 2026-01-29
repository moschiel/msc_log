let refreshTimer = null;
let lastFileSize = 0;

function clearAllLogData() {
  lastFileSize = 0;
  clearHighlightedPkgCounters();
  clearRawLog();
  clearLogBox();
}

function ajaxUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ajax", "1");
    url.searchParams.set("file_offset", lastFileSize); // Nao pede o arquivo inteiro, apenas conteudo adicional se houver
    url.searchParams.delete("view");
    url.searchParams.delete("download");
    return url.toString();
}


async function tailRefreshNow() {
  try {
    const resp = await fetch(ajaxUrl(), { cache: "no-store" });

    const fileSizeHeader = resp.headers.get("X-File-Size");
    const fileSize = fileSizeHeader ? Number(fileSizeHeader) : null;

    if (fileSize !== null && fileSize < lastFileSize) {
      // Ué, o arquivo diminuiu? 
      // alguem deve ter editado o conteudo do arquivo manualmente, 
      // nesse caso relemos o conteudo do arquivo do inicio      // arquivo "voltou"/diminuiu: reset geral
      ui.btnTailAutoRefresh.disable = true;
      if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) stopTailAutoRefresh();
      clearAllLogData();
      tailRefreshNow();
      if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) startTailAutoRefresh();
      ui.btnTailAutoRefresh.disable = false;
      return;
    }

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    if (fileSize !== null) {
      if (lastFileSize === 0) {
        // lendo arquivo do inicio, limpa tudo
        clearAllLogData();
      }
      lastFileSize = fileSize;
    }

    const deltaText = await resp.text();
    if (deltaText.length === 0) return;

    // Atualiza raw log
    setRawLog(getRawLog() + deltaText);

    if (util.isToogleButtonPressed(ui.btnHighlightPkg)) {
      // Junta pendingText + deltaText e separa parte segura vs resto
      let { safeText, pendingText } = tailSplitWithPendingCC33(getLogBoxPendingPacket(), deltaText);
      
      // texto seguro para ser analisado os pacotes
      if (safeText && safeText.length > 0) {
        let innerHTML = util.escapeHtml(safeText);
        innerHTML = fastHighlightPackages(innerHTML);
        writeLogBox("append", "html", innerHTML);
      }

      //texto com pacote CC33 incompleto no final (pendente de ser completado)
      //nesse caso nao parseamos o pacote se nao chegou tudo
      //vai deixar de ser 'pendente' quando chegar um chunk com o fim do pacote
      setLogBoxPendingPacket(pendingText ? pendingText : "");
    } 
    else 
    {
      writeLogBox("append", "text", deltaText);
    }
  } catch (e) {
    setRawLog("Erro ao carregar arquivo: " + e);
    writeLogBox("set", "text", "Erro ao carregar arquivo: " + e);
    setLogBoxPendingPacket("");
  }
}


function startTailAutoRefresh() {
    stopTailAutoRefresh();
    refreshTimer = setInterval(()=> {
        if(util.isToogleButtonPressed(ui.btnTailAutoRefresh)) {
            tailRefreshNow();
        }
    }, 3000);
}

function stopTailAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
}

function setTailAutoRefresh() {
    if (util.isToogleButtonPressed(ui.btnTailAutoRefresh)) 
        startTailAutoRefresh();
    else 
        stopTailAutoRefresh();
}

/**
 * Divide um chunk em:
 *  - before: texto seguro (não termina em pacote/linha parcial)
 *  - rest: pedaço final que deve ser guardado (pacote CC33 incompleto e/ou linha parcial)
 *
 * Regras:
 * - Pacote começa numa linha cujo payload (após header) começa com "CC33".
 * - Continuação de pacote: payload é somente hex (util.isHexOnly) ou prefixo hex (corte no meio).
 * - Se o chunk termina com header parcial (len < headerLen) ou só header (len == headerLen),
 *   essa última "linha" SEMPRE vai para o rest (pra não perder o começo do header).
 * - Se o chunk termina em linha com payload:
 *   - se a última linha é hex-only ou hex-prefix, tenta subir e achar um CC33.
 *   - se achar, rest começa no CC33; senão, rest = "".
 *
 * @param {string} textChunk
 * @param {number} headerLen
 * @returns {{ before: string, rest: string }}
 */
function splitTailIfEndsWithIncompleteCC33(textChunk) {
  if (!textChunk) return { before: "", rest: "" };
  const headerLen = LOG_HEADER_EXAMPLE.length;

  const lines = textChunk.split(/\r?\n/);

  const getPayload = (line) => (line.length > headerLen ? line.slice(headerLen) : "");
  const isHexPrefixNonEmpty = (s) => s.length > 0 && /^[0-9a-fA-F]+$/.test(s);
  const isHexOnlyNonEmpty = (s) => s.length > 0 && util.isHexOnly(s);

  const isFrameishLine = (line) => {
    const p = getPayload(line);
    // hex-only (linha “completa”) ou hex-prefix (corte no meio)
    return isHexOnlyNonEmpty(p) || isHexPrefixNonEmpty(p);
  };

  //header example: "[20251104-100340][0314593089][DBG][NET ]: "
  const startsWithHeader = (line) => {
    if(line.length > 0 && line[0] !== '[') return false;
    /* se quiser verificar o resto, só descomentar
    if(line.length > 16 && line[16] !== ']') return false;
    if(line.length > 17 && line[17] !== '[') return false;
    if(line.length > 28 && line[28] !== ']') return false;
    if(line.length > 29 && line[29] !== '[') return false;
    if(line.length > 33 && line[33] !== ']') return false;
    if(line.length > 34 && line[34] !== '[') return false;
    if(line.length > 39 && line[39] !== ']') return false;
    if(line.length > 40 && line[40] !== ':') return false;
    if(line.length > 41 && line[41] !== ' ') return false;*/
    return true;
  }

  const startsWithCC33 = (line) => {
    const p = getPayload(line);
    return p.length >= 4 && p.slice(0, 4).toUpperCase() === "CC33";
  };

  const lastIdx = lines.length - 1;
  const lastLine = lines[lastIdx];

  // Caso A) terminou no meio do header OU exatamente no header => guardar última linha no rest
  if (lastLine.length <= headerLen && startsWithHeader(lastLine)) {
    if (lastIdx === 0) {
      return { before: "", rest: lastLine };
    }

    // Se antes dessa linha parcial existe um pacote CC33 "em andamento", rest deve incluir desde o CC33
    let startIdx = -1;
    for (let i = lastIdx - 1; i >= 0; i--) {
      if (!isFrameishLine(lines[i])) break;
      if (startsWithCC33(lines[i])) { startIdx = i; break; }
    }

    if (startIdx !== -1) {
      return {
        before: lines.slice(0, startIdx).join("\n"),
        rest: lines.slice(startIdx).join("\n") // inclui a linha parcial do header
      };
    }

    // Não dá pra afirmar que é CC33, mas a última linha é parcial e precisa ser guardada
    return {
      before: lines.slice(0, lastIdx).join("\n"),
      rest: lastLine
    };
  }

  // Caso B) última linha tem payload (len > headerLen)
  if (!isFrameishLine(lastLine)) {
    return { before: textChunk, rest: "" };
  }

  // Se a última linha já começa com CC33 => resto só a partir dela
  if (startsWithCC33(lastLine)) {
    return {
      before: lines.slice(0, lastIdx).join("\n"),
      rest: lastLine
    };
  }

  // Senão, sobe procurando CC33, mas só enquanto as linhas forem "frameish"
  let startIdx = -1;
  for (let i = lastIdx; i >= 0; i--) {
    if (!isFrameishLine(lines[i])) break;
    if (startsWithCC33(lines[i])) { startIdx = i; break; }
  }

  if (startIdx === -1) {
    return { before: textChunk, rest: "" };
  }

  return {
    before: lines.slice(0, startIdx).join("\n"),
    rest: lines.slice(startIdx).join("\n")
  };
}

/**
 * Wrapper recomendado pro tail: concatena pendência + chunk e separa de novo.
 * NÃO adiciona '\n' automaticamente (tail pode cortar no meio de uma linha).
 */
function tailSplitWithPendingCC33(pendingText, chunk) {
  const combined = (pendingText || "") + (chunk || "");
  const { before, rest } = splitTailIfEndsWithIncompleteCC33(combined);
  return { safeText: before || "", pendingText: rest || "" };
}
