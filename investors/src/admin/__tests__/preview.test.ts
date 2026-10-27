import { describe, expect, it, vi } from "vitest";

import { openPreview } from "../preview";

function fakeTab() {
  return { opener: {} as unknown, location: { replace: vi.fn() }, close: vi.fn() };
}

const LINK = "https://storage.example.com/signed-get";

describe("openPreview", () => {
  it("opens a blank tab during the click, cuts its opener, then sends it to the link", async () => {
    const tab = fakeTab();
    const open = vi.fn(() => tab as unknown as Window);
    const getUrl = vi.fn(async () => {
      // The tab exists before the link is asked for: no pop-up blocker in the way.
      expect(open).toHaveBeenCalledWith("about:blank", "_blank");
      return LINK;
    });
    await expect(openPreview(getUrl, open)).resolves.toBe("opened");
    expect(tab.opener).toBeNull();
    expect(tab.location.replace).toHaveBeenCalledWith(LINK);
  });

  it("answers blocked when the browser refuses the tab, and asks for no link", async () => {
    const getUrl = vi.fn(async () => LINK);
    await expect(openPreview(getUrl, () => null)).resolves.toBe("blocked");
    expect(getUrl).not.toHaveBeenCalled();
  });

  it("closes the tab when the link cannot be had", async () => {
    const tab = fakeTab();
    const result = await openPreview(
      async () => Promise.reject(new Error("503")),
      () => tab as unknown as Window,
    );
    expect(result).toBe("failed");
    expect(tab.close).toHaveBeenCalledOnce();
    expect(tab.location.replace).not.toHaveBeenCalled();
  });
});
