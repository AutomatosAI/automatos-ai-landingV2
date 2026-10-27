import { describe, expect, it } from "vitest";

import { DOCUMENT_KINDS } from "../kinds";
import { viewerFor } from "../library-model";

describe("viewerFor", () => {
  it("shows a PDF in the PDF viewer and a video in the video player", () => {
    expect(viewerFor("pdf")).toBe("pdf");
    expect(viewerFor("video")).toBe("video");
  });

  it("has no viewer for any other kind: Open downloads it", () => {
    const others = DOCUMENT_KINDS.filter((kind) => kind !== "pdf" && kind !== "video");
    expect(others).toEqual(["spreadsheet", "slides", "doc", "other"]);
    for (const kind of others) expect(viewerFor(kind)).toBeNull();
  });
});
