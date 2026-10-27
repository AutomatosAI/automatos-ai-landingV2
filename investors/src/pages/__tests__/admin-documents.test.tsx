import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/App";
import type { AdminDocument } from "@/admin/documents-api";
import type { Me } from "@/api/me";
import { setTokenSource } from "@/auth/token";
import { strings } from "@/strings";
import { ADA_ME, ADMIN_ME, adminDocument, overviewAnswer } from "@/test/fixtures";
import { ADA, renderWithProviders } from "@/test/providers";

const copy = strings.admin;
const DECK = adminDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", sortOrder: 0 });
const MODEL = adminDocument({
  id: "00000000-0000-4000-8000-0000000000d2",
  title: "Example model",
  category: "Business model",
  kind: "spreadsheet",
  fileName: null,
  contentType: null,
  sizeBytes: null,
  pageCount: null,
  hasFile: false,
  sortOrder: 1,
});

type Handler = (body: unknown) => Response;

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** Answers /me with `me` and "METHOD /path" with its handler; anything else is a 404 the test would notice. */
function serve(me: Me, routes: Readonly<Record<string, Handler>>) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = String(input).replace("/api/investors", "");
    const method = init?.method ?? "GET";
    if (path === "/me") return json(200, me);
    const handler = routes[`${method} ${path}`];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return handler ? handler(body) : json(404, { error: "not_found" });
  });
}

const calls = (method: string, path: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => (init?.method ?? "GET") === method && String(input) === `/api/investors${path}`)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : undefined));

const listOf = (documents: readonly AdminDocument[]) => () => json(200, { documents });

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAdmin(path = "/admin/documents") {
  return renderWithProviders(
    <>
      <App />
      <Where />
    </>,
    { path, auth: ADA },
  );
}

/** Storage's side of the presigned PUT: records each request and answers 200 after one progress event. */
function stubStorage() {
  const puts: { url: string; headers: Record<string, string>; size: number }[] = [];
  class StorageXhr {
    upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
      onprogress: null,
    };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    status = 0;
    private url = "";
    private headers: Record<string, string> = {};
    open(_method: string, url: string) {
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers = { ...this.headers, [name]: value };
    }
    send(body: Blob) {
      puts.push({ url: this.url, headers: this.headers, size: body.size });
      setTimeout(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: body.size, total: body.size });
        this.status = 200;
        this.onload?.();
      }, 0);
    }
    abort() {
      this.onabort?.();
    }
  }
  vi.stubGlobal("XMLHttpRequest", StorageXhr);
  return puts;
}

const pick = (title: string, file: File) =>
  fireEvent.change(screen.getByLabelText(copy.documents.fileLabel(title)), { target: { files: [file] } });

