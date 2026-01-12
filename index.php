<?php
date_default_timezone_set('America/Sao_Paulo');

// Diretório raiz onde o script está
$rootDir = realpath(__DIR__);

// Diretório atual
$current = isset($_GET['dir']) ? trim($_GET['dir'], '/') : '';
$currentPath = realpath($rootDir . '/' . $current);

// Segurança: impede sair fora da raiz
if ($currentPath === false || strpos($currentPath, $rootDir) !== 0) {
    $currentPath = $rootDir;
    $current = '';
}

// ORDENAR (padrão: mais recente primeiro)
$sort = isset($_GET['sort']) ? $_GET['sort'] : 'date_desc';

// AUTO-REFRESH (checkbox na listagem)
$autorefresh = (isset($_GET['autorefresh']) && $_GET['autorefresh'] == '1') ? '1' : '0';

// File viewer
$selectedFile = isset($_GET['file']) ? trim($_GET['file'], '/') : '';
$viewMode     = (isset($_GET['view']) && $_GET['view'] == '1');

// ------------------------------------------------------------------
// Deletar diretório recursivamente
// ------------------------------------------------------------------
function deleteDirectory($dir) {
    if (!file_exists($dir)) return;
    if (is_file($dir)) { unlink($dir); return; }

    foreach (array_diff(scandir($dir), ['.', '..']) as $file) {
        $path = "$dir/$file";
        if (is_dir($path)) deleteDirectory($path);
        else unlink($path);
    }
    rmdir($dir);
}

// ------------------------------------------------------------------
// Lê arquivo de forma segura (somente dentro do rootDir)
// ------------------------------------------------------------------
function safeReadLogFile($rootDir, $relPath) {
    if ($relPath === '') return '';

    $abs = realpath($rootDir . '/' . $relPath);
    if ($abs === false) return '';
    if (strpos($abs, $rootDir) !== 0) return '';
    if (!is_file($abs)) return '';
    //if (!preg_match('/\.log$/i', basename($abs))) return '';

    $content = @file_get_contents($abs);
    if ($content === false) return '';

    return $content;
}

// ------------------------------------------------------------------
// AJAX: retorna conteúdo do arquivo (para o viewer)
// ------------------------------------------------------------------
if (isset($_GET['ajax']) && $_GET['ajax'] == '1') {
    header('Content-Type: text/plain; charset=utf-8');
    echo safeReadLogFile($rootDir, $selectedFile);
    exit;
}

// ------------------------------------------------------------------
// DOWNLOAD do arquivo selecionado
// ------------------------------------------------------------------
if (isset($_GET['download']) && $_GET['download'] == '1') {

    $abs = realpath($rootDir . '/' . $selectedFile);

    if (
        $abs !== false &&
        strpos($abs, $rootDir) === 0 &&
        is_file($abs) 
        //preg_match('/\.log$/i', basename($abs))
    ) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($abs) . '"');
        header('Content-Length: ' . filesize($abs));
        readfile($abs);
    }

    exit;
}

// ------------------------------------------------------------------
// VIEWER MODE: página separada que abre em nova aba e faz follow-tail
// ------------------------------------------------------------------
if ($viewMode) {
    $title = $selectedFile !== '' ? $selectedFile : '(nenhum arquivo)';
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

            <a href="<?= htmlspecialchars('./index.php?download=1&file=' . urlencode($selectedFile)) ?>">
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
                // garante que não fica em view no endpoint (não faz diferença, mas fica limpo)
                url.searchParams.delete("view");
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

            // carrega e já vai pro final
            refreshNow();
            startAuto();
        </script>
    </body>
    </html>
    <?php
    exit;
}

// ------------------------------------------------------------------
// Processar DELETE (arquivo ou diretório)
// ------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete'])) {
    $item = basename($_POST['delete']);
    $targetPath = realpath($currentPath . '/' . $item);

    if ($targetPath !== false && strpos($targetPath, $rootDir) === 0) {
        if (is_file($targetPath)) {
            unlink($targetPath);
            $msg = "Arquivo '$item' deletado!";
        } elseif (is_dir($targetPath)) {
            deleteDirectory($targetPath);
            $msg = "Diretório '$item' deletado!";
        }
    } else {
        $msg = "Erro ao deletar '$item'.";
    }
}

// ------------------------------------------------------------------
// Carregar lista de itens
// ------------------------------------------------------------------
$itemsRaw = scandir($currentPath);
$items = [];

