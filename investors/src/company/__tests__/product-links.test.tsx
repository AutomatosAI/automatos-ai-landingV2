import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductLinks } from "../ProductLinks";
import { STATUS_DOT_SHAPES, STATUS_LABELS, type StatusDotShape, type StatusLabel } from "../status";
import { StatusChip } from "../StatusChip";

/*
 * PRD-003 §5.2, written out here so a change to company-data.ts has to change
 * this too. Each mark is the product's folder in the family icon kit: Studio
 * the navigator (os), Go the wheel, Academy the chart room, Markets the
 * weather vane; GitHub has no family icon and keeps its own mark.
 */
const SEE_IT_WORKING = [
  {
    name: "Studio",
    href: "https://studio.automatos.app",
    chip: "BUILDING NOW",
    line: "Hosted beta opens November 2026 · join the waitlist",
    address: "studio.automatos.app",
    mark: "os",
  },
  {
    name: "Automatos Go",
    href: "https://github.com/AutomatosAI/automatos-go",
    chip: "IN BETA",
    line: "The iPhone app · TestFlight beta, by invite",
    address: "github.com/AutomatosAI/automatos-go",
    mark: "go",
  },
  {
    name: "GitHub",
    href: "https://github.com/AutomatosAI/automatos-ai",
    chip: "LIVE",
    line: "Open source, Apache-2.0",
    address: "github.com/AutomatosAI/automatos-ai",
    mark: "github",
  },
] as const;

const ALSO_FROM_AUTOMATOS = [
  {
    name: "Academy",
    href: "https://academy.automatos.app",
    chip: "LIVE",
    line: "Free certification prep, with an AI tutor",
    address: "academy.automatos.app",
    mark: "academy",
  },
  {
    name: "Markets",
    href: "https://markets.automatos.app",
    chip: null,
    line: "Read-only crypto research, free",
    address: "markets.automatos.app",
    mark: "markets",
  },
] as const;

const EXPECTED_SHAPES: [StatusLabel, StatusDotShape, string][] = [
  ["LIVE", "filled", "bg-brand"],
  ["IN BETA", "half", "bg-[linear-gradient(90deg,var(--fg-2)_50%,transparent_50%)]"],
  ["BUILDING NOW", "ring", "border-[color:var(--fg-2)]"],
  ["NEXT, WITH THIS FUNDING", "dashed-ring", "border-dashed"],
];

function renderLinks() {
  render(<ProductLinks />);
  const group = (name: string) => screen.getByRole("region", { name });
  return { seeItWorking: group("See it working"), also: group("Also from Automatos") };
}

/** The card for a product: the whole card is the one link, named first by the product. */
function cardFor(container: HTMLElement, name: string): HTMLElement {
  const card = within(container)
    .getAllByRole("link")
    .find((link) => link.querySelector("span.font-medium")?.textContent === name);
  if (!card) throw new Error(`No card for ${name}`);
  return card;
}

describe("StatusChip", () => {
  it.each(EXPECTED_SHAPES)("shows %s as the register prints it, with a %s dot", (status, shape, drawnWith) => {
    const { container } = render(<StatusChip status={status} />);
    const chip = container.firstElementChild;
    expect(chip).toHaveTextContent(status);
    expect(chip).toHaveAttribute("data-status", status);
    const dot = container.querySelector("[data-shape]");
    expect(dot).toHaveAttribute("data-shape", shape);
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot).toHaveClass("size-2", "rounded-full", drawnWith);
  });

  it("tells the four statuses apart by shape alone", () => {
    expect(Object.keys(STATUS_DOT_SHAPES).sort()).toEqual([...STATUS_LABELS].sort());
    expect(new Set(Object.values(STATUS_DOT_SHAPES)).size).toBe(STATUS_LABELS.length);
    const { container } = render(<StatusChip status="IN BETA" />);
    expect(container.querySelector("[data-shape]")).toHaveClass("border-[color:var(--fg-2)]");
  });

  it("is never orange: the brand colour is the ship's alone", () => {
    for (const status of STATUS_LABELS) {
      const { container, unmount } = render(<StatusChip status={status} />);
      expect(container.querySelector('[class*="ship"]')).toBeNull();
      unmount();
    }
  });
});

