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
            <input type="checkbox" id="followTail" checked>
            Follow tail
        </label>

        <button onclick="refreshNow()">Atualizar agora</button>

        <a href="<?= htmlspecialchars($downloadUrl) ?>">
            <button>Download</button>
        </a>
    </div>

    <div id="box" class="box"></div>

<script>
const box = document.getElementById("box");
const cbTail = document.getElementById("followTail");
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
        box.textContent = text;
        scrollToBottomIfNeeded();
    } catch (e) {
        box.textContent = "Erro ao carregar arquivo: " + e;
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

// inicial
refreshNow();
startAuto();
</script>
</body>
</html>
<?php
}
