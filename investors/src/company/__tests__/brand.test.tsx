import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COVER_IMAGE, FOUNDER_PHOTO } from "../brand-images";
import { FamilyTile, type FamilyMark, type FamilyTileSize } from "../FamilyTile";
import { FounderAvatar, type FounderAvatarSize } from "../FounderAvatar";
import { SHIP_PATH, ShipMark } from "../ShipMark";

const AVATAR_SIZES: readonly FounderAvatarSize[] = ["card", "header"];
const TILE_SIZES: readonly FamilyTileSize[] = ["company", "header", "product", "productSmall"];
const MARKS: readonly FamilyMark[] = ["ai", "os", "go", "academy", "markets", "github"];

/*
 * One shape each mark alone has, written out from the kit's favicon.svg in
 * that product's folder (automatos-ai, -os, -go, -academy, -markets), so the
 * tiles are checked against the kit, not against themselves. GitHub has no
 * family icon: its mark is lucide's.
 */
const KIT_SHAPES: Readonly<Record<FamilyMark, string>> = {
  ai: 'path[d^="M160.99 204.507L69.0508 205.138L62.0811 188.532L194.972 177.929"]',
  os: 'path[d="M128 40L147 109L216 128L147 147L128 216L109 147L40 128L109 109Z"]',
  go: 'g[transform="rotate(315 128 128)"] > rect[x="120.5"][y="56"][width="15"][height="72"]',
  academy: 'path[d="M108 62L148 78V198L108 182Z"]',
  markets: 'path[d="M46 60L102 84V100L46 124L64 92Z"]',
  github: 'path[d="M9 18c-4.51 2-5-2-7-2"]',
};

/** The kit's tile gradient, as each favicon.svg writes it (its id aside). */
const KIT_GRADIENT = { x1: "205.813", y1: "272.744", x2: "98.7565", y2: "-15.4346", gradientUnits: "userSpaceOnUse" };

/**
 * A tile's gradient. By tag name, not a selector: jsdom's selector engine
 * does not reliably match camel-case svg names such as linearGradient.
 */
const gradientIn = (element: Element) => element.getElementsByTagName("linearGradient")[0];

/** Every svg sits inside an aria-hidden subtree, so assistive tech never meets it. */
function expectEverySvgHidden(container: HTMLElement) {
  const svgs = [...container.querySelectorAll("svg")];
  expect(svgs.length).toBeGreaterThan(0);
  for (const svg of svgs) expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
}

