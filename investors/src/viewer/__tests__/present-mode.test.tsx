import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { strings } from "@/strings";

import { PdfViewer } from "../PdfViewer";
import { SLIDE_FADE } from "../present-motion";
import { useArrowKeys } from "../use-arrow-keys";
import { useFocusTrap } from "../use-focus-trap";

/**
 * react-pdf stands in (pdf.js needs a canvas and a worker jsdom lacks): the
 * fake Document loads on mount and counts its mounts, the fake Page reports
 * its own size (800 x 600) and its render like react-pdf does.
 */
const pdf = vi.hoisted(() => ({ numPages: 3, mounts: 0 }));

vi.mock("@/lib/pdfjs", () => ({}));

vi.mock("react-pdf", () => {
  interface FakeDocumentProps {
    readonly children?: ReactNode;
    readonly onLoadSuccess?: (document: { numPages: number }) => void;
  }
  function Document({ children, onLoadSuccess }: FakeDocumentProps) {
    useEffect(() => {
      pdf.mounts += 1;
    }, []);
    useEffect(() => onLoadSuccess?.({ numPages: pdf.numPages }), [onLoadSuccess]);
    return <div data-testid="document">{children}</div>;
  }
  interface FakePageProps {
    readonly pageNumber: number;
    readonly width?: number;
    readonly className?: string;
    readonly onLoadSuccess?: (page: { getViewport: () => { width: number; height: number } }) => void;
    readonly onRenderSuccess?: (page: { pageNumber: number }) => void;
  }
  function Page({ pageNumber, width, className, onLoadSuccess, onRenderSuccess }: FakePageProps) {
    useEffect(() => onLoadSuccess?.({ getViewport: () => ({ width: 800, height: 600 }) }), [onLoadSuccess, pageNumber]);
    useEffect(() => onRenderSuccess?.({ pageNumber }), [onRenderSuccess, pageNumber]);
    return <div data-testid="page" data-page={pageNumber} data-width={width} className={className} />;
  }
  return { Document, Page };
});

/** Every observed box is 1000 x 500: an 800 x 600 slide fits it at 5/6, 666 px wide. */
class FakeResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ contentRect: { width: 1000, height: 500 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  disconnect() {}
  unobserve() {}
}

/** jsdom has no PointerEvent: a MouseEvent with the pointer's fields. */
class FakePointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;
  readonly pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
    this.pointerType = init.pointerType ?? "touch";
  }
}

/** The Fullscreen API, which jsdom lacks: grants (or refuses) and fires fullscreenchange like a browser. */
function fakeFullscreen({ grant = true } = {}) {
  let element: Element | null = null;
  const change = (next: Element | null) => {
    element = next;
    document.dispatchEvent(new Event("fullscreenchange"));
  };
  const request = vi.fn(function (this: Element) {
    if (!grant) return Promise.reject(new TypeError("refused"));
    change(this);
    return Promise.resolve();
  });
  const exit = vi.fn(() => {
    change(null);
    return Promise.resolve();
  });
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => true });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => element });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: request });
  /** The browser left full screen on its own (Esc, its UI). */
  const leave = () => act(() => change(null));
  return { request, exit, leave };
}

function removeFullscreen() {
  for (const name of ["fullscreenEnabled", "fullscreenElement", "exitFullscreen"]) Reflect.deleteProperty(document, name);
  Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
}

const copy = strings.viewer;
const present = copy.present;
const TITLE = "Example deck";
let clock = 0;

function renderViewer(props: Partial<Parameters<typeof PdfViewer>[0]> = {}) {
  return render(
    <PdfViewer url="https://storage.example.com/signed-get" title={TITLE} onLoadError={vi.fn()} actions={<button type="button">Download</button>} {...props} />,
  );
}

const slideshow = () => screen.queryByRole("dialog", { name: present.label(TITLE) });
const bar = () => within(screen.getByRole("toolbar", { name: present.toolbarLabel }));
const page = () => screen.getByTestId("page");
const key = (name: string) => fireEvent.keyDown(window, { key: name });
const startPresenting = () => fireEvent.click(screen.getByRole("button", { name: present.start }));

