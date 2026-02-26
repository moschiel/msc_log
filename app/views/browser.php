<?php
// app/views/browser.php

function render_browser($items, $msg) {
    global $current, $sort, $autorefresh, $currentPath;

    $nextSort  = ($sort === 'date_desc') ? 'date_asc' : 'date_desc';
    $sortLabel = ($sort === 'date_desc') ? 'Ordem: Mais novo primeiro' : 'Ordem: Mais antigo primeiro';

    ?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>File Browser</title>
    <link rel="stylesheet" href="./app/css/common.css">
    <link rel="stylesheet" href="./app/css/table.css">
    <link rel="stylesheet" href="./app/css/browser.css">
</head>
<body>
    <?php if ($current !== ''):
        $parent = dirname($current);
        if ($parent === '.') $parent = '';
    ?>
    
    <h2>
        <a href="<?= buildBrowserLink($parent, $sort, $autorefresh) ?>">
            <button class="emoji-btn">⬅️</button>
        </a>
        Listagem: /<?= htmlspecialchars($current) ?>
    </h2>

    <?php if (!empty($msg)) echo "<p><b>" . htmlspecialchars($msg) . "</b></p>"; ?>
    <?php endif; ?>

    <button 
        id="btnAutoRefresh"
        type="button"
        class="hint toogle-btn <?= $autorefresh === '1' ? 'is-pressed' : '' ?>"
        data-hint="Auto-Refresh (3s)"
    >
        <span class="toogle-btn-icon">⟳</span>
    </button>

    <p>
        <a href="<?= buildBrowserLink($current, $nextSort, $autorefresh) ?>">
            <button class="normal-btn">Mudar Ordem</button>
        </a>
    </p>
    <p><?= htmlspecialchars($sortLabel) ?></p>
    <div class="table-scroll">
        <table class="table-clean table-sticky">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Tamanho</th>
                    <th>Modificado em</th>
                    <th>Deletar</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $entry):
                    $item     = $entry['name'];
                    $path     = $entry['path'];
                    $relative = trim($current . '/' . $item, '/');
                    $modTime  = date("d/m/Y H:i:s", $entry['mtime']);
                ?>
                <tr>
                <?php if (is_dir($path)): ?>
                    <td>
                        <b>📁</b>
                        <a href="<?= buildBrowserLink($relative, $sort, $autorefresh) ?>">
                            <?= htmlspecialchars($item) ?>
                        </a>
                    </td>
                    <td>-</td>
                    <td><?= htmlspecialchars($modTime) ?></td>
                <?php else: ?>
                    <td>
                    <b>📄</b>
                    <?php if (is_text_file_by_extension($item)): ?>
                        <a href="./home.php?view=1&file=<?= urlencode($relative) ?>">
                            <?= htmlspecialchars($item) ?>
                        </a>
                    <?php else: ?>
                        <a href="./home.php?download=1&file=<?= urlencode($relative) ?>">
                            <?= htmlspecialchars($item) ?>
                        </a>
                    <?php endif; ?>
                    </td>
                    <td><?= (is_file($path) ? filesize($path) : 0) ?> bytes</td>
                    <td><?= htmlspecialchars($modTime) ?></td>
                <?php endif; ?>
        
                    <td>
                        <form method="POST" onsubmit="return confirm('Deletar <?= htmlspecialchars($item) ?>?');">
                            <input type="hidden" name="delete" value="<?= htmlspecialchars($item) ?>">
                            <button type="submit" class="emoji-btn">🗑️</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <script type="module" src="./app/js/browser.js"></script>
</body>
</html>
<?php
}
