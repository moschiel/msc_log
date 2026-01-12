<?php
// app/controller.php

require_once __DIR__ . '/views/viewer.php';
require_once __DIR__ . '/views/browser.php';

// ---------------------------
// AJAX: retorna conteúdo do arquivo para o viewer
// ---------------------------
if (isset($_GET['ajax']) && $_GET['ajax'] == '1') {
    header('Content-Type: text/plain; charset=UTF-8');
    // Mantém o comportamento atual: viewer lê qualquer arquivo (sem filtro de extensão).
    echo safeReadFile($ROOT_DIR, $selectedFile, null);
    exit;
}

// ---------------------------
// DOWNLOAD do arquivo selecionado
// ---------------------------
if (isset($_GET['download']) && $_GET['download'] == '1') {
    $abs = safeRealpathInRoot($ROOT_DIR, $selectedFile);

    // Mantém comportamento atual: download apenas .log
    if ($abs !== false && is_file($abs)) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($abs) . '"');
        header('Content-Length: ' . filesize($abs));
        readfile($abs);
    }
    exit;
}

// ---------------------------
// VIEWER MODE (página separada)
// ---------------------------
if ($viewMode) {
    render_viewer($selectedFile);
    exit;
}

// ---------------------------
// DELETE (arquivo ou diretório) na pasta atual
// ---------------------------
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete'])) {
    $item = basename($_POST['delete']);
    $targetPath = realpath($currentPath . '/' . $item);

    if ($targetPath !== false && strpos($targetPath, $ROOT_DIR) === 0) {
        if (is_file($targetPath)) {
            @unlink($targetPath);
            $msg = "Arquivo '$item' deletado!";
        } elseif (is_dir($targetPath)) {
            deleteDirectory($targetPath);
            $msg = "Diretório '$item' deletado!";
        }
    } else {
        $msg = "Erro ao deletar '$item'.";
    }
}

// ---------------------------
// LISTAGEM (file tree view)
// ---------------------------
$itemsRaw = @scandir($currentPath) ?: [];
$items = [];
$hiddenDirs = array('app'); // lista de diretorios da raiz que nao podem aparecer para o usuario

foreach ($itemsRaw as $item) {
    if ($item === '.' || $item === '..') continue;

    // Oculta diretórios internos
    if (in_array($item, $hiddenDirs, true)) continue;

    $path = $currentPath . '/' . $item;

    if ($current === '') {
        // na raiz só mostra diretórios, não mostramos arquivos
        if (is_dir($path)) {
            $items[] = ['name' => $item, 'path' => $path, 'mtime' => filemtime($path)];
        }
    } else {
        // subpastas: sem filtro
        $items[] = ['name' => $item, 'path' => $path, 'mtime' => filemtime($path)];
    }
}

// Ordenação por data
usort($items, function($a, $b) use ($sort) {
    return ($sort === 'date_asc') ? ($a['mtime'] - $b['mtime']) : ($b['mtime'] - $a['mtime']);
});

render_browser($items, $msg);
