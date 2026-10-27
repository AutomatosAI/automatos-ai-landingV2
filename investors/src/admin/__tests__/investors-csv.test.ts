import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/errors";
import { setTokenSource } from "@/auth/token";

import { csvFileName, csvSearch, downloadInvestorsCsv, fetchInvestorsCsv } from "../investors-csv";
import { DEFAULT_QUERY, type InvestorsQuery } from "../investors-query";
import { saveBlob } from "../save-file";

vi.mock("../save-file", () => ({ saveBlob: vi.fn() }));

const CSV = '﻿"Name","Email"\r\n"Ada Example","ada@example.com"\r\n';
const CSV_HEADERS = {
  "Content-Type": "text/csv; charset=utf-8",
  "Content-Disposition": 'attachment; filename="investors-2026-10-27.csv"',
};
const NOW = () => new Date("2026-10-28T09:00:00Z");

const fetchMock = vi.fn<typeof fetch>();

const csvAnswer = (headers: Record<string, string> = CSV_HEADERS) => new Response(CSV, { status: 200, headers });
const errorAnswer = (status: number, body: string) => new Response(body, { status });

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(err instanceof ApiError)) throw new Error(`expected an ApiError, got ${String(err)}`);
  return err;
}

const VIEW: InvestorsQuery = { q: "ada & co", type: "vc", source: "intro", sort: "name", dir: "asc", page: 3 };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_admin");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.mocked(saveBlob).mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("csvSearch", () => {
  it("is the table's search, filters and sort without the page", () => {
    expect(csvSearch(VIEW)).toBe("?q=ada+%26+co&type=vc&source=intro&sort=name&dir=asc");
    expect(csvSearch({ ...DEFAULT_QUERY, page: 7 })).toBe("");
  });
});

describe("csvFileName", () => {
  it("takes the server's name for the file", () => {
    expect(csvFileName('attachment; filename="investors-2026-10-27.csv"', NOW())).toBe("investors-2026-10-27.csv");
  });

  it("names it after the UTC day when the header is missing or not the server's", () => {
    expect(csvFileName(null, NOW())).toBe("investors-2026-10-28.csv");
    expect(csvFileName('attachment; filename="../../evil.exe"', NOW())).toBe("investors-2026-10-28.csv");
    expect(csvFileName('attachment; filename="investors-2026-10-27.csv.exe"', NOW())).toBe("investors-2026-10-28.csv");
  });
});

describe("fetchInvestorsCsv", () => {
  it("asks for the CSV with the Bearer token and no cookies, and answers the file", async () => {
    fetchMock.mockResolvedValueOnce(csvAnswer());
    const file = await fetchInvestorsCsv("?q=ada", NOW);
    expect(fetchMock).toHaveBeenCalledWith("/api/investors/admin/investors.csv?q=ada", {
      headers: { Accept: "text/csv", Authorization: "Bearer tok_admin" },
      credentials: "omit",
      cache: "no-store",
    });
    expect(file.fileName).toBe("investors-2026-10-27.csv");
    expect(file.blob.type).toBe("text/csv;charset=utf-8");
    // The bytes as sent, byte order mark included (text() would decode it away).
    expect([...new Uint8Array(await file.blob.arrayBuffer())]).toEqual([...new TextEncoder().encode(CSV)]);
  });

  it("names the file itself when the server sends no name", async () => {
    fetchMock.mockResolvedValueOnce(csvAnswer({ "Content-Type": "text/csv" }));
    expect((await fetchInvestorsCsv("", NOW)).fileName).toBe("investors-2026-10-28.csv");
  });

  it("maps the server's refusals as the API client does", async () => {
    fetchMock.mockResolvedValueOnce(errorAnswer(403, JSON.stringify({ error: "forbidden" })));
    expect(await failure(fetchInvestorsCsv(""))).toMatchObject({ kind: "forbidden", status: 403, code: "forbidden" });
    fetchMock.mockResolvedValueOnce(errorAnswer(400, JSON.stringify({ error: "invalid", fields: { sort: "invalid_option" } })));
    expect(await failure(fetchInvestorsCsv(""))).toMatchObject({ kind: "invalid", status: 400 });
    fetchMock.mockResolvedValueOnce(errorAnswer(503, "not json"));
    expect(await failure(fetchInvestorsCsv(""))).toMatchObject({ kind: "unavailable", status: 503, code: null });
  });

  it("refuses an answer that is not a CSV", async () => {
    fetchMock.mockResolvedValueOnce(csvAnswer({ "Content-Type": "text/html; charset=utf-8" }));
    expect(await failure(fetchInvestorsCsv(""))).toMatchObject({ kind: "bad_response", status: 200 });
    fetchMock.mockResolvedValueOnce(csvAnswer({ "Content-Type": "text/csvx" }));
    expect(await failure(fetchInvestorsCsv(""))).toMatchObject({ kind: "bad_response" });
  });

  it("is a network error when the request or the token provider fails, and unauthenticated without a token", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect((await failure(fetchInvestorsCsv(""))).kind).toBe("network");
    setTokenSource(async () => {
      throw new Error("clerk unreachable");
    });
    expect((await failure(fetchInvestorsCsv(""))).kind).toBe("network");
    setTokenSource(async () => null);
    expect((await failure(fetchInvestorsCsv(""))).kind).toBe("unauthenticated");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("downloadInvestorsCsv", () => {
  it("fetches the view without its page and saves the file under the server's name", async () => {
    fetchMock.mockResolvedValueOnce(csvAnswer());
    await downloadInvestorsCsv(VIEW);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/investors/admin/investors.csv?q=ada+%26+co&type=vc&source=intro&sort=name&dir=asc",
    );
    // fetch's Blob is Node's, not jsdom's: compare what it holds, not its class.
    const [fileName, blob] = vi.mocked(saveBlob).mock.calls[0] ?? [];
    expect(fileName).toBe("investors-2026-10-27.csv");
    expect(blob?.type).toBe("text/csv;charset=utf-8");
    expect(blob?.size).toBe(new TextEncoder().encode(CSV).length);
  });

  it("saves nothing when the fetch fails", async () => {
    fetchMock.mockResolvedValueOnce(errorAnswer(500, JSON.stringify({ error: "internal_error" })));
    expect((await failure(downloadInvestorsCsv(VIEW))).kind).toBe("server");
    expect(saveBlob).not.toHaveBeenCalled();
  });
});
