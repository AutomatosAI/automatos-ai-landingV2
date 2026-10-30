import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COVER_IMAGE, FOUNDER_PHOTO } from "../brand-images";
import { FounderAvatar, type FounderAvatarSize } from "../FounderAvatar";
import { ShipMark, ShipTile, type ShipTileSize } from "../ShipMark";

const AVATAR_SIZES: readonly FounderAvatarSize[] = ["card", "header"];
const TILE_SIZES: readonly ShipTileSize[] = ["company", "header", "product", "productSmall"];

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

describe("ShipTile", () => {
  it.each(TILE_SIZES)("holds the ship, white on the brand orange, hidden from assistive tech (%s)", (size) => {
    const { container } = render(<ShipTile size={size} />);
    const tile = container.firstElementChild;
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile).toHaveClass("bg-ship", "text-white");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expectEverySvgHidden(container);
  });

  it("holds a product's own icon in place of the ship, still hidden", () => {
    const { container } = render(
      <ShipTile size="product">
        <svg data-testid="product-icon" viewBox="0 0 24 24" />
      </ShipTile>,
    );
    expect(screen.getByTestId("product-icon")).toBeInTheDocument();
    expect(container.querySelector('svg[viewBox="0 0 256 256"]')).toBeNull();
    expectEverySvgHidden(container);
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