beforeEach(() => {
  pdf.numPages = 3;
  pdf.mounts = 0;
  clock = 0;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.stubGlobal("PointerEvent", FakePointerEvent);
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => {
  removeFullscreen();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("present mode", () => {
  it("starts from the toolbar: one slide, fit whole, in the overlay with its own bar", () => {
    renderViewer();
    expect(slideshow()).not.toBeInTheDocument();
    startPresenting();
    expect(slideshow()).toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: copy.toolbarLabel })).not.toBeInTheDocument();
    expect(bar().getByText("Slide 1 of 3")).toBeInTheDocument();
    expect(bar().getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(bar().getByRole("button", { name: present.exitLabel })).toBeInTheDocument();
    expect(bar().queryByRole("button", { name: present.fullscreen })).not.toBeInTheDocument();
    expect(page()).toHaveAttribute("data-width", "666");
    expect(screen.getByRole("img", { name: present.slideLabel(TITLE, 1, 3) })).toBeInTheDocument();
  });

  it("keeps the one document loaded, so presenting asks for no other link", () => {
    renderViewer();
    startPresenting();
    fireEvent.click(bar().getByRole("button", { name: present.exitLabel }));
    startPresenting();
    expect(pdf.mounts).toBe(1);
  });

  it("goes full screen on the viewer itself, and leaves present mode when the browser leaves full screen", () => {
    const fullscreen = fakeFullscreen();
    const onPresentExit = vi.fn();
    renderViewer({ onPresentExit });
    startPresenting();
    expect(fullscreen.request).toHaveBeenCalledTimes(1);
    expect(fullscreen.request.mock.contexts[0]).toBe(slideshow());
    expect(bar().queryByRole("button", { name: present.fullscreen })).not.toBeInTheDocument();
    fullscreen.leave();
    expect(slideshow()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: present.start })).toHaveFocus();
    expect(onPresentExit).toHaveBeenCalledTimes(1);
  });

  it("stays in the overlay when full screen is refused, and offers it again", async () => {
    const fullscreen = fakeFullscreen({ grant: false });
    renderViewer();
    startPresenting();
    await act(async () => undefined);
    expect(fullscreen.request).toHaveBeenCalledTimes(1);
    expect(slideshow()).toBeInTheDocument();
    expect(bar().getByRole("button", { name: present.fullscreen })).toBeInTheDocument();
  });

  it("Exit leaves full screen and present mode, heard once", () => {
    const fullscreen = fakeFullscreen();
    const onPresentExit = vi.fn();
    renderViewer({ onPresentExit });
    startPresenting();
    fireEvent.click(bar().getByRole("button", { name: present.exitLabel }));
    expect(fullscreen.exit).toHaveBeenCalledTimes(1);
    expect(slideshow()).not.toBeInTheDocument();
    expect(onPresentExit).toHaveBeenCalledTimes(1);
  });

  it("starts in the overlay when asked by the address; its Full screen button asks the browser", () => {
    const fullscreen = fakeFullscreen();
    renderViewer({ present: true });
    expect(slideshow()).toBeInTheDocument();
    expect(fullscreen.request).not.toHaveBeenCalled();
    fireEvent.click(bar().getByRole("button", { name: present.fullscreen }));
    expect(fullscreen.request).toHaveBeenCalledTimes(1);
    expect(bar().queryByRole("button", { name: present.fullscreen })).not.toBeInTheDocument();
  });

  it("moves with the keys, once per key, and Esc leaves", () => {
    const onPresentExit = vi.fn();
    renderViewer({ present: true, onPresentExit });
    const steps: ReadonlyArray<readonly [string, string]> = [
      ["ArrowRight", "2"],
      ["PageDown", "3"],
      ["ArrowLeft", "2"],
      ["PageUp", "1"],
      [" ", "2"],
      ["Enter", "3"],
      ["Backspace", "2"],
      ["Home", "1"],
      ["End", "3"],
    ];
    for (const [name, expected] of steps) {
      key(name);
      expect(page()).toHaveAttribute("data-page", expected);
    }
    expect(bar().getByText("Slide 3 of 3")).toBeInTheDocument();
    key("Escape");
    expect(slideshow()).not.toBeInTheDocument();
    expect(onPresentExit).toHaveBeenCalledTimes(1);
    key("ArrowLeft");
    expect(page()).toHaveAttribute("data-page", "2");
  });

  it("leaves Enter on a focused button to the button", () => {
    renderViewer({ present: true });
    const exit = bar().getByRole("button", { name: present.exitLabel });
    exit.focus();
    fireEvent.keyDown(exit, { key: "Enter" });
    expect(page()).toHaveAttribute("data-page", "1");
  });

  it("moves with swipes of 50 px and taps on the outer thirds", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 390, height: 844 } as DOMRect);
    renderViewer({ present: true });
    const gesture = (from: { x: number; y: number }, to: { x: number; y: number }, init: PointerEventInit = {}) => {
      fireEvent.pointerDown(page(), { clientX: from.x, clientY: from.y, ...init });
      fireEvent.pointerUp(page(), { clientX: to.x, clientY: to.y, ...init });
    };
    gesture({ x: 300, y: 400 }, { x: 200, y: 410 });
    expect(page()).toHaveAttribute("data-page", "2");
    gesture({ x: 100, y: 400 }, { x: 200, y: 400 });
    expect(page()).toHaveAttribute("data-page", "1");
    gesture({ x: 300, y: 400 }, { x: 260, y: 400 });
    gesture({ x: 300, y: 200 }, { x: 200, y: 500 });
    gesture({ x: 300, y: 400 }, { x: 100, y: 400 }, { isPrimary: false });
    expect(page()).toHaveAttribute("data-page", "1");
    gesture({ x: 350, y: 400 }, { x: 352, y: 402 });
    expect(page()).toHaveAttribute("data-page", "2");
    gesture({ x: 195, y: 400 }, { x: 195, y: 400 });
    expect(page()).toHaveAttribute("data-page", "2");
    gesture({ x: 20, y: 400 }, { x: 20, y: 400 });
    expect(page()).toHaveAttribute("data-page", "1");
    fireEvent.pointerDown(page(), { clientX: 300, clientY: 400 });
    fireEvent.pointerCancel(page());
    fireEvent.pointerUp(page(), { clientX: 100, clientY: 400 });
    expect(page()).toHaveAttribute("data-page", "1");
  });

  it("fades the bar after 3 s without input, keeps it while the mouse rests on it, and brings it back on input", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderViewer({ present: true });
    const shell = () => screen.getByRole("toolbar", { name: present.toolbarLabel }).parentElement;
    expect(shell()).toHaveClass("opacity-100");
    act(() => vi.advanceTimersByTime(3000));
    expect(shell()).toHaveClass("opacity-0");
    expect(slideshow()).toHaveClass("cursor-none");
    fireEvent.pointerMove(window);
    expect(shell()).toHaveClass("opacity-100");
    fireEvent.pointerEnter(shell() as HTMLElement, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(10_000));
    expect(shell()).toHaveClass("opacity-100");
    fireEvent.pointerLeave(shell() as HTMLElement, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(3000));
    expect(shell()).toHaveClass("opacity-0");
    key("ArrowRight");
    expect(shell()).toHaveClass("opacity-100");
  });

  it("reports each slide seen through the viewer's page events (KP20)", () => {
    const onPageVisible = vi.fn();
    renderViewer({ present: true, onPageVisible });
    clock = 2500;
    key("ArrowRight");
    clock = 4000;
    key("ArrowRight");
    expect(onPageVisible.mock.calls).toEqual([
      [1, 2500],
      [2, 1500],
    ]);
  });

  it("fades slides in only when motion is allowed, and only in present mode", () => {
    renderViewer();
    expect(page().className).not.toContain(SLIDE_FADE);
    startPresenting();
    expect(page().className).toContain(SLIDE_FADE);
  });

  it("shows a failed download's message in present mode, where the page's own is hidden", () => {
    renderViewer({ present: true, notice: "The download could not start." });
    expect(within(slideshow() as HTMLElement).getByRole("alert")).toHaveTextContent("The download could not start.");
  });
});

