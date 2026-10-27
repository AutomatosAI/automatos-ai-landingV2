import { describe, expect, it, vi } from "vitest";

import { countPdfPages, type PdfjsLike } from "../page-count";

/** pdf.js's part, answering `numPages` or failing to read the file. */
function fakePdfjs(answer: () => Promise<{ numPages: number }>) {
  const destroy = vi.fn(async () => undefined);
  const getDocument = vi.fn<PdfjsLike["getDocument"]>(() => ({ promise: answer(), destroy }));
  return { pdfjs: { getDocument } satisfies PdfjsLike, getDocument, destroy };
}

// jsdom's File has no arrayBuffer(); every browser's has.
const file = { arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer };

describe("countPdfPages", () => {
  it("reads the file's bytes with eval off and answers the page count", async () => {
    const fake = fakePdfjs(async () => ({ numPages: 12 }));
    await expect(countPdfPages(file, async () => fake.pdfjs)).resolves.toBe(12);
    const source = fake.getDocument.mock.calls[0]?.[0];
    expect(source?.isEvalSupported).toBe(false);
    expect([...(source?.data ?? [])]).toEqual([37, 80, 68, 70]);
    expect(fake.destroy).toHaveBeenCalledOnce();
  });

  it("rejects for a file pdf.js cannot read, and still frees the document", async () => {
    const fake = fakePdfjs(async () => Promise.reject(new Error("Invalid PDF structure")));
    await expect(countPdfPages(file, async () => fake.pdfjs)).rejects.toThrow("Invalid PDF structure");
    expect(fake.destroy).toHaveBeenCalledOnce();
  });
});
