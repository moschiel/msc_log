<?php
// app/views/viewer.php

function render_viewer($selectedFile) {
    global $ROOT_DIR;

    $title = ($selectedFile !== '') ? $selectedFile : '(nenhum arquivo)';
    $downloadUrl = './index.php?download=1&file=' . urlencode($selectedFile);
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Viewer - <?= htmlspecialchars($title) ?></title>
    <style>
        body { font-family: Arial, sans-serif; margin: 16px; }
        .top { display:flex; gap:16px; align-items:center; flex-wrap: wrap; }
        .file { font-family: Consolas, monospace; }
        .box {
            margin-top: 12px;
            height: 80vh;
            overflow: auto;
            white-space: pre;
            font-family: Consolas, monospace;
            font-size: 12px;
            border: 1px solid #ddd;
            padding: 10px;
            background: #fafafa;
        }
        .hl-panel { border:1px solid #ddd; padding:10px; margin-top:10px; background:#f9f9f9; }
        .hl-hidden { display:none; }
        .hl-box { width:100%; height:90px; font-family: Consolas, monospace; font-size: 12px; }
        .logBox { white-space: pre; font-family: Consolas, monospace; font-size: 12px; }
        .hl-mark { background: #ffc38a; }
        .hl-package { font-weight: bold; background: #8affb7;}
    </style>
</head>
<body>
    <div class="top">
        <b>Arquivo:</b> <span class="file"><?= htmlspecialchars($title) ?></span>

        <label>
            <input type="checkbox" id="autoRefresh" checked>
            Auto-refresh (3s)
        </label>

        <label>
            <input type="checkbox" id="autoScroll" checked>
            Auto-scroll
        </label>

        <button onclick="refreshNow()">Atualizar agora</button>

        <a href="<?= htmlspecialchars($downloadUrl) ?>">
            <button>Download</button>
        </a>

        <button type="button" id="toggleFilters">Mostrar filtros</button>

    </div>

    <div id="filtersPanel" class="hl-panel hl-hidden">
    <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
        <b>Highlight:</b>

        <label>
        <input type="checkbox" id="hlMatchCase" checked>
        Match Case
        </label>

        <span style="color:#666; font-size:12px;">
        (1 string por linha)
        </span>
    </div>

    <textarea id="hlTerms" class="hl-box" placeholder="Ex:\nERROR\nWARN\nSPN 123\nFMI 5"></textarea>
    </div>


    <div id="box" class="box"></div>

<script>
const box = document.getElementById("box");
const cbTail = document.getElementById("autoScroll");
const cbAuto = document.getElementById("autoRefresh");
let timer = null;

function scrollToBottomIfNeeded() {
    if (!cbTail.checked) return;
    box.scrollTop = box.scrollHeight;
}

function ajaxUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ajax", "1");
    url.searchParams.delete("view");
    url.searchParams.delete("download");
    return url.toString();
}

async function refreshNow() {
    try {
        const resp = await fetch(ajaxUrl(), { cache: "no-store" });
        const text = await resp.text();
        rawText = text;
        renderText();
        if (typeof scrollToBottomIfNeeded === "function") scrollToBottomIfNeeded();
    } catch (e) {
        rawText = "Erro ao carregar arquivo: " + e;
        box.textContent = rawText;
    }
}

function startAuto() {
    stopAuto();
    timer = setInterval(refreshNow, 3000);
}

function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
}

cbAuto.addEventListener("change", () => {
    if (cbAuto.checked) startAuto();
    else stopAuto();
});


// Funcoes para Highlight de strings
// --- Elementos UI do highlight ---
const btnToggle = document.getElementById("toggleFilters");
const panel = document.getElementById("filtersPanel");
const taTerms = document.getElementById("hlTerms");
const cbMatchCase = document.getElementById("hlMatchCase");

// Você provavelmente já tem "box" (div do conteúdo)
// Exemplo: const box = document.getElementById("box");

// Guardamos o texto "cru" aqui, e renderizamos com highlight em cima.
let rawText = "";

// Chave por arquivo (cada arquivo mantém sua lista)
const fileParam = new URL(window.location.href).searchParams.get("file") || "";
const LS_KEY = "hl_terms::" + fileParam;
const LS_CASE = "hl_case::" + fileParam;
const LS_PANEL = "hl_panel_open::" + fileParam;

function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTerms() {
    const lines = taTerms.value.split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // remove duplicados simples
    return Array.from(new Set(lines));
}

function isHexOnly(str) {
    return /^[0-9a-fA-F]+$/.test(str);
}

function renderText() {
    // Se não tem termo, só mostra texto como "pre"
    const terms = getTerms();
    if (terms.length === 0) {
        box.textContent = rawText;
        return;
    }

    // Escapa HTML primeiro
    let html = escapeHtml(rawText);
    
    // Aplica highlight dos marcardores (simples e funciona bem pra logs)
    const flags = cbMatchCase.checked ? "g" : "gi";
    for (const t of terms) {
        const re = new RegExp(escapeRegex(t), flags);
        html = html.replace(re, (x) => `<span class="hl-mark">${x}</span>`);
    }

    // Aplica highlight dos pacotes com CC33
    if(false) {
        let collectingFrame = false;
        let frameStr = "";
        const lines = html.split(/\r?\n/);
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
                    html = html.replace(re, (x) => `<span class="hl-package">${x}</span>`);
                } else {
                    if (frameStr.length > 0) {
                        console.log("Frame: ", frameStr);
                    }
                    frameStr = ""
                    collectingFrame = false;
                }
            }
        });
    }

    box.innerHTML = html;
}

function saveSettings() {
    localStorage.setItem(LS_KEY, taTerms.value);
    localStorage.setItem(LS_CASE, cbMatchCase.checked ? "1" : "0");
    localStorage.setItem(LS_PANEL, panel.classList.contains("hl-hidden") ? "0" : "1");
}

function loadSettings() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved !== null) taTerms.value = saved;

    const savedCase = localStorage.getItem(LS_CASE);
    if (savedCase !== null) cbMatchCase.checked = (savedCase === "1");

    const savedPanel = localStorage.getItem(LS_PANEL);
    if (savedPanel === "1") {
        panel.classList.remove("hl-hidden");
        btnToggle.textContent = "Esconder marcadores";
    }
}

function togglePanel() {
    panel.classList.toggle("hl-hidden");
    const open = !panel.classList.contains("hl-hidden");
    btnToggle.textContent = open ? "Esconder marcadores" : "Mostrar marcadores";
    saveSettings();
}

// Eventos
btnToggle.addEventListener("click", () => togglePanel());

// Reaplica highlight quando usuário muda termos/config
let debounce = null;
function scheduleRerender() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
        saveSettings();
        renderText();
        // se você tem auto-scroll ligado, mantém no fim (seu código já faz isso, mas não atrapalha)
        if (typeof scrollToBottomIfNeeded === "function") scrollToBottomIfNeeded();
    }, 150);
}

taTerms.addEventListener("input", scheduleRerender);
cbMatchCase.addEventListener("change", scheduleRerender);

// inicial
loadSettings();
refreshNow();
startAuto();
</script>
</body>
</html>
<?php
}
