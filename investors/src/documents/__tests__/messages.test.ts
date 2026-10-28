import { describe, expect, it } from "vitest";

import { ApiError, type ApiErrorKind } from "@/api/errors";
import { strings } from "@/strings";

import { isGone, linkFailureMessage } from "../messages";

const errors = strings.library.errors;
const failure = (kind: ApiErrorKind) => new ApiError({ kind });

describe("linkFailureMessage", () => {
  it.each<[ApiErrorKind, string]>([
    ["not_found", errors.gone],
    ["rate_limited", errors.rateLimited],
    ["unavailable", errors.unavailable],
    ["storage_unavailable", strings.documents.unavailable],
    ["unauthenticated", strings.status.signIn.body],
    ["blocked", errors.blocked],
    ["server", errors.failed],
    ["network", errors.failed],
    ["bad_response", errors.failed],
    ["invalid", errors.failed],
  ])("%s → a plain message", (kind, message) => {
    expect(linkFailureMessage(failure(kind))).toBe(message);
  });

  it("says the document could not be opened for anything that is not an API error", () => {
    expect(linkFailureMessage(new TypeError("x"))).toBe(errors.failed);
    expect(linkFailureMessage(undefined)).toBe(errors.failed);
  });
});

describe("isGone", () => {
  it("is true only for a 404", () => {
    expect(isGone(failure("not_found"))).toBe(true);
    expect(isGone(failure("server"))).toBe(false);
    expect(isGone(new Error("not_found"))).toBe(false);
  });
});