const OUTSIDE_LINK = "Back to documents";
const OUTSIDE_BUTTON = "Account";

/** The slideshow over a page with a link before it and a button after it, as the header and Back are. */
function renderOnPage() {
  return render(
    <>
      <a href="/">{OUTSIDE_LINK}</a>
      <PdfViewer url="https://storage.example.com/signed-get" title={TITLE} onLoadError={vi.fn()} actions={<button type="button">Download</button>} present />
      <button type="button">{OUTSIDE_BUTTON}</button>
    </>,
  );
}

const tab = (target: Element, shiftKey = false) => fireEvent.keyDown(target, { key: "Tab", shiftKey });
const outsideLink = () => screen.getByRole("link", { name: OUTSIDE_LINK });

describe("present mode keeps focus inside the slideshow (W3-RVW-1)", () => {
  it("Tab from Exit goes round to the first enabled control, past the disabled Previous", () => {
    renderOnPage();
    const exit = bar().getByRole("button", { name: present.exitLabel });
    act(() => exit.focus());
    expect(tab(exit)).toBe(false);
    expect(bar().getByRole("button", { name: present.previous })).toBeDisabled();
    expect(bar().getByRole("button", { name: present.next })).toHaveFocus();
  });

  it("Shift+Tab from the slideshow itself, focused on entry, goes to Exit", () => {
    renderOnPage();
    const frame = slideshow() as HTMLElement;
    expect(frame).toHaveFocus();
    tab(frame, true);
    expect(bar().getByRole("button", { name: present.exitLabel })).toHaveFocus();
  });

  it("brings focus that lands on the page underneath back into the slideshow", () => {
    renderOnPage();
    act(() => outsideLink().focus());
    expect(slideshow()).toHaveFocus();
    act(() => screen.getByRole("button", { name: OUTSIDE_BUTTON }).focus());
    expect(slideshow()).toHaveFocus();
  });

  it("lets go after Exit: the page's link keeps focus and Tab is the browser's again", () => {
    renderOnPage();
    fireEvent.click(bar().getByRole("button", { name: present.exitLabel }));
    expect(screen.getByRole("button", { name: present.start })).toHaveFocus();
    act(() => outsideLink().focus());
    expect(outsideLink()).toHaveFocus();
    expect(tab(outsideLink())).toBe(true);
    expect(outsideLink()).toHaveFocus();
  });

  it("listens only while active, and stops on unmount", () => {
    const inside = document.body.appendChild(document.createElement("div"));
    const outside = document.body.appendChild(document.createElement("button"));
    inside.tabIndex = -1;
    const hook = renderHook(({ active }) => useFocusTrap(inside, active), { initialProps: { active: false } });
    act(() => outside.focus());
    expect(outside).toHaveFocus();
    act(() => outside.blur());
    hook.rerender({ active: true });
    act(() => outside.focus());
    expect(inside).toHaveFocus();
    hook.unmount();
    act(() => outside.focus());
    expect(outside).toHaveFocus();
    expect(tab(outside)).toBe(true);
    inside.remove();
    outside.remove();
  });
});

