<?php
// app/views/browser.php

function render_browser($items, $msg) {
    global $current, $sort, $autorefresh, $currentPath;

    $nextSort  = ($sort === 'date_desc') ? 'date_asc' : 'date_desc';
    $sortLabel = ($sort === 'date_desc') ? 'Ordenar: Mais antigo primeiro' : 'Ordenar: Mais recente primeiro';

    ?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>File Browser</title>
</head>
<body>

<h2>Listagem: /<?= htmlspecialchars($current) ?></h2>

<?php if (!empty($msg)) echo "<p><b>" . htmlspecialchars($msg) . "</b></p>"; ?>

<label>
    <input type="checkbox" id="autorefresh" <?= $autorefresh === '1' ? 'checked' : '' ?>>
    Auto-refresh (3s)
</label>

<br><br>

<p>
    <a href="<?= buildBrowserLink($current, $nextSort, $autorefresh) ?>">
        <button><?= htmlspecialchars($sortLabel) ?></button>
    </a>
</p>

<?php if ($current !== ''):
    $parent = dirname($current);
    if ($parent === '.') $parent = '';
?>
<p>
    <a href="<?= buildBrowserLink($parent, $sort, $autorefresh) ?>"><- Voltar</a>
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
        <a href="<?= buildBrowserLink($relative, $sort, $autorefresh) ?>">
            <?= htmlspecialchars($item) ?>
        </a>
    </td>
    <td>-</td>
    <td><?= htmlspecialchars($modTime) ?></td>
<?php else: ?>
    <td>
    <?php if (is_text_file_by_extension($item)): ?>
        <a href="./index.php?view=1&file=<?= urlencode($relative) ?>">
            <?= htmlspecialchars($item) ?>
        </a>
    <?php else: ?>
        <a href="./index.php?download=1&file=<?= urlencode($relative) ?>">
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
            <button type="submit">Delete</button>
        </form>
    </td>
</tr>
<?php endforeach; ?>

</table>

<script src="./app/js/browser.js"></script>
</body>
</html>
<?php
}
