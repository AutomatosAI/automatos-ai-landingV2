import { describe, expect, it } from "vitest";

import { ApiError, errorKindFor, isStorageUnavailable, screenForError } from "../errors";

describe("errorKindFor", () => {
  it.each([
    [401, "unauthenticated", "unauthenticated"],
    [403, "blocked", "blocked"],
    [403, "email_required", "email_required"],
    [403, "forbidden", "forbidden"],
    [403, null, "forbidden"],
    [403, "toString", "forbidden"],
    [404, "not_found", "not_found"],
    [400, "invalid", "invalid"],
    [400, "bad_request", "invalid"],
    [413, null, "invalid"],
    [429, null, "rate_limited"],
    [503, "portal_unavailable", "unavailable"],
    [503, null, "unavailable"],
    [503, "starting", "unavailable"],
    [503, "storage_unavailable", "storage_unavailable"],
    [500, "storage_unavailable", "server"],
    [500, "internal_error", "server"],
    [502, null, "server"],
  ] as const)("%i %s → %s", (status, code, kind) => {
    expect(errorKindFor(status, code)).toBe(kind);
  });
});

describe("screenForError", () => {
  it.each([
    ["unauthenticated", "sign_in"],
    ["blocked", "blocked"],
    ["email_required", "email_required"],
    ["forbidden", "not_available"],
    ["not_found", "not_found"],
    ["unavailable", "unavailable"],
    ["storage_unavailable", "storage_unavailable"],
    ["invalid", "error"],
    ["rate_limited", "error"],
    ["server", "error"],
    ["network", "error"],
    ["bad_response", "error"],
  ] as const)("%s → %s", (kind, screen) => {
    expect(screenForError(new ApiError({ kind }))).toBe(screen);
  });

  it("shows the generic error for anything that is not an ApiError", () => {
    expect(screenForError(new Error("boom"))).toBe("error");
    expect(screenForError("boom")).toBe("error");
  });
});

describe("isStorageUnavailable", () => {
  it("is true only for document storage being down", () => {
    expect(isStorageUnavailable(new ApiError({ kind: "storage_unavailable", status: 503, code: "storage_unavailable" }))).toBe(true);
    expect(isStorageUnavailable(new ApiError({ kind: "unavailable", status: 503, code: "portal_unavailable" }))).toBe(false);
    expect(isStorageUnavailable(new ApiError({ kind: "server", status: 500, code: "storage_unavailable" }))).toBe(false);
    expect(isStorageUnavailable(new Error("storage_unavailable"))).toBe(false);
    expect(isStorageUnavailable(undefined)).toBe(false);
  });
});

describe("ApiError", () => {
  it("never puts the server's words in its message beyond the kind and status", () => {
    const err = new ApiError({ kind: "blocked", status: 403, code: "blocked" });
    expect(err.message).toBe("investors api: blocked (403)");
    expect(err.name).toBe("ApiError");
    expect(Object.isFrozen(err.fields)).toBe(true);
  });
});
