<?php
// app/views/viewer.php


function render_viewer($selectedFile) {
    global $ROOT_DIR;

    $title = ($selectedFile !== '') ? $selectedFile : '(nenhum arquivo)';
    $downloadUrl = './home.php?download=1&file=' . urlencode($selectedFile);
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Viewer - <?= htmlspecialchars($title) ?></title>
    <link rel="stylesheet" href="./app/css/viewer.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-header.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-terms.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-split-pane.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-log-box.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/table.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-table.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-highlight.css?v=<?= APP_VERSION ?>">
</head>
<body>
    <div class="main">
        <div class="header-container">
            <b>Arquivo:</b> <span class="file"><?= htmlspecialchars($title) ?></span>

            <label>
                <input type="checkbox" id="autoRefresh">
                Auto-refresh (3s)
            </label>

            <label>
                <input type="checkbox" id="autoScroll" checked>
                Auto-scroll
            </label>

            <!-- <button onclick="refreshNow()">Atualizar agora</button> -->

            <a href="<?= htmlspecialchars($downloadUrl) ?>">
                <button>Download</button>
            </a>

            <div class="">
                <button
                    id="btnAnalyzePackage"
                    class="hint" 
                    data-hint="Dectecta pacotes, ao clicar no pacote mostra detalhes.

Funcionalidade Experimental !!!

Auto-Refresh será desabilitado.

Se o LOG for muito grande, a página pode ficar lenta."
                >
                    Analisar Pacotes
                </button>
                <label>
                    <input type="checkbox" id="cbSkipAck" checked>
                    Skip ACK, KEEP-ALIVE
                </label>
            </div>

            <!-- Funcionalidade quebrada, deixa muito lento o log,  -->
            <button 
                class="hidden" 
                type="button" 
                id="toggleFilters">
                Mostrar marcadores
            </button>

        </div>

        <!-- Funcionalidade quebrada, deixa muito lento o log -->
        <div id="termsPanel" class="hl-terms-panel hidden">
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
            <textarea id="hlTerms" class="hl-terms-box"></textarea>
        </div>

        <!-- split pane container -->
        <div class="vsplit" id="vsplit"> 
            <div id="splitPaneTop" class="pane top">
                <div id="logBox" class="log-box">Carregando...</div>
            </div>
            <div class="splitDivider" id="splitDivider" role="separator" aria-orientation="horizontal" tabindex="0">
                <div class="splitDivider-grip"></div>
            </div>
            <div id="splitPaneBottom" class="pane bottom hidden">
                <div id="tablesContainer">
                    <div id="tablesFlexContainer">
                        <div class="table-wrap table-wrap-viewer">
                            <div>Pacote CC33</div>
                            <table id="packageTable" class="table-clean table-sticky table-clean-viewer">
                            </table>
                        </div>
                        <div id="messageTableWrapper" class="table-wrap table-wrap-viewer hidden">
                            <div id="labelMessageDescription"></div>
                            <table id="messageTable" class="table-clean table-sticky table-clean-viewer">
                            </table>
                        </div>
                        <div id="btnCloseTablesContainer">❌</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="./app/js/viewer-ui-elements.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-split-pane.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-utils.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-binary-reader.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-package-parser.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-package-highlight.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-terms-highlight.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-render-log.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-auto-refresh.js?v=<?= APP_VERSION ?>"></script>
    <script src="./app/js/viewer-ui-events.js?v=<?= APP_VERSION ?>"></script>
    <script>
        // executa no inicio
        loadSettings();
        refreshNow();
    </script>
</body>
</html>
<?php
}
