import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveBlob } from "../save-file";

// jsdom has no object URLs; the stubs record what the page asked for.
const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:investors/file-1");
const revokeObjectURL = vi.fn<(url: string) => void>();

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe("saveBlob", () => {
  it("clicks a download link to the blob, removes it, and revokes the URL after the click", () => {
    const clicked: { href: string; download: string; rel: string; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, rel: this.rel, attached: document.body.contains(this) });
    });
    const blob = new Blob(["a,b\r\n"], { type: "text/csv" });

    saveBlob("investors-2026-10-27.csv", blob);

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([
      { href: "blob:investors/file-1", download: "investors-2026-10-27.csv", rel: "noopener", attached: true },
    ]);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:investors/file-1");
  });

  it("still removes the link and revokes the URL when the click throws", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveBlob("x.csv", new Blob(["x"]))).toThrow("blocked");
    expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:investors/file-1");
  });
});
