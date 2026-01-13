<?php
// app/utils.php

function deleteDirectory($dir) {
    if (!file_exists($dir)) return;

    if (is_file($dir)) {
        @unlink($dir);
        return;
    }

    foreach (array_diff(@scandir($dir) ?: [], ['.', '..']) as $file) {
        $path = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_dir($path)) {
            deleteDirectory($path);
        } else {
            @unlink($path);
        }
    }

    @rmdir($dir);
}

// Resolve um caminho relativo dentro de uma raiz, bloqueando path traversal.
// Retorna caminho absoluto (realpath) ou false.
function safeRealpathInRoot($rootDir, $relativePath) {
    $relativePath = trim($relativePath, '/');
    if ($relativePath === '') return false;

    $abs = realpath($rootDir . '/' . $relativePath);
    if ($abs === false) return false;
    if (strpos($abs, $rootDir) !== 0) return false;
    return $abs;
}

// Leitura segura de arquivo. Se $allowedExts for null, não filtra extensão.
// $allowedExts: ['log','txt']
function safeReadFile($rootDir, $relativePath, $allowedExts = null) {
    $abs = safeRealpathInRoot($rootDir, $relativePath);
    if ($abs === false) return '';

    if (!is_file($abs)) return '';

    if (is_array($allowedExts)) {
        $name = basename($abs);
        $ok = false;
        foreach ($allowedExts as $ext) {
            $ext = ltrim($ext, '.');
            if (preg_match('/\.' . preg_quote($ext, '/') . '$/i', $name)) {
                $ok = true;
                break;
            }
        }
        if (!$ok) return '';
    }

    $content = @file_get_contents($abs);
    return ($content === false) ? '' : $content;
}

// Link helper mantendo params
function buildBrowserLink($dir, $sort, $autorefresh) {
    return "./index.php?dir=" . urlencode($dir) .
           "&sort=" . urlencode($sort) .
           "&autorefresh=" . urlencode($autorefresh);
}

function is_text_file_by_extension($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, array('log','txt','csv','json','xml'), true);
}