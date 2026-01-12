<?php
// app/bootstrap.php
date_default_timezone_set('America/Sao_Paulo');

// Diretório raiz onde o index.php está
$ROOT_DIR = realpath(dirname($_SERVER['SCRIPT_FILENAME']));
if ($ROOT_DIR === false) {
    $ROOT_DIR = realpath(__DIR__ . '/..');
}

// Parâmetros principais
$current = isset($_GET['dir']) ? trim($_GET['dir'], '/') : '';
$sort = isset($_GET['sort']) ? $_GET['sort'] : 'date_desc';
$autorefresh = (isset($_GET['autorefresh']) && $_GET['autorefresh'] == '1') ? '1' : '0';

// Parâmetros do viewer
$selectedFile = isset($_GET['file']) ? trim($_GET['file'], '/') : '';
$viewMode = (isset($_GET['view']) && $_GET['view'] == '1');

// Caminho completo do diretório atual (com segurança)
$currentPath = realpath($ROOT_DIR . '/' . $current);
if ($currentPath === false || strpos($currentPath, $ROOT_DIR) !== 0) {
    $currentPath = $ROOT_DIR;
    $current = '';
}
