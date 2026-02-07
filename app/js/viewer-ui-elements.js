/**
 * @fileoverview
 * Módulo que exporta referências tipadas para os elementos da UI
 * do visualizador de logs.
 */

/**
 * @typedef {Object} ViewerUI
 * @property {HTMLButtonElement} btnTailAutoRefresh
 * @property {HTMLButtonElement} btnAutoScroll
 * @property {HTMLButtonElement} btnHighlightPkg
 * @property {HTMLButtonElement} btnPkgConfig
 *
 * @property {HTMLSelectElement} selListMessage
 *
 * @property {HTMLDivElement} mainSplitter
 * @property {HTMLDivElement} logBox
 * @property {HTMLDivElement} logContent
 * @property {HTMLDivElement} logPendingPacketContent
 *
 * @property {HTMLTableElement} listMessageTable
 * @property {HTMLDivElement} parsedPackageSplitter
 * @property {HTMLDivElement} windowParsedPackage
 * @property {HTMLTableElement} parsedPackageTable
 * @property {HTMLDivElement} labelMessageDescription
 * @property {HTMLTableElement} parsedMessageTable
 */

/** @type {ViewerUI} */
export const ui = {
  btnTailAutoRefresh: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnTailAutoRefresh")
  ),

  btnAutoScroll: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnAutoScroll")
  ),

  btnHighlightPkg: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnHighlightPkg")
  ),

  btnPkgConfig: /** @type {HTMLButtonElement} */ (
    document.getElementById("btnPkgConfig")
  ),

  selListMessage: /** @type {HTMLSelectElement} */ (
    document.getElementById("selListMessage")
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
