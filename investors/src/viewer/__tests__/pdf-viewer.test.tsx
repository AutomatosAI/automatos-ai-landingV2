import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { strings } from "@/strings";

import { PdfViewer } from "../PdfViewer";

/**
 * react-pdf stands in here: pdf.js needs a canvas and a worker that jsdom
 * does not have. The fake Document loads (or fails) on mount and renders its
 * children; the fake Page reports its render like react-pdf does.
 */
const pdf = vi.hoisted(() => ({
  numPages: 2,
  failWith: null as unknown,
  documentProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/pdfjs", () => ({}));

vi.mock("react-pdf", () => {
  interface FakeDocumentProps {
    readonly children?: ReactNode;
    readonly onLoadSuccess?: (document: { numPages: number }) => void;
    readonly onLoadError?: (error: unknown) => void;
    readonly [key: string]: unknown;
  }
  function Document(props: FakeDocumentProps) {
    const { onLoadSuccess, onLoadError } = props;
    pdf.documentProps.push(props);
    useEffect(() => {
      if (pdf.failWith) onLoadError?.(pdf.failWith);
      else onLoadSuccess?.({ numPages: pdf.numPages });
    }, [onLoadError, onLoadSuccess]);
    return <div data-testid="document">{pdf.failWith ? null : props.children}</div>;
  }
  interface FakePageProps {
    readonly pageNumber: number;
    readonly width?: number;
    readonly onRenderSuccess?: (page: { pageNumber: number }) => void;
  }
  function Page({ pageNumber, width, onRenderSuccess }: FakePageProps) {
    useEffect(() => {
      onRenderSuccess?.({ pageNumber });
    }, [onRenderSuccess, pageNumber]);
    return <div data-testid="page" data-page={pageNumber} data-width={width} />;
  }
  return { Document, Page };
});

const copy = strings.viewer;
const URL_1 = "https://storage.example.com/signed-get";

/**
 * A ResizeObserver that reports the width the test sets. On a 390 px phone the
 * stage is 340 px: the page's 16 px gutters, the frame's 1 px border and its 8 px padding.
 */
const PHONE_STAGE = 340;
const resize = vi.hoisted(() => ({ width: 0, callbacks: [] as Array<(width: number) => void> }));

class FakeResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {
    const report = (width: number) =>
      this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    resize.callbacks.push(report);
    report(resize.width);
  }
  disconnect() {}
  unobserve() {}
}

let clock = 0;

function renderViewer(props: Partial<Parameters<typeof PdfViewer>[0]> = {}) {
  return render(
    <PdfViewer url={URL_1} title="Example deck" onLoadError={vi.fn()} actions={<button type="button">Download</button>} {...props} />,
  );
}

const page = () => screen.getByTestId("page");

beforeEach(() => {
  pdf.numPages = 2;
  pdf.failWith = null;
  pdf.documentProps = [];
  resize.width = PHONE_STAGE;
  resize.callbacks = [];
  clock = 0;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the PDF viewer", () => {
  it("loads the link with eval off and the whole file in one request", () => {
    renderViewer();
    const props = pdf.documentProps.at(-1);
    expect(props?.file).toBe(URL_1);
    expect(props?.options).toEqual({ isEvalSupported: false, disableRange: true });
  });

  it("shows page 1 of M, fitted to the phone's width, with the toolbar's Download", () => {
    renderViewer();
    expect(page()).toHaveAttribute("data-page", "1");
    expect(page()).toHaveAttribute("data-width", String(PHONE_STAGE));
    const toolbar = within(screen.getByRole("toolbar", { name: copy.toolbarLabel }));
    expect(toolbar.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(toolbar.getByRole("button", { name: copy.previous })).toBeDisabled();
    expect(toolbar.getByRole("button", { name: copy.next })).toBeEnabled();
    expect(toolbar.getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: copy.pageLabel("Example deck", 1, 2) })).toBeInTheDocument();
  });

  it("re-fits when the screen changes, never wider than 900 px", () => {
    renderViewer();
    act(() => resize.callbacks.forEach((report) => report(1400)));
    expect(page()).toHaveAttribute("data-width", "900");
    act(() => resize.callbacks.forEach((report) => report(600)));
    expect(page()).toHaveAttribute("data-width", "600");
  });

  it("turns the page with next and previous, and stops at the ends", () => {
    renderViewer();
    fireEvent.click(screen.getByRole("button", { name: copy.next }));
    expect(page()).toHaveAttribute("data-page", "2");
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.next })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: copy.previous }));
    expect(page()).toHaveAttribute("data-page", "1");
  });

  it("turns the page with the arrow keys, but not while typing or with a modifier", () => {
    renderViewer();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(page()).toHaveAttribute("data-page", "2");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(page()).toHaveAttribute("data-page", "2");
    fireEvent.keyDown(window, { key: "ArrowLeft", metaKey: true });
    expect(page()).toHaveAttribute("data-page", "2");
    const field = document.createElement("input");
    document.body.append(field);
    fireEvent.keyDown(field, { key: "ArrowLeft" });
    expect(page()).toHaveAttribute("data-page", "2");
    field.remove();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(page()).toHaveAttribute("data-page", "1");
  });

  it("hands a load failure to the page", () => {
    const error = Object.assign(new Error("refused"), { name: "UnexpectedResponseException", status: 403 });
    pdf.failWith = error;
    const onLoadError = vi.fn();
    renderViewer({ onLoadError });
    expect(onLoadError).toHaveBeenCalledWith(error);
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });

  it("reports each page read for at least 1000 ms with its time", () => {
    const onPageVisible = vi.fn();
    const view = renderViewer({ onPageVisible });
    clock = 4200;
    fireEvent.click(screen.getByRole("button", { name: copy.next }));
    expect(onPageVisible).toHaveBeenCalledWith(1, 4200);
    clock = 4900;
    fireEvent.click(screen.getByRole("button", { name: copy.previous }));
    clock = 6400;
    view.unmount();
    expect(onPageVisible.mock.calls).toEqual([
      [1, 4200],
      [1, 1500],
    ]);
  });

  it("ends a visit when the page scrolls under 50% visible", () => {
    const observed: IntersectionObserverCallback[] = [];
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observed.push(callback);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const ratio = (intersectionRatio: number) =>
      act(() => observed.forEach((callback) => callback([{ intersectionRatio } as IntersectionObserverEntry], {} as IntersectionObserver)));
    const onPageVisible = vi.fn();
    renderViewer({ onPageVisible });
    ratio(0.6);
    clock = 3000;
    ratio(0.3);
    expect(onPageVisible).toHaveBeenCalledWith(1, 3000);
    clock = 20_000;
    fireEvent.click(screen.getByRole("button", { name: copy.next }));
    expect(onPageVisible).toHaveBeenCalledTimes(1);
  });

  it("does not count a page while the tab is hidden", () => {
    const onPageVisible = vi.fn();
    renderViewer({ onPageVisible });
    clock = 500;
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    clock = 90_000;
    fireEvent.click(screen.getByRole("button", { name: copy.next }));
    expect(onPageVisible).not.toHaveBeenCalled();
  });
});
