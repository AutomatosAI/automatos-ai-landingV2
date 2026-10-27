import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { setTokenSource } from "@/auth/token";

import { fetchJson } from "../client";
import { ApiError, screenForError } from "../errors";

const okSchema = z.object({ ok: z.literal(true) });
const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body?: unknown) {
  const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  fetchMock.mockResolvedValueOnce(new Response(text === "" ? null : text, { status }));
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(err instanceof ApiError)) throw new Error(`expected an ApiError, got ${String(err)}`);
  return err;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("fetchJson: the request", () => {
  it("calls the portal API with the Bearer token and no cookies", async () => {
    respond(200, { ok: true });
    await expect(fetchJson("/me", { schema: okSchema })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/investors/me");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("omit");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer tok_ada", Accept: "application/json" });
    expect(init?.body).toBeUndefined();
  });

  it("sends a body as JSON", async () => {
    respond(200, { ok: true });
    await fetchJson("/me", { method: "PUT", body: { firm: "Example Ventures" }, schema: okSchema });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("PUT");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init?.body).toBe(JSON.stringify({ firm: "Example Ventures" }));
  });

  it("does not call the API when signed out, and asks for sign-in", async () => {
    setTokenSource(null);
    const err = await failure(fetchJson("/me", { schema: okSchema }));
    expect(err.kind).toBe("unauthenticated");
    expect(screenForError(err)).toBe("sign_in");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a network error when the token cannot be fetched", async () => {
    setTokenSource(async () => {
      throw new Error("offline");
    });
    expect((await failure(fetchJson("/me", { schema: okSchema }))).kind).toBe("network");
  });

  it("refuses a path outside the API base", async () => {
    await expect(fetchJson("me", { schema: okSchema })).rejects.toThrow(TypeError);
  });
});

describe("fetchJson: the status mapping", () => {
  it("maps 401 to the sign-in prompt", async () => {
    respond(401, { error: "unauthenticated" });
    const err = await failure(fetchJson("/me", { schema: okSchema }));
    expect([err.kind, err.status, screenForError(err)]).toEqual(["unauthenticated", 401, "sign_in"]);
  });

  it("maps 403 blocked to the blocked screen", async () => {
    respond(403, { error: "blocked" });
    const err = await failure(fetchJson("/me", { schema: okSchema }));
    expect([err.kind, err.code, screenForError(err)]).toEqual(["blocked", "blocked", "blocked"]);
  });

  it("maps 403 email_required and other 403s apart from blocked", async () => {
    respond(403, { error: "email_required" });
    expect(screenForError(await failure(fetchJson("/me", { schema: okSchema })))).toBe("email_required");
    respond(403, { error: "forbidden" });
    expect(screenForError(await failure(fetchJson("/admin/x", { schema: okSchema })))).toBe("not_available");
  });

  it("maps 503 to the unavailable screen, with or without a JSON body", async () => {
    respond(503, { error: "portal_unavailable", state: "starting" });
    expect(screenForError(await failure(fetchJson("/me", { schema: okSchema })))).toBe("unavailable");
    respond(503, "<html>Service Unavailable</html>");
    expect(screenForError(await failure(fetchJson("/me", { schema: okSchema })))).toBe("unavailable");
  });

  it("carries a 400's field errors", async () => {
    respond(400, { error: "invalid", fields: { linkedinUrl: "Must be a linkedin.com address" } });
    const err = await failure(fetchJson("/me", { method: "PUT", body: {}, schema: okSchema }));
    expect(err.kind).toBe("invalid");
    expect(err.fields).toEqual({ linkedinUrl: "Must be a linkedin.com address" });
  });

  it("is a server error for a 500, and a network error when no response arrives", async () => {
    respond(500, { error: "internal_error" });
    expect((await failure(fetchJson("/me", { schema: okSchema }))).kind).toBe("server");
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const err = await failure(fetchJson("/me", { schema: okSchema }));
    expect([err.kind, err.status]).toEqual(["network", null]);
  });

  it("rejects a 200 whose body does not match the schema", async () => {
    respond(200, { ok: "yes" });
    expect((await failure(fetchJson("/me", { schema: okSchema }))).kind).toBe("bad_response");
    respond(200, "not json");
    expect((await failure(fetchJson("/me", { schema: okSchema }))).kind).toBe("bad_response");
  });

  it("reads an empty body as null", async () => {
    respond(204);
    await expect(fetchJson("/admin/documents/x", { method: "DELETE", schema: z.null() })).resolves.toBeNull();
  });
});
