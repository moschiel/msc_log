<?php
// app/views/viewer.php


function render_viewer($selectedFile, $isLocal) {
    global $ROOT_DIR, $currentPath;

    $title = ($selectedFile !== '') ? $selectedFile : '(nenhum arquivo)';
    $downloadUrl = './home.php?download=1&file=' . urlencode($selectedFile);
    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($title) ?></title>
    <link rel="stylesheet" href="./app/css/common.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/table.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/modal.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/split-pane.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/floating-window.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-header.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-log-box.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-highlight.css?v=<?= APP_VERSION ?>">
    <link rel="stylesheet" href="./app/css/viewer-table.css?v=<?= APP_VERSION ?>">
</head>
<body>
    <div class="main">
        <div class="header-container">
            <?php
                if ($isLocal) {  
                    ?>
                    <div class="local-file-picker">
                        <button id="btnPickLocalFile" type="button" class="normal-btn">
                            📂 Abrir arquivo
                        </button>
                        <span id="labelLocalFile" class="local-file-name">
                            nenhum arquivo selecionado
                        </span>
                    </div>
                    <?php
                } else { 
                    ?>
                    <a href="<?= buildBrowserLink(dirname($selectedFile), 'date_desc', '0') ?>">
                        <button class="emoji-btn">⬅️</button>
                    </a>
        
                    <div>
                        <b>Arquivo:</b>
                        <a href="<?= htmlspecialchars($downloadUrl) ?>">
                            <span><?= htmlspecialchars($title) ?></span>
                        </a>
                    </div>
                    <?php
                } 
            ?>
        
            <button 
                id="btnTailAutoRefresh"
                type="button"
                class="hint toogle-btn"
                data-hint="Tail Auto-Refresh (3s)"
            >
                <span class="toogle-btn-icon">⟳</span>
            </button>

            <button 
                id="btnAutoScroll"
                type="button"
                class="hint toogle-btn is-pressed"
                data-hint="Auto-Scroll"
            >
                <span class="toogle-btn-icon">⇣</span>
            </button>
            
            <button
                id="btnHighlightPkg"
                class="toogle-btn hint" 
                data-hint="Analisador de Pacotes

Permite clicar nos pacotes p/ ver detalhes.

🟢 Pacote Enviado (Online)
⚪ Pacote Enviado (Offline)
🔵 Pacote Recebido
🔴 Pacote com Erro

⚠ Em logs grandes, a página pode ficar lenta." >
                <span class="toogle-btn-icon">▦</span>
            </button>

            <div id="selListMessageContainer" class="hint hidden", data-hint="Lista todas as mensagens do ID selecionado.

Botão ▦ deve estar ativo.

⚠ Em logs grandes, a página pode ficar lenta." >
                <!-- <label for="selListMessage">Listar:</label> -->
                <select name="selListMessage" id="selListMessage">
                    <option value="none">--</option>
                    <option value="all">Todos os Pacotes</option>
                </select>
            </div>

            <div class="align-right">
                <button id="btnStatistics" class="emoji-btn">📊</button>
                <button id="btnPkgConfig" class="emoji-btn">⚙️</button>
            </div>
        </div>

        <div id="mainSplitter" class="splitter splitter-root is-vertical" add-btn-close="none">
            <div id="logBox" class="log-box">
                <span id="logContent">Carregando...</span><span id="logPendingPacketContent"></span>
            </div>
            <div class="table-scroll hidden" id="listMessageContainer">
                <table id="listMessageTable" class="table-clean table-sticky">
                    <!-- <thead><tr><th>Example</th><th>Example</th><th>Example</th></tr></thead> -->
                    <!-- <tbody><tr><td>Tamanho do pacote</td><td>2</td><td>174</td></tr><tr><td>Option</td><td>1</td><td>3 - Provider</td></tr><tr><td>Sei lá</td><td>2</td><td>0x0104</td></tr><tr><td>Tamanho do SN</td><td>1</td><td>5</td></tr><tr><td>SerialNumber</td><td>5 (BCD)</td><td>1625200106</td></tr><tr><td>Index do Pacote</td><td>2</td><td>57581</td></tr><tr><td>Tipo de Serviço</td><td>1</td><td>0x81 - ACK requested, Online</td></tr><tr><td>0x1101 - Extended Position</td><td>55</td><td>0186CE0969A0AFF0EF0001FBE201051000000200800047ABF112914A3C016F0999011000200080CE096945010A081EB1FB222208000000</td></tr><tr><td>0x1121 - MSC830 aditional Data</td><td>31</td><td>2D0856082E08260845085508FF0CBF00000100000000000000000000000000</td></tr><tr><td>0x1400 - Telemetry Data</td><td>56</td><td>0063000000000000000000000000000000000000000000000000000000000000082E830740ABF11200000000320030002900B45F08007001</td></tr><tr><td>0x1501 - Accessory Report V2</td><td>2</td><td>0000</td></tr></tbody> -->
                </table>
            </div>
        </div>
    </div>

    <!-- Floating Window for Parsed Package + Parsed Message -->
    <div id="windowParsedPackage" 
        class="floating-window floating-no-scroll hidden" 
        data-title="Package #?" >
        <!-- Splitter -->
        <div id="parsedPackageSplitter" 
            class="splitter splitter-root is-vertical" 
            add-btn-close="second" >
            <!-- Splitter First Pane for Parsed Package -->
            <div class="table-scroll">
                <table id="parsedPackageTable" class="table-clean table-sticky">
                    <thead><tr><th>Example</th><th>Example</th><th>Example</th></tr></thead>
                    <tbody><tr><td>Tamanho do pacote</td><td>2</td><td>174</td></tr><tr><td>Option</td><td>1</td><td>3 - Provider</td></tr><tr><td>Sei lá</td><td>2</td><td>0x0104</td></tr><tr><td>Tamanho do SN</td><td>1</td><td>5</td></tr><tr><td>SerialNumber</td><td>5 (BCD)</td><td>1625200106</td></tr><tr><td>Index do Pacote</td><td>2</td><td>57581</td></tr><tr><td>Tipo de Serviço</td><td>1</td><td>0x81 - ACK requested, Online</td></tr><tr><td>0x1101 - Extended Position</td><td>55</td><td>0186CE0969A0AFF0EF0001FBE201051000000200800047ABF112914A3C016F0999011000200080CE096945010A081EB1FB222208000000</td></tr><tr><td>0x1121 - MSC830 aditional Data</td><td>31</td><td>2D0856082E08260845085508FF0CBF00000100000000000000000000000000</td></tr><tr><td>0x1400 - Telemetry Data</td><td>56</td><td>0063000000000000000000000000000000000000000000000000000000000000082E830740ABF11200000000320030002900B45F08007001</td></tr><tr><td>0x1501 - Accessory Report V2</td><td>2</td><td>0000</td></tr></tbody>
                </table>
            </div>
            <!-- Splitter Second Pane for Parsed Message -->
            <div style="width: 100%;" class="paneBackColor hidden">
                <div id="labelMessageDescription" style="padding: 10px;">ID da Mensagem AQUI</div>
                <div class="table-scroll">
                    <table id="parsedMessageTable" class="table-clean table-sticky">
                        <thead><tr><th>Example</th><th>Example</th><th>Example</th></tr></thead>
                        <tbody><tr><td>Tamanho do pacote</td><td>2</td><td>174</td></tr><tr><td>Option</td><td>1</td><td>3 - Provider</td></tr><tr><td>Sei lá</td><td>2</td><td>0x0104</td></tr><tr><td>Tamanho do SN</td><td>1</td><td>5</td></tr><tr><td>SerialNumber</td><td>5 (BCD)</td><td>1625200106</td></tr><tr><td>Index do Pacote</td><td>2</td><td>57581</td></tr><tr><td>Tipo de Serviço</td><td>1</td><td>0x81 - ACK requested, Online</td></tr><tr><td>0x1101 - Extended Position</td><td>55</td><td>0186CE0969A0AFF0EF0001FBE201051000000200800047ABF112914A3C016F0999011000200080CE096945010A081EB1FB222208000000</td></tr><tr><td>0x1121 - MSC830 aditional Data</td><td>31</td><td>2D0856082E08260845085508FF0CBF00000100000000000000000000000000</td></tr><tr><td>0x1400 - Telemetry Data</td><td>56</td><td>0063000000000000000000000000000000000000000000000000000000000000082E830740ABF11200000000320030002900B45F08007001</td></tr><tr><td>0x1501 - Accessory Report V2</td><td>2</td><td>0000</td></tr></tbody>
                    </table>
                </div>
            </div>  
        </div>
    </div>
    
    <!-- modal1: modal com botoes -->
    <div id="modal1" class="modal-overlay" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <div class="modal-header">
                <strong id="modalTitle1">Título</strong>
                <button class="normal-btn" data-modal-close type="button">✕</button>
            </div>
            <div class="modal-body" id="modalBody1">
                Corpo do modal
            </div>
            <div class="modal-footer">
                <button class="normal-btn" data-modal-close type="button">Fechar</button>
            </div>
        </div>
    </div>
    <!-- modal2: modal sem botoes -->
    <div id="modal2" class="modal-overlay" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <div class="modal-header">
                <strong id="modalTitle2">Título</strong>
            </div>
            <div class="modal-body" id="modalBody2">
                Corpo do modal
            </div>
        </div>
    </div>  

    <script>
        const LOG_FILE_NAME = "<?= htmlspecialchars($title) ?>"; 
    </script>    
    <script type="module" src="./app/js/viewer.js?v=<?= APP_VERSION ?>"></script>
</body>
</html>
<?php
}