const barShell = () => screen.getByRole("toolbar", { name: present.toolbarLabel }).parentElement as HTMLElement;
const idle = (ms = 3000) => act(() => vi.advanceTimersByTime(ms));
const focusSlideshow = () => act(() => (slideshow() as HTMLElement).focus());

/** Present mode on fake timers, then Tab from the slideshow onto the bar's first enabled control. */
function tabOntoBar() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  renderViewer({ present: true });
  tab(slideshow() as HTMLElement);
  expect(bar().getByRole("button", { name: present.next })).toHaveFocus();
}

describe("keyboard focus keeps the present bar shown (W3-RVW-3)", () => {
  it("stays shown while a key brought focus onto one of its controls", () => {
    tabOntoBar();
    idle(10_000);
    expect(barShell()).toHaveClass("opacity-100");
  });

  it("fades 3 s after focus leaves the bar, or 3 s after the next pointer input", () => {
    tabOntoBar();
    focusSlideshow();
    idle();
    expect(barShell()).toHaveClass("opacity-0");
    tab(slideshow() as HTMLElement);
    idle(10_000);
    expect(barShell()).toHaveClass("opacity-100");
    fireEvent.pointerDown(page(), { clientX: 200, clientY: 400 });
    idle(2999);
    expect(barShell()).toHaveClass("opacity-100");
    idle(1);
    expect(barShell()).toHaveClass("opacity-0");
    expect(bar().getByRole("button", { name: present.next })).toHaveFocus();
  });

  it("fades 3 s after the control with keyboard focus goes, as Full screen does once granted", () => {
    fakeFullscreen();
    tabOntoBar();
    tab(bar().getByRole("button", { name: present.next }));
    tab(bar().getByRole("button", { name: "Download" }));
    const fullscreen = bar().getByRole("button", { name: present.fullscreen });
    expect(fullscreen).toHaveFocus();
    fireEvent.keyDown(fullscreen, { key: "Enter" });
    fireEvent.click(fullscreen);
    expect(fullscreen).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
    idle();
    expect(barShell()).toHaveClass("opacity-0");
  });

  it("keeps the 3 s fade after a press and click on Next, though focus is on the button", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderViewer({ present: true });
    const next = bar().getByRole("button", { name: present.next });
    fireEvent.pointerDown(next);
    act(() => next.focus());
    fireEvent.click(next);
    expect(next).toHaveFocus();
    expect(page()).toHaveAttribute("data-page", "2");
    idle();
    expect(barShell()).toHaveClass("opacity-0");
  });

  it("still holds for the mouse, apart from focus, after keyboard focus leaves the bar", () => {
    tabOntoBar();
    fireEvent.pointerEnter(barShell(), { pointerType: "mouse" });
    focusSlideshow();
    idle(10_000);
    expect(barShell()).toHaveClass("opacity-100");
    fireEvent.pointerLeave(barShell(), { pointerType: "mouse" });
    idle();
    expect(barShell()).toHaveClass("opacity-0");
    fireEvent.pointerEnter(barShell(), { pointerType: "mouse" });
    expect(barShell()).toHaveClass("opacity-100");
    idle(10_000);
    expect(barShell()).toHaveClass("opacity-100");
  });
});

describe("the page's arrow keys", () => {
  it("stand down while present mode has the keys", () => {
    const onStep = vi.fn();
    const hook = renderHook(({ enabled }) => useArrowKeys(onStep, enabled), { initialProps: { enabled: false } });
    key("ArrowRight");
    expect(onStep).not.toHaveBeenCalled();
    hook.rerender({ enabled: true });
    key("ArrowRight");
    expect(onStep).toHaveBeenCalledWith(1);
  });
});
