import { describe, expect, it } from "vitest";

import indexHtml from "../../index.html?raw";
import anchorSvg from "../assets/favicon/favicon.svg?raw";

/*
 * The portal's tab icon: the anchor from the Automatos family icon kit
 * (its automatos-investors folder), bundled with the app. The site root's
 * /favicon.* files are the ship, and server/investors/static.js serves only
 * /investors/assets/* from the build, so index.html names the files in the
 * app's source and the build emits them there, hashed. The build leaves a
 * path it cannot find as written, so these checks read the source.
 */

/** The favicon folder's files, by path from the app's root, as index.html names them. */
const FAVICON_FILES = Object.keys(import.meta.glob("/src/assets/favicon/*"));

/** Every svg file in the app, as text. */
const SVG_SOURCES = import.meta.glob<string>("/src/**/*.svg", { query: "?raw", import: "default", eager: true });

/** The kit's tile, as every family favicon.svg writes it. */
const KIT_TILE = [
  '<linearGradient id="g" x1="205.813" y1="272.744" x2="98.7565" y2="-15.4346" gradientUnits="userSpaceOnUse"><stop stop-color="#D53B00"></stop><stop offset="1" stop-color="#FF6A02"></stop></linearGradient>',
  '<rect width="256" height="256" rx="48" fill="url(#g)"></rect>',
] as const;

/** The anchor's white marks in the kit's automatos-investors favicon.svg, written out here. */
const ANCHOR_MARKS = [
  '<circle cx="128" cy="62" r="15" fill="none" stroke="#fff" stroke-width="13"></circle>',
  '<rect x="90" y="88" width="76" height="14" fill="#fff"></rect>',
  '<rect x="120.5" y="76" width="15" height="128" fill="#fff"></rect>',
  '<path d="M68 150Q128 230 188 150" fill="none" stroke="#fff" stroke-width="16"></path>',
  '<path d="M50 132L88 148L62 172Z" fill="#fff"></path>',
  '<path d="M206 132L168 148L194 172Z" fill="#fff"></path>',
] as const;

interface HeadLink {
  readonly rel: string | null;
  readonly href: string | null;
  readonly type: string | null;
  readonly sizes: string | null;
}

function headLinks(): HeadLink[] {
  const page = new DOMParser().parseFromString(indexHtml, "text/html");
  return [...page.head.querySelectorAll("link")].map((link) => ({
    rel: link.getAttribute("rel"),
    href: link.getAttribute("href"),
    type: link.getAttribute("type"),
    sizes: link.getAttribute("sizes"),
  }));
}

const iconLinks = () => headLinks().filter(({ rel }) => rel === "icon" || rel === "apple-touch-icon");

describe("the portal's head links", () => {
  it("name the anchor's ico and svg, and its apple-touch-icon, in the app's favicon folder", () => {
    expect(iconLinks()).toEqual([
      { rel: "icon", href: "/src/assets/favicon/favicon.ico", type: null, sizes: "48x48" },
      { rel: "icon", href: "/src/assets/favicon/favicon.svg", type: "image/svg+xml", sizes: null },
      { rel: "apple-touch-icon", href: "/src/assets/favicon/apple-touch-icon.png", type: null, sizes: null },
    ]);
  });

  it("name files that exist, so the build bundles each one rather than leaving its path as written", () => {
    for (const { href } of iconLinks()) expect(FAVICON_FILES).toContain(href);
  });

  it("link no manifest and none of the site root's files (the ship's)", () => {
    const links = headLinks();
    expect(links.filter(({ rel }) => rel === "manifest")).toEqual([]);
    for (const { href } of links) expect(href).not.toMatch(/^\/(?:favicon\.|apple-touch-icon|icon-\d|site\.webmanifest)/);
  });
});

describe("the anchor favicon.svg", () => {
  it("is the kit's tile: its gradient in the 256 px square with the 48 corner", () => {
    expect(anchorSvg).toContain('viewBox="0 0 256 256"');
    for (const part of KIT_TILE) expect(anchorSvg).toContain(part);
  });

  it("holds the anchor's white marks", () => {
    for (const mark of ANCHOR_MARKS) expect(anchorSvg).toContain(mark);
  });
});

describe("the app's svg files", () => {
  it("include the anchor, so the check below always has a file to read", () => {
    expect(Object.keys(SVG_SOURCES)).toContain("/src/assets/favicon/favicon.svg");
  });

  it.each(Object.entries(SVG_SOURCES))("carry no C2PA metadata (%s)", (_path, source) => {
    expect(source).not.toMatch(/<metadata\b/i);
    expect(source).not.toMatch(/c2pa:manifest/i);
  });
});