describe("the pictures", () => {
  it("are bundled with the app, not read from the site's /images/", () => {
    expect(COVER_IMAGE.src).toContain("cover-ship");
    expect(FOUNDER_PHOTO.src).toContain("gerard-avatar");
    for (const { src } of [COVER_IMAGE, FOUNDER_PHOTO]) expect(src).not.toMatch(/^\/images\//);
  });

  it("carry the files' own sizes", () => {
    expect([COVER_IMAGE.width, COVER_IMAGE.height]).toEqual([1408, 768]);
    expect([FOUNDER_PHOTO.width, FOUNDER_PHOTO.height]).toEqual([236, 236]);
  });
});

describe("ShipMark", () => {
  it("is the favicon's ship alone, in the colour around it", () => {
    const { container } = render(<ShipMark />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 256 256");
    expect(container.querySelectorAll("path")).toHaveLength(1);
    expect(container.querySelector("path")).toHaveAttribute("fill", "currentColor");
  });

  it("renders no metadata element, gradient or rounded square", () => {
    const { container } = render(<ShipMark />);
    expect(container.querySelector("metadata")).toBeNull();
    expect(container.querySelector("defs, linearGradient, rect")).toBeNull();
  });

  it("is hidden from assistive tech", () => {
    const { container } = render(<ShipMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("FamilyTile", () => {
  it.each(MARKS)("draws the kit's %s mark, and no other", (mark) => {
    const { container } = render(<FamilyTile mark={mark} size="product" />);
    expect(container.querySelector(KIT_SHAPES[mark])).not.toBeNull();
    for (const other of MARKS.filter((candidate) => candidate !== mark)) {
      expect(container.querySelector(KIT_SHAPES[other]), other).toBeNull();
    }
  });

  it("draws the company's tile with ShipMark's ship, in white", () => {
    const { container } = render(<FamilyTile mark="ai" size="company" />);
    expect(container.querySelector(`path[d="${SHIP_PATH}"]`)).toHaveAttribute("fill", "#fff");
  });

  it.each(MARKS)("is the kit's tile under the %s mark: its gradient in the 256 square with the 48 corner", (mark) => {
    const { container } = render(<FamilyTile mark={mark} size="product" />);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 256 256");
    const gradient = gradientIn(container);
    for (const [name, value] of Object.entries(KIT_GRADIENT)) expect(gradient).toHaveAttribute(name, value);
    const stops = [...container.querySelectorAll("stop")].map((stop) => [
      stop.getAttribute("offset"),
      stop.getAttribute("stop-color"),
    ]);
    expect(stops).toEqual([
      [null, "#D53B00"],
      ["1", "#FF6A02"],
    ]);
    const square = container.querySelector("svg > rect");
    expect(square).toHaveAttribute("width", "256");
    expect(square).toHaveAttribute("height", "256");
    expect(square).toHaveAttribute("rx", "48");
    expect(square).toHaveAttribute("fill", `url(#${gradient?.id})`);
    expect(container.querySelector("metadata")).toBeNull();
  });

  it.each(TILE_SIZES)("is hidden from assistive tech at the %s size, whatever its mark", (size) => {
    for (const mark of MARKS) {
      const { container, unmount } = render(<FamilyTile mark={mark} size={size} />);
      const tile = container.firstElementChild;
      expect(tile, mark).toHaveAttribute("aria-hidden", "true");
      expect(tile, mark).toHaveAttribute("data-mark", mark);
      expect(tile, mark).toHaveClass("rounded-[18.75%]");
      expect(container.querySelectorAll("svg")).toHaveLength(1);
      expectEverySvgHidden(container);
      unmount();
    }
  });

  it("sizes the tile as the mock does: 76, 56, 44 and 32 px", () => {
    const boxes = TILE_SIZES.map((size) => {
      const { container, unmount } = render(<FamilyTile mark="os" size={size} />);
      const box = [...(container.firstElementChild?.classList ?? [])].find((name) => name.startsWith("size-"));
      unmount();
      return box;
    });
    expect(boxes).toEqual(["size-[76px]", "size-14", "size-11", "size-8"]);
  });

  it("gives each tile its own gradient id, which its square and its cut-outs fill with", () => {
    const { container } = render(
      <>
        <FamilyTile mark="os" size="product" />
        <FamilyTile mark="os" size="product" />
        <FamilyTile mark="academy" size="productSmall" />
      </>,
    );
    const tiles = [...container.querySelectorAll("[data-mark]")];
    const ids = tiles.map((tile) => gradientIn(tile)?.id ?? "");
    expect(new Set(ids).size).toBe(tiles.length);
    for (const id of ids) expect(id).toMatch(/^[\w-]+$/);
    tiles.forEach((tile, index) => {
      const filled = [...tile.querySelectorAll('[fill^="url("]')].map((shape) => shape.getAttribute("fill"));
      // The square, then the cut-out the kit fills url(#g): the compass's centre, the chart room's star.
      expect(filled).toEqual([`url(#${ids[index]})`, `url(#${ids[index]})`]);
    });
    expect(container.querySelector("#g")).toBeNull();
  });
});

describe("FounderAvatar", () => {
  it.each(AVATAR_SIZES)("shows the bundled photo with its alt text (%s)", (size) => {
    render(<FounderAvatar size={size} />);
    const photo = screen.getByRole("img", { name: "Gerard Kavanagh" });
    expect(photo).toHaveAttribute("alt", "Gerard Kavanagh");
    expect(photo).toHaveAttribute("src", FOUNDER_PHOTO.src);
  });

  it.each(AVATAR_SIZES)("hides the badge and its ship mark from assistive tech (%s)", (size) => {
    const { container } = render(<FounderAvatar size={size} />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    const badge = container.querySelector(".bg-ship");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(badge?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expectEverySvgHidden(container);
  });
});
