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
 * @property {HTMLSelectElement} selListMessageTimeline
 *
 * @property {HTMLDivElement} mainSplitter
 * @property {HTMLDivElement} logBox
 * @property {HTMLDivElement} logContent
 * @property {HTMLDivElement} logPendingPacketContent
 *
 * @property {HTMLTableElement} listMessageTable
 * @property {HTMLDivElement} windowParsedPackage
 * @property {HTMLTableElement} packageTable
 * @property {HTMLDivElement} windowParsedMessage
 * @property {HTMLSpanElement} labelMessageDescription
 * @property {HTMLTableElement} messageTable
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

  selListMessageTimeline: /** @type {HTMLSelectElement} */ (
    document.getElementById("selListMessageTimeline")
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

  windowParsedPackage: /** @type {HTMLDivElement} */ (
    document.getElementById("windowParsedPackage")
  ),

  packageTable: /** @type {HTMLTableElement} */ (
    document.getElementById("packageTable")
  ),

  windowParsedMessage: /** @type {HTMLDivElement} */ (
    document.getElementById("windowParsedMessage")
  ),

  labelMessageDescription: /** @type {HTMLSpanElement} */ (
    document.getElementById("labelMessageDescription")
  ),

  messageTable: /** @type {HTMLTableElement} */ (
    document.getElementById("messageTable")
  ),
};
