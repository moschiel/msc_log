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
        .hl-term { background: #ffc38a; }
        .hl-package { font-weight: bold; background: #8affb7;}
    </style>
</head>
<body>
    <div class="top">
        <b>Arquivo:</b> <span class="file"><?= htmlspecialchars($title) ?></span>

        <label>
            <input type="checkbox" id="autoRefresh">
            Auto-refresh (3s)
        </label>

        <label>
            <input type="checkbox" id="autoScroll" checked>
            Auto-scroll
        </label>

        <label>
            <input type="checkbox" id="analyzePackage">
            Analyze-Packages
        </label>

        <button onclick="refreshNow()">Atualizar agora</button>

        <a href="<?= htmlspecialchars($downloadUrl) ?>">
            <button>Download</button>
        </a>

        <button type="button" id="toggleFilters">Mostrar filtros</button>

    </div>

    <div id="filtersPanel" class="hl-panel hl-hidden">
    <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
        <b>Marcadores:</b>

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


    <div id="logBox" class="box"></div>

<script src="./app/js/utils.js"></script>
<script src="./app/js/viewer-terms-highlight.js"></script>
<script src="./app/js/viewer-package-analyzer.js"></script>
<script src="./app/js/viewer-render-log.js"></script>
<script src="./app/js/viewer-auto-refresh.js"></script>
<script>
    // executa no inicio
    loadSettings();
    refreshNow();
</script>
</body>
</html>
<?php
}