describe("ProductLinks", () => {
  it("shows two groups, each under its own h2", () => {
    renderLinks();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["See it working", "Also from Automatos"]);
  });

  it("shows §5.2's cards in §5.2's order, each the one link of its card", () => {
    const { seeItWorking, also } = renderLinks();
    const hrefs = (group: HTMLElement) => within(group).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs(seeItWorking)).toEqual(SEE_IT_WORKING.map((link) => link.href));
    expect(hrefs(also)).toEqual(ALSO_FROM_AUTOMATOS.map((link) => link.href));
  });

  it("gives each card its name, its chip where the register has one, its line and its address", () => {
    const { seeItWorking, also } = renderLinks();
    const groups = [
      [seeItWorking, SEE_IT_WORKING],
      [also, ALSO_FROM_AUTOMATOS],
    ] as const;
    for (const [group, links] of groups) {
      for (const expected of links) {
        const card = cardFor(group, expected.name);
        expect(card).toHaveTextContent(expected.line);
        expect(card).toHaveTextContent(expected.address);
        expect(card.textContent).not.toMatch(/https?:/);
        const chip = card.querySelector("[data-status]");
        if (expected.chip === null) expect(chip, expected.name).toBeNull();
        else expect(chip, expected.name).toHaveTextContent(expected.chip);
      }
    }
  });

  it("chips Studio BUILDING NOW, Go IN BETA, GitHub and Academy LIVE, Markets none, with each status's dot", () => {
    const { seeItWorking, also } = renderLinks();
    const shapeOf = (group: HTMLElement, name: string) =>
      cardFor(group, name).querySelector("[data-shape]")?.getAttribute("data-shape") ?? null;
    expect(shapeOf(seeItWorking, "Studio")).toBe("ring");
    expect(shapeOf(seeItWorking, "Automatos Go")).toBe("half");
    expect(shapeOf(seeItWorking, "GitHub")).toBe("filled");
    expect(shapeOf(also, "Academy")).toBe("filled");
    expect(shapeOf(also, "Markets")).toBeNull();
  });

  it("opens every product in a new tab with rel noopener noreferrer", () => {
    renderLinks();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(SEE_IT_WORKING.length + ALSO_FROM_AUTOMATOS.length);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("breaks an address only after a slash, keeping the arrow on the last segment's line", () => {
    const { seeItWorking, also } = renderLinks();
    const go = cardFor(seeItWorking, "Automatos Go");
    expect(go.querySelectorAll("wbr")).toHaveLength(2);
    for (const wbr of go.querySelectorAll("wbr")) expect(wbr.previousElementSibling?.textContent).toMatch(/\/$/);
    const lastSegment = [...go.querySelectorAll("span.whitespace-nowrap")].at(-1);
    expect(lastSegment?.textContent).toBe("automatos-go");
    expect(lastSegment?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(cardFor(also, "Academy").querySelectorAll("wbr")).toHaveLength(0);
  });

  it("puts each product's family tile on its card, hidden from assistive tech, smaller in the second group", () => {
    const { seeItWorking, also } = renderLinks();
    const groups = [
      [seeItWorking, SEE_IT_WORKING, "size-11"],
      [also, ALSO_FROM_AUTOMATOS, "size-8"],
    ] as const;
    for (const [group, links, size] of groups) {
      for (const expected of links) {
        const card = cardFor(group, expected.name);
        const tiles = card.querySelectorAll("[data-mark]");
        expect(tiles, expected.name).toHaveLength(1);
        const tile = tiles[0];
        expect(tile, expected.name).toHaveAttribute("data-mark", expected.mark);
        expect(tile, expected.name).toHaveAttribute("aria-hidden", "true");
        expect(tile, expected.name).toHaveClass(size);
        expect(tile?.querySelectorAll("svg")).toHaveLength(1);
        // Every svg on the card (the tile, the address's arrow) is hidden from assistive tech.
        for (const svg of card.querySelectorAll("svg")) expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
        // The orange is the tile's alone on the card: no flat brand colour beside it.
        expect(card.querySelector('[class*="ship"]'), expected.name).toBeNull();
      }
    }
  });

  it("gives every tile on the page its own gradient", () => {
    const { container } = render(<ProductLinks />);
    const ids = [...container.querySelectorAll("[data-mark]")].map(
      (tile) => tile.getElementsByTagName("linearGradient")[0]?.id ?? "",
    );
    expect(ids).toHaveLength(SEE_IT_WORKING.length + ALSO_FROM_AUTOMATOS.length);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
