/**
 * A PDF's page count, measured in the admin's browser before upload with
 * react-pdf's pdf.js (US-014); the server stores it for the viewer and the
 * page events (KP16).
 */

/** KP16: no page is above 2000, so no document has more pages. */
export const MAX_PAGE_COUNT = 2000;

/** The part of pdf.js this needs; the real one is loaded on first use. */
export interface PdfjsLike {
  getDocument(source: { data: Uint8Array; isEvalSupported: boolean }): {
    readonly promise: Promise<{ readonly numPages: number }>;
    destroy(): Promise<void>;
  };
}

export type PdfjsLoader = () => Promise<PdfjsLike>;

const loadPdfjs: PdfjsLoader = async () => (await import("@/lib/pdfjs")).pdfjs;

/** Rejects when the file is not a readable PDF. */
export async function countPdfPages(file: Pick<Blob, "arrayBuffer">, load: PdfjsLoader = loadPdfjs): Promise<number> {
  const pdfjs = await load();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  try {
    const document = await task.promise;
    return document.numPages;
  } finally {
    // Frees the worker's copy; the count (or the read error) is already known.
    task.destroy().catch(() => undefined);
  }
}
