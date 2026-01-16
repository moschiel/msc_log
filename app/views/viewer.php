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
    <link rel="stylesheet" href="./app/css/viewer.css">
    <link rel="stylesheet" href="./app/css/table.css">
</head>
<body>
    <div class="main">
        <div class="top-container">
            <b>Arquivo:</b> <span class="file"><?= htmlspecialchars($title) ?></span>

            <label>
                <input type="checkbox" id="autoRefresh">
                Auto-refresh (3s)
            </label>

            <label>
                <input type="checkbox" id="autoScroll" checked>
                Auto-scroll
            </label>

            <!-- <label class="hl-hidden"> -->
            <label>
                <input type="checkbox" id="analyzePackage">
                Analisar Pacotes
            </label>

            <button onclick="refreshNow()">Atualizar agora</button>

            <a href="<?= htmlspecialchars($downloadUrl) ?>">
                <button>Download</button>
            </a>

            <button type="button" id="toggleFilters">Mostrar marcadores</button>

        </div>

        <div id="termsPanel" class="hl-terms-panel hl-hidden">
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
            <textarea id="hlTerms" class="hl-terms-box" placeholder="Ex:\nERROR\nWARN\nSPN 123\nFMI 5"></textarea>
        </div>

        <div id="logBox" class="log-box"></div>

        <div id="packageTableContainer" class="hl-hidden">
            <div class="table-wrap table-wrap-viewer">
                <table id="packageTable" class="table-clean table-sticky table-clean-viewer">
                </table>
                <div id="btnClosePkgTable">❌</div>
            </div>
        </div>

    </div>
    <script src="./app/js/viewer-utils.js"></script>
    <script src="./app/js/viewer-package-parser.js"></script>
    <script src="./app/js/viewer-package-highlight.js"></script>
    <script src="./app/js/viewer-terms-highlight.js"></script>
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
