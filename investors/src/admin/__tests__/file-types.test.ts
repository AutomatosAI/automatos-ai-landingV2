import { describe, expect, it } from "vitest";

import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, UPLOAD_ACCEPT, checkFile, contentTypeFor } from "../file-types";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const file = (name: string, type: string, size = 1024) => ({ name, type, size });

describe("the allowed types (KP11)", () => {
  it("are exactly the server's six", () => {
    expect([...ALLOWED_CONTENT_TYPES].sort()).toEqual(
      ["application/pdf", "video/mp4", "text/csv", XLSX, PPTX, DOCX].sort(),
    );
    expect(MAX_UPLOAD_BYTES).toBe(262_144_000);
  });

  it("limit the picker by extension and by type", () => {
    const accept = UPLOAD_ACCEPT.split(",");
    expect(accept).toEqual(expect.arrayContaining([".pdf", ".mp4", ".csv", ".xlsx", ".pptx", ".docx", ...ALLOWED_CONTENT_TYPES]));
    expect(accept).toHaveLength(12);
  });
});

describe("contentTypeFor", () => {
  it.each([
    ["deck.pdf", "application/pdf", "application/pdf"],
    ["demo.mp4", "video/mp4", "video/mp4"],
    ["model.xlsx", XLSX, XLSX],
    ["deck.pptx", PPTX, PPTX],
    ["memo.docx", DOCX, DOCX],
    ["metrics.csv", "text/csv", "text/csv"],
  ])("takes the browser's type for %s", (name, type, expected) => {
    expect(contentTypeFor({ name, type })).toBe(expected);
  });

  it.each([
    // Windows reports a .csv as Excel's old type.
    ["metrics.csv", "application/vnd.ms-excel", "text/csv"],
    ["deck.PDF", "", "application/pdf"],
    ["model.xlsx", "application/octet-stream", XLSX],
    ["demo.mp4", "", "video/mp4"],
  ])("falls back to the extension for %s (%s)", (name, type, expected) => {
    expect(contentTypeFor({ name, type })).toBe(expected);
  });

  it.each([
    ["photo.png", "image/png"],
    ["old.xls", "application/vnd.ms-excel"],
    ["clip.mov", "video/quicktime"],
    ["script.html", "text/html"],
    ["noextension", ""],
    ["deck.pdf.exe", "application/x-msdownload"],
  ])("refuses %s", (name, type) => {
    expect(contentTypeFor({ name, type })).toBeNull();
  });
});

describe("checkFile", () => {
  it("passes an allowed file with the type to sign", () => {
    expect(checkFile(file("deck.pdf", "application/pdf"))).toEqual({ ok: true, contentType: "application/pdf" });
  });

  it("refuses a type outside KP11", () => {
    expect(checkFile(file("photo.png", "image/png"))).toEqual({ ok: false, reason: "content_type_not_allowed" });
  });

  it("refuses an empty file", () => {
    expect(checkFile(file("deck.pdf", "application/pdf", 0))).toEqual({ ok: false, reason: "invalid_size" });
  });

  it("takes exactly 250 MB and refuses a byte more", () => {
    expect(checkFile(file("demo.mp4", "video/mp4", MAX_UPLOAD_BYTES)).ok).toBe(true);
    expect(checkFile(file("demo.mp4", "video/mp4", MAX_UPLOAD_BYTES + 1))).toEqual({ ok: false, reason: "file_too_large" });
  });

  it("names the type problem before the size", () => {
    expect(checkFile(file("photo.png", "image/png", 0))).toEqual({ ok: false, reason: "content_type_not_allowed" });
  });
});