// ------------------------------------------------------------------
// FILTRO: RAIZ = só diretórios
//         SUBPASTAS = sem filtro
// ------------------------------------------------------------------
foreach ($itemsRaw as $item) {
    if ($item === '.' || $item === '..') continue;

    $path = $currentPath . '/' . $item;

    if ($current === '') {
        // raiz ? só diretórios
        if (is_dir($path)) {
            $items[] = ['name' => $item, 'path' => $path, 'mtime' => filemtime($path)];
        }
    } else {
        // subpastas
        $items[] = ['name' => $item, 'path' => $path, 'mtime' => filemtime($path)];
    }
}

// Ordenação por data
usort($items, function($a, $b) use ($sort) {
    return ($sort === 'date_asc')
        ? $a['mtime'] - $b['mtime']
        : $b['mtime'] - $a['mtime'];
});

// Alternância do botão de ordenação
$nextSort  = ($sort === 'date_desc') ? 'date_asc' : 'date_desc';
$sortLabel = ($sort === 'date_desc') ? 'Ordenar: Mais antigo primeiro' : 'Ordenar: Mais recente primeiro';

// Helper: links mantendo params
function buildLink($dir, $sort, $autorefresh) {
    return "./index.php?dir=" . urlencode($dir) . "&sort=" . urlencode($sort) . "&autorefresh=" . urlencode($autorefresh);
}

?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>File Browser</title>
</head>
<body>

<h2>Listagem: /<?= htmlspecialchars($current) ?></h2>

<?php if (!empty($msg)) echo "<p><b>$msg</b></p>"; ?>

<!-- AUTO-REFRESH da listagem (recarrega a página toda) -->
<label>
    <input type="checkbox" id="autorefresh" <?= $autorefresh === '1' ? 'checked' : '' ?>>
    Auto-refresh (3s)
</label>

<script>
let timer = null;
const cb = document.getElementById("autorefresh");

function start() {
    stop();
    timer = setInterval(() => location.reload(), 3000);
}
function stop() {
    if (timer) clearInterval(timer);
    timer = null;
}

cb.addEventListener("change", () => {
    const url = new URL(window.location.href);
    if (cb.checked) {
        url.searchParams.set("autorefresh", "1");
        window.history.replaceState(null, "", url.toString());
        start();
    } else {
        url.searchParams.delete("autorefresh");
        window.history.replaceState(null, "", url.toString());
        stop();
    }
});

if (cb.checked) start();
</script>

<br><br>

<p>
    <a href="<?= buildLink($current, $nextSort, $autorefresh) ?>">
        <button><?= $sortLabel ?></button>
    </a>
</p>

<?php if ($current !== ''):
    $parent = dirname($current);
    if ($parent === '.') $parent = '';
?>
<p>
    <a href="<?= buildLink($parent, $sort, $autorefresh) ?>"><- Voltar</a>
</p>
<?php endif; ?>

<table border="1" cellpadding="8">
<tr>
    <th>Nome</th>
    <th>Tamanho</th>
    <th>Modificado em</th>
    <th>Action</th>
</tr>

<?php foreach ($items as $entry):
    $item     = $entry['name'];
    $path     = $entry['path'];
    $relative = trim($current . '/' . $item, '/');
    $modTime  = date("d/m/Y H:i:s", $entry['mtime']);
?>
<tr>
<?php if (is_dir($path)): ?>
    <td>
        <b>[DIR]</b>
        <a href="<?= buildLink($relative, $sort, $autorefresh) ?>">
            <?= htmlspecialchars($item) ?>
        </a>
    </td>
    <td>-</td>
    <td><?= $modTime ?></td>
<?php else: ?>
    <td>
        <!-- Abre em nova aba o VIEWER com follow-tail -->
        <a href="./index.php?view=1&file=<?= urlencode($relative) ?>" target="_blank">
            <?= htmlspecialchars($item) ?>
        </a>
    </td>
    <td><?= filesize($path) ?> bytes</td>
    <td><?= $modTime ?></td>
<?php endif; ?>

    <td>
        <form method="POST" onsubmit="return confirm('Deletar <?= htmlspecialchars($item) ?>?');">
            <input type="hidden" name="delete" value="<?= htmlspecialchars($item) ?>">
            <button type="submit">Delete</button>
        </form>
    </td>
</tr>
<?php endforeach; ?>

</table>

</body>
</html>
