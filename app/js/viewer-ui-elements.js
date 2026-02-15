/**
 * @fileoverview
 * Módulo que exporta referências tipadas para os elementos da UI
 * do visualizador de logs.
 */

/**
 * @typedef {Object} ViewerUI
 * @property {HTMLButtonElement} btnPickLocalFile
 * @property {HTMLSpanElement} labelLocalFile
 * @property {HTMLButtonElement} btnTailAutoRefresh
 * @property {HTMLButtonElement} btnAutoScroll
 * @property {HTMLButtonElement} btnHighlightPkg
 * @property {HTMLDivElement} selListMessageContainer
 * @property {HTMLSelectElement} selListMessage
 * @property {HTMLButtonElement} btnPkgConfig
 * @property {HTMLButtonElement} btnStatistics
 *
 * @property {HTMLDivElement} mainSplitter
 * @property {HTMLDivElement} logBox
 * @property {HTMLDivElement} logContent
 * @property {HTMLDivElement} logPendingPacketContent
 *
 * @property {HTMLDivElement} listMessageContainer
 * @property {HTMLTableElement} listMessageTable
 * @property {HTMLDivElement} parsedPackageSplitter
 * @property {HTMLDivElement} windowParsedPackage
 * @property {HTMLTableElement} parsedPackageTable
 * @property {HTMLDivElement} labelMessageDescription
 * @property {HTMLTableElement} parsedMessageTable
 */

/** @type {ViewerUI} */
export const ui = {
  labelLocalFile: /** @type {HTMLSpanElement} */ (
    document.getElementById("labelLocalFile")
  ),
  
  btnPickLocalFile: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnPickLocalFile")
  ),

  btnTailAutoRefresh: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnTailAutoRefresh")
  ),

  btnAutoScroll: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnAutoScroll")
  ),

  btnHighlightPkg: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnHighlightPkg")
  ),

  selListMessageContainer: /** @type {HTMLDivElement} */ (
    document.getElementById("selListMessageContainer")
  ),

  selListMessage: /** @type {HTMLSelectElement} */ (
    document.getElementById("selListMessage")
  ),

  btnStatistics: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnStatistics")
  ),
  
  btnPkgConfig: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnPkgConfig")
  ),

  mainSplitter: /** @type {HTMLDivElement} */ (
    document.getElementById("mainSplitter")
  ),

  logBox: /** @type {HTMLDivElement} */ (
    document.getElementById("logBox")
  ),

  logContent: /** @type {HTMLDivElement} */ (
    document.getElementById("logContent")
  ),

  logPendingPacketContent: /** @type {HTMLDivElement} */ (
    document.getElementById("logPendingPacketContent")
  ),

  listMessageContainer: /** @type {HTMLDivElement} */ (
    document.getElementById("listMessageContainer")
  ),

  listMessageTable: /** @type {HTMLTableElement} */ (
    document.getElementById("listMessageTable")
  ),
  
  parsedPackageSplitter: /** @type {HTMLDivElement} */ (
    document.getElementById("parsedPackageSplitter")
  ),

  windowParsedPackage: /** @type {HTMLDivElement} */ (
    document.getElementById("windowParsedPackage")
  ),

  parsedPackageTable: /** @type {HTMLTableElement} */ (
    document.getElementById("parsedPackageTable")
  ),

  labelMessageDescription: /** @type {HTMLDivElement} */ (
    document.getElementById("labelMessageDescription")
  ),

  parsedMessageTable: /** @type {HTMLTableElement} */ (
    document.getElementById("parsedMessageTable")
  ),
};