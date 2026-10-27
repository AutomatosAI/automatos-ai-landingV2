import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportFileName, saveJson } from "../save-json";

/** jsdom's Blob has no text(); its FileReader reads one. */
function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// jsdom has no object URLs; the stubs record what the page asked for.
const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:investors/export-1");
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

describe("exportFileName", () => {
  it("is the server's own name for the export", () => {
    expect(exportFileName("00000000-0000-4000-8000-000000000001")).toBe("investor-00000000-0000-4000-8000-000000000001.json");
  });
});

describe("saveJson", () => {
  it("clicks a download link to a JSON blob, then tidies up", async () => {
    const clicked: { href: string; download: string; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
    });

    saveJson("investor-1.json", { investor: { name: "Ada Example" }, events: [] });

    expect(clicked).toEqual([{ href: "blob:investors/export-1", download: "investor-1.json", attached: true }]);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:investors/export-1");

    const blob = createObjectURL.mock.calls[0]?.[0];
    if (!blob) throw new Error("expected a blob");
    expect(blob.type).toBe("application/json");
    vi.useRealTimers();
    expect(JSON.parse(await readText(blob))).toEqual({ investor: { name: "Ada Example" }, events: [] });
  });
});
