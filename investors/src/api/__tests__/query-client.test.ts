import { describe, expect, it } from "vitest";

import { ApiError } from "../errors";
import { shouldRetry } from "../query-client";

describe("shouldRetry", () => {
  it("retries a dropped connection or a server error, twice at most", () => {
    expect(shouldRetry(0, new ApiError({ kind: "network" }))).toBe(true);
    expect(shouldRetry(1, new ApiError({ kind: "server", status: 500 }))).toBe(true);
    expect(shouldRetry(2, new ApiError({ kind: "server", status: 500 }))).toBe(false);
  });

  it.each(["unauthenticated", "blocked", "forbidden", "not_found", "invalid", "rate_limited", "unavailable"] as const)(
    "takes %s as the answer",
    (kind) => {
      expect(shouldRetry(0, new ApiError({ kind }))).toBe(false);
    },
  );

  it("does not retry an unknown failure", () => {
    expect(shouldRetry(0, new Error("boom"))).toBe(false);
  });
});
