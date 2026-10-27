/**
 * What pdf.js is told when the viewer loads a document (react-pdf's
 * `options`). isEvalSupported false: pdf.js never compiles a document's font
 * programs into functions. disableRange: the file comes in one plain GET, so
 * the 5-minute link is needed only while it loads (no later range request can
 * meet an expired link) and storage CORS needs no Range header. A module
 * constant: react-pdf reloads the document whenever `options` changes identity.
 * Typed structurally so this module never imports react-pdf (it stays in the
 * viewer's lazy chunk).
 */
export const PDF_OPTIONS = Object.freeze({ isEvalSupported: false, disableRange: true });