const row = (title: string) => {
  const cell = screen.getByText(title, { selector: "p" });
  const tr = cell.closest("tr");
  if (!tr) throw new Error(`no row for ${title}`);
  return within(tr);
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("the admin area, for an investor who is not an admin", () => {
  it.each(["/admin", "/admin/documents"])("shows Not available at %s and asks nothing of the admin API", async (path) => {
    serve(ADA_ME, {});
    renderAdmin(path);
    expect(await screen.findByRole("heading", { name: strings.status.notAvailable.title })).toBeInTheDocument();
    const asked = new Set(fetchMock.mock.calls.map(([input]) => String(input)));
    // /me, and the reading tracker's session (US-010); nothing under /admin.
    expect([...asked].sort()).toEqual(["/api/investors/me", "/api/investors/sessions"]);
  });
});

describe("the document manager", () => {
  it("opens from the admin nav and lists every document with its facts", async () => {
    serve(ADMIN_ME, {
      "GET /admin/overview": () => json(200, overviewAnswer()),
      "GET /admin/documents": listOf([MODEL, DECK]),
    });
    renderAdmin("/admin");
    const nav = await screen.findByRole("navigation", { name: copy.navLabel });
    fireEvent.click(within(nav).getByRole("link", { name: copy.nav.documents }));
    expect(await screen.findByRole("heading", { level: 1, name: copy.documents.title })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/admin/documents"));
    const table = await screen.findByRole("table", { name: copy.documents.tableLabel });
    const titles = within(table).getAllByText(/^Example (deck|model)$/).map((cell) => cell.textContent);
    expect(titles).toEqual(["Example deck", "Example model"]);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(9);
    const deck = row("Example deck");
    expect(deck.getByText("Pitch")).toBeInTheDocument();
    expect(deck.getByText("PDF")).toBeInTheDocument();
    expect(deck.getByText("v1")).toBeInTheDocument();
    expect(deck.getByText("1.5 MB")).toBeInTheDocument();
    expect(deck.getByText("example-deck.pdf · 12 pages")).toBeInTheDocument();
    expect(row("Example model").getByText(copy.documents.noFile)).toBeInTheDocument();
  });

  it("says when file storage is not set up", async () => {
    serve(ADMIN_ME, { "GET /admin/documents": () => json(503, { error: "storage_unavailable" }) });
    renderAdmin();
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.documents.storageUnavailable);
  });

  it("publishes with the switch, and keeps a document without a file unpublishable", async () => {
    serve(ADMIN_ME, {
      "GET /admin/documents": listOf([DECK, MODEL]),
      [`PATCH /admin/documents/${DECK.id}`]: () => json(200, { document: { ...DECK, published: true } }),
    });
    renderAdmin();
    const toggle = await screen.findByRole("switch", { name: copy.documents.publishedLabel(DECK.title) });
    expect(screen.getByRole("switch", { name: copy.documents.publishedLabel(MODEL.title) })).toBeDisabled();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(calls("PATCH", `/admin/documents/${DECK.id}`)).toEqual([{ published: true }]);
  });

  it("moves a document down by swapping sort orders, and the rows follow", async () => {
    const moved = [
      { ...MODEL, sortOrder: 0 },
      { ...DECK, sortOrder: 1 },
    ];
    const patched = () => calls("PATCH", `/admin/documents/${DECK.id}`).length > 0;
    serve(ADMIN_ME, {
      // The list as the server holds it, before and after the move.
      "GET /admin/documents": () => json(200, { documents: patched() ? moved : [DECK, MODEL] }),
      [`PATCH /admin/documents/${DECK.id}`]: () => json(200, { document: moved[1] }),
      [`PATCH /admin/documents/${MODEL.id}`]: () => json(200, { document: moved[0] }),
    });
    renderAdmin();
    const table = await screen.findByRole("table");
    const label = copy.documents.actionLabel;
    expect(screen.getByRole("button", { name: label(copy.documents.actions.moveUp, DECK.title) })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: label(copy.documents.actions.moveDown, DECK.title) }));
    await waitFor(() =>
      expect(within(table).getAllByText(/^Example (deck|model)$/).map((cell) => cell.textContent)).toEqual([
        "Example model",
        "Example deck",
      ]),
    );
    expect(calls("PATCH", `/admin/documents/${DECK.id}`)).toEqual([{ sortOrder: 1 }]);
    expect(calls("PATCH", `/admin/documents/${MODEL.id}`)).toEqual([{ sortOrder: 0 }]);
  });

  it("deletes only after the confirmation", async () => {
    serve(ADMIN_ME, {
      "GET /admin/documents": listOf([DECK, MODEL]),
      [`DELETE /admin/documents/${DECK.id}`]: () => new Response(null, { status: 204 }),
    });
    renderAdmin();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: copy.documents.actionLabel(copy.documents.actions.delete, DECK.title) }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(DECK.title);
    expect(calls("DELETE", `/admin/documents/${DECK.id}`)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: copy.delete.confirm }));
    await waitFor(() => expect(screen.queryByText(DECK.title, { selector: "p" })).not.toBeInTheDocument());
    expect(calls("DELETE", `/admin/documents/${DECK.id}`)).toHaveLength(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("creates a document from the New document dialog", async () => {
    const created = adminDocument({ id: "00000000-0000-4000-8000-0000000000d3", title: "Demo video", kind: "video", hasFile: false });
    serve(ADMIN_ME, {
      "GET /admin/documents": listOf([DECK]),
      "POST /admin/documents": () => json(201, { document: { ...created, sortOrder: 1 } }),
    });
    renderAdmin();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: copy.documents.newDocument }));
    const dialog = await screen.findByRole("dialog");
    const fields = copy.form.fields;
    fireEvent.click(within(dialog).getByRole("button", { name: copy.form.create }));
    expect(await within(dialog).findByText(copy.form.checkFields)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(fields.title.label), { target: { value: " Demo video " } });
    fireEvent.change(within(dialog).getByLabelText(fields.category.label), { target: { value: "Product" } });
    fireEvent.change(within(dialog).getByLabelText(fields.kind.label), { target: { value: "video" } });
    fireEvent.click(within(dialog).getByRole("button", { name: copy.form.create }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(calls("POST", "/admin/documents")).toEqual([
      { title: "Demo video", description: null, category: "Product", kind: "video", alertOnFirstOpen: false },
    ]);
    expect(screen.getByText("Demo video", { selector: "p" })).toBeInTheDocument();
  });

  it("uploads a file: upload-url, a PUT to storage with progress, then finalize", async () => {
    const target = {
      url: "https://storage.example.com/signed-put",
      key: `documents/${MODEL.id}/v1/metrics.csv`,
      headers: { "Content-Type": "text/csv" },
      expiresIn: 900,
    };
    const uploaded = { ...MODEL, hasFile: true, fileName: "metrics.csv", contentType: "text/csv", sizeBytes: 8 };
    serve(ADMIN_ME, {
      "GET /admin/documents": listOf([DECK, MODEL]),
      [`POST /admin/documents/${MODEL.id}/upload-url`]: () => json(200, target),
      [`POST /admin/documents/${MODEL.id}/finalize`]: () => json(200, { document: uploaded }),
    });
    const puts = stubStorage();
    renderAdmin();
    await screen.findByRole("table");
    // Windows names a .csv by Excel's old type: the extension decides.
    pick(MODEL.title, new File(["a,b\n1,2\n"], "metrics.csv", { type: "application/vnd.ms-excel" }));
    expect(await screen.findByText(copy.upload.done(1))).toBeInTheDocument();
    expect(calls("POST", `/admin/documents/${MODEL.id}/upload-url`)).toEqual([
      { fileName: "metrics.csv", contentType: "text/csv", contentLength: 8, pageCount: null },
    ]);
    expect(puts).toEqual([{ url: target.url, headers: { "Content-Type": "text/csv" }, size: 8 }]);
    expect(calls("POST", `/admin/documents/${MODEL.id}/finalize`)).toEqual([{ key: target.key, pageCount: null }]);
    expect(row(MODEL.title).getByText("metrics.csv")).toBeInTheDocument();
    expect(row(MODEL.title).getByRole("button", { name: copy.documents.actionLabel(copy.documents.actions.replace, MODEL.title) })).toBeEnabled();
  });

  it("refuses a file type outside KP11 without asking the server", async () => {
    serve(ADMIN_ME, { "GET /admin/documents": listOf([DECK]) });
    const puts = stubStorage();
    renderAdmin();
    await screen.findByRole("table");
    pick(DECK.title, new File(["x"], "photo.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.upload.errors.content_type_not_allowed);
    expect(calls("POST", `/admin/documents/${DECK.id}/upload-url`)).toEqual([]);
    expect(puts).toEqual([]);
  });
});
