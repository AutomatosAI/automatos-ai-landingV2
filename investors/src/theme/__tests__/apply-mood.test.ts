import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMood, saveMood } from "../apply-mood";
import { MOOD_STORAGE_KEY } from "../mood";

function stubScheme(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: dark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("applyMood", () => {
  let stop: () => void = () => {};

  beforeEach(() => {
    window.localStorage.clear();
    document.body.removeAttribute("data-mood");
  });

  afterEach(() => {
    stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sets the saved mood on body", () => {
    window.localStorage.setItem(MOOD_STORAGE_KEY, "pitch");
    stop = applyMood();
    expect(document.body.dataset.mood).toBe("pitch");
  });

  it("follows the system scheme when nothing is saved", () => {
    stubScheme(true);
    stop = applyMood();
    expect(document.body.dataset.mood).toBe("pitch");
  });

  it("is bone without a saved mood or matchMedia", () => {
    stop = applyMood();
    expect(document.body.dataset.mood).toBe("bone");
  });

  it("treats unreadable storage as unset", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    stubScheme(false);
    stop = applyMood();
    expect(document.body.dataset.mood).toBe("bone");
  });

  it("follows the site's toggle in another tab", () => {
    stop = applyMood();
    expect(document.body.dataset.mood).toBe("bone");
    window.localStorage.setItem(MOOD_STORAGE_KEY, "pitch");
    window.dispatchEvent(new StorageEvent("storage", { key: MOOD_STORAGE_KEY }));
    expect(document.body.dataset.mood).toBe("pitch");
  });

  it("stops listening once unsubscribed", () => {
    stop = applyMood();
    stop();
    window.localStorage.setItem(MOOD_STORAGE_KEY, "pitch");
    window.dispatchEvent(new StorageEvent("storage", { key: MOOD_STORAGE_KEY }));
    expect(document.body.dataset.mood).toBe("bone");
  });
});

describe("saveMood", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.removeAttribute("data-mood");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the mood and saves it under the site's key", () => {
    saveMood("pitch");
    expect(document.body.dataset.mood).toBe("pitch");
    expect(window.localStorage.getItem(MOOD_STORAGE_KEY)).toBe("pitch");
    saveMood("bone");
    expect(document.body.dataset.mood).toBe("bone");
    expect(window.localStorage.getItem(MOOD_STORAGE_KEY)).toBe("bone");
  });

  it("still switches the page when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    saveMood("pitch");
    expect(document.body.dataset.mood).toBe("pitch");
  });
});
