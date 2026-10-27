import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import { saveBlob } from "@/admin/save-file";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADMIN_ME, investorList, investorRow } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

vi.mock("@/admin/save-file", () => ({ saveBlob: vi.fn() }));

const copy = strings.admin.investors;
const CSV_URL = "/api/investors/admin/investors.csv";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const csv = () =>
  new Response('﻿"Name"\r\n"Ada Example"\r\n', {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="investors-2026-10-27.csv"',
    },
  });

/** /me as an admin, the tracker's session, one page of investors, and the CSV from `answerCsv`. */
function serve(answerCsv: () => Response) {
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input), "https://automatos.app").pathname;
    if (path === "/api/investors/me") return json(200, ADMIN_ME);
    if (path === "/api/investors/sessions") return json(201, { sessionId: "00000000-0000-4000-8000-00000000005e" });
    if (path === "/api/investors/admin/investors") return json(200, investorList([investorRow()]));
    if (path === CSV_URL) return answerCsv();
    return json(404, { error: "not_found" });
  });
}

/** Every CSV request: its URL and its Authorization header. */
const csvRequests = () =>
  fetchMock.mock.calls
    .filter(([input]) => String(input).startsWith(CSV_URL))
    .map(([input, init]) => ({ url: String(input), auth: new Headers(init?.headers).get("Authorization") }));

const exportButton = () => screen.findByRole("button", { name: copy.exportCsv.button });

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

describe("the investors table's Export CSV", () => {
  it("fetches the current view, every page, with the Bearer token and saves it", async () => {
    serve(csv);
    renderWithProviders(<App />, { path: "/admin/investors?q=ada&type=vc&sort=name&dir=asc&page=2", auth: ADA });
    const button = await exportButton();
    expect(button).toHaveAccessibleDescription(copy.exportCsv.description);
    expect(csvRequests()).toEqual([]);

    fireEvent.click(button);

    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    expect(csvRequests()).toEqual([{ url: `${CSV_URL}?q=ada&type=vc&sort=name&dir=asc`, auth: "Bearer tok_admin" }]);
    expect(vi.mocked(saveBlob).mock.calls[0]?.[0]).toBe("investors-2026-10-27.csv");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(await exportButton()).toBeEnabled();
  });

  it("says so when the export fails, and saves nothing", async () => {
    serve(() => json(500, { error: "internal_error" }));
    renderWithProviders(<App />, { path: "/admin/investors", auth: ADA });
    fireEvent.click(await exportButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.exportCsv.failed);
    expect(csvRequests()).toEqual([{ url: CSV_URL, auth: "Bearer tok_admin" }]);
    expect(saveBlob).not.toHaveBeenCalled();
  });
});
