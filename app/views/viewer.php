<?php
// app/views/viewer.php


function render_viewer($selectedFile) {
    global $ROOT_DIR, $currentPath;

    $title = ($selectedFile !== '') ? $selectedFile : '(nenhum arquivo)';
    $downloadUrl = './home.php?download=1&file=' . urlencode($selectedFile);
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Viewer - <?= htmlspecialchars($title) ?></title>
    <link rel="stylesheet" href="./app/css/common.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/table.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-header.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-terms.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-split-pane.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-log-box.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-table.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-highlight.css?v=<?= APP_VERSION ?>">
</head>
<body>
    <div class="main">
        <div class="header-container">
            <p>
                <a href="<?= buildBrowserLink(dirname($selectedFile), 'date_desc', '0') ?>">
                    ⬅️
                </a>
            </p>
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
                    id="btnHighlightPkg"
                    class="hint" 
                    data-hint="Permite clicar no pacote p/ ver detalhes.

🟢 - Pacote Online
⚪ - Pacote Offline
🔴 - Pacote com Erro

- Auto-Refresh será desativado.

- Se o LOG for grande, a página fica lenta."
                >
                    Marcar Pacotes
                </button>
                <label>
                    <input type="checkbox" id="cbIgnoreAck" checked>
                    Ignore ACK, KEEP-ALIVE
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

        <div id="mainSplitter" class="splitter splitter-root is-vertical">
            <div class="pane first">
                <div id="logBox" class="log-box">Carregando...</div>
            </div>

            <div class="splitDivider" role="separator" tabindex="0" title="Arrastar ou Duplo Clique">
                <div class="splitDivider-grip"></div>
            </div>

            <div class="pane second hidden">
                <div class="pane-close-btn" title="Fechar Painel">x</div>

                <div id="tableSplitter" class="splitter is-vertical">
                    <div class="pane first">
                        <div class="single-table-container">
                            <div>Pacote CC33</div>
                            <div class="table-wrap">
                                <table id="packageTable" class="table-clean table-sticky">
                                    <thead><tr><th>Example</th><th>Example</th><th>Example</th></tr></thead>
                                    <tbody><tr><td>Tamanho do pacote</td><td>2</td><td>174</td></tr><tr><td>Option</td><td>1</td><td>3 - Provider</td></tr><tr><td>Sei lá</td><td>2</td><td>0x0104</td></tr><tr><td>Tamanho do SN</td><td>1</td><td>5</td></tr><tr><td>SerialNumber</td><td>5 (BCD)</td><td>1625200106</td></tr><tr><td>Index do Pacote</td><td>2</td><td>57581</td></tr><tr><td>Tipo de Serviço</td><td>1</td><td>0x81 - ACK requested, Online</td></tr><tr><td>0x1101 - Extended Position</td><td>55</td><td>0186CE0969A0AFF0EF0001FBE201051000000200800047ABF112914A3C016F0999011000200080CE096945010A081EB1FB222208000000</td></tr><tr><td>0x1121 - MSC830 aditional Data</td><td>31</td><td>2D0856082E08260845085508FF0CBF00000100000000000000000000000000</td></tr><tr><td>0x1400 - Telemetry Data</td><td>56</td><td>0063000000000000000000000000000000000000000000000000000000000000082E830740ABF11200000000320030002900B45F08007001</td></tr><tr><td>0x1501 - Accessory Report V2</td><td>2</td><td>0000</td></tr></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="splitDivider" role="separator" tabindex="0" title="Arrastar ou Duplo Clique">
                        <div class="splitDivider-grip"></div>
                    </div>

                    <div class="pane second hidden">
                        <div class="single-table-container">
                            <div id="labelMessageDescription">ID da Mensagem AQUI</div>
                            <div class="table-wrap">
                                <table id="messageTable" class="table-clean table-sticky">
                                    <thead><tr><th>Example</th><th>Example</th><th>Example</th></tr></thead>
                                    <tbody><tr><td>Tamanho do pacote</td><td>2</td><td>174</td></tr><tr><td>Option</td><td>1</td><td>3 - Provider</td></tr><tr><td>Sei lá</td><td>2</td><td>0x0104</td></tr><tr><td>Tamanho do SN</td><td>1</td><td>5</td></tr><tr><td>SerialNumber</td><td>5 (BCD)</td><td>1625200106</td></tr><tr><td>Index do Pacote</td><td>2</td><td>57581</td></tr><tr><td>Tipo de Serviço</td><td>1</td><td>0x81 - ACK requested, Online</td></tr><tr><td>0x1101 - Extended Position</td><td>55</td><td>0186CE0969A0AFF0EF0001FBE201051000000200800047ABF112914A3C016F0999011000200080CE096945010A081EB1FB222208000000</td></tr><tr><td>0x1121 - MSC830 aditional Data</td><td>31</td><td>2D0856082E08260845085508FF0CBF00000100000000000000000000000000</td></tr><tr><td>0x1400 - Telemetry Data</td><td>56</td><td>0063000000000000000000000000000000000000000000000000000000000000082E830740ABF11200000000320030002900B45F08007001</td></tr><tr><td>0x1501 - Accessory Report V2</td><td>2</td><td>0000</td></tr></tbody>
                                </table>
                            </div>
                        </div>
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
        loadTermsSettings();
        refreshNow();
    </script>
</body>
</html>
<?php
}
