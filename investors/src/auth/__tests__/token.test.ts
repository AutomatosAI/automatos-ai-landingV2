import { afterEach, describe, expect, it } from "vitest";

import { getToken, lastToken, setTokenSource } from "../token";

afterEach(() => {
  setTokenSource(null);
});

describe("getToken", () => {
  it("is null with no provider", async () => {
    expect(await getToken()).toBeNull();
  });

  it("asks the provider every time and remembers the latest answer", async () => {
    let n = 0;
    setTokenSource(async () => `token-${++n}`);
    expect(await getToken()).toBe("token-1");
    expect(await getToken()).toBe("token-2");
    expect(lastToken()).toBe("token-2");
  });

  it("forgets the last token when the provider goes away", async () => {
    setTokenSource(async () => "token");
    await getToken();
    setTokenSource(null);
    expect(lastToken()).toBeNull();
  });

  it("passes a provider failure on to the caller", async () => {
    setTokenSource(async () => {
      throw new Error("offline");
    });
    await expect(getToken()).rejects.toThrow("offline");
  });
});
