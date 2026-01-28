let refreshTimer = null;
let lastFileSize = 0;
let tailPending = "";

function clearTailLogData() {
  lastFileSize = 0;
  tailPending = "";
  pkgCounter = 0;
  offlinePkgCounter = 0;
  errPkgCounter = 0;
  setRawLog("");
  writeLogBox("set", "html", "Carregando...");
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
      if (util.isOnOffButtonPressed(ui.btnTailAutoRefresh)) stopTailAutoRefresh();
      clearTailLogData();
      tailRefreshNow();
      if (util.isOnOffButtonPressed(ui.btnTailAutoRefresh)) startTailAutoRefresh();
      ui.btnTailAutoRefresh.disable = false;
      return;
    }

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    if (fileSize !== null) {
      if (lastFileSize === 0) {
        // lendo arquivo do inicio, limpa qualquer coisa no logbox
        clearTailLogData();
      }
      lastFileSize = fileSize;
    }

    const deltaText = await resp.text();
    if (deltaText.length === 0) return;

    // Atualiza raw log
    setRawLog(getRawLog() + deltaText);

    if (util.isOnOffButtonPressed(ui.btnHighlightPkg)) {
      // Junta pending + delta e separa parte segura vs resto
      const { safeText, pending } = tailSplitWithPendingCC33(tailPending, deltaText, LOG_HEADER_EXAMPLE.length);
      tailPending = pending;
  
      // Se não tem nada seguro, não renderiza nada (espera o próximo chunk completar)
      if (!safeText || safeText.length === 0) {
        return;
      }
      let innerHTML = util.escapeHtml(safeText);
      innerHTML = fastHighlightPackages(innerHTML);
      writeLogBox("append", "html", innerHTML);
    } else {
      writeLogBox("append", "text", deltaText);
    }

    scrollLogBoxToBottomIfNeeded();
  } catch (e) {
    setRawLog("Erro ao carregar arquivo: " + e);
    writeLogBox("set", "text", "Erro ao carregar arquivo: " + e);
  }
}


function startTailAutoRefresh() {
    stopTailAutoRefresh();
    refreshTimer = setInterval(()=> {
        if(util.isOnOffButtonPressed(ui.btnTailAutoRefresh)) {
            tailRefreshNow();
        }
    }, 3000);
}

function stopTailAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
}

function setTailAutoRefresh() {
    if (util.isOnOffButtonPressed(ui.btnTailAutoRefresh)) 
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
function splitTailIfEndsWithIncompleteCC33(textChunk, headerLen) {
  if (!textChunk) return { before: "", rest: "" };

  const lines = textChunk.split(/\r?\n/);

  const getPayload = (line) => (line.length > headerLen ? line.slice(headerLen) : "");
  const isHexPrefixNonEmpty = (s) => s.length > 0 && /^[0-9a-fA-F]+$/.test(s);
  const isHexOnlyNonEmpty = (s) => s.length > 0 && util.isHexOnly(s);

  const isFrameishLine = (line) => {
    const p = getPayload(line);
    // hex-only (linha “completa”) ou hex-prefix (corte no meio)
    return isHexOnlyNonEmpty(p) || isHexPrefixNonEmpty(p);
  };

  const startsWithCC33 = (line) => {
    const p = getPayload(line);
    return p.length >= 4 && p.slice(0, 4).toUpperCase() === "CC33";
  };

  const lastIdx = lines.length - 1;
  const lastLine = lines[lastIdx];

  // Caso A) terminou no meio do header OU exatamente no header => guardar última linha no rest
  if (lastLine.length <= headerLen) {
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
function tailSplitWithPendingCC33(pending, chunk, headerLen) {
  const combined = (pending || "") + (chunk || "");
  const { before, rest } = splitTailIfEndsWithIncompleteCC33(combined, headerLen);
  return { safeText: before || "", pending: rest || "" };
}
