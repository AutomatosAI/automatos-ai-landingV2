/**
 * The site's way into the portal (W2-08): privacy.html's investor-portal
 * section and its entry in the page's aside, the footer's Company link, and
 * the app's tracking notice pointing at that section. Read as text: these
 * are static files the site serves as they are.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SECTION_HEADING = '<h2 id="investors"><span class="num">Section 07</span>Investor <em>portal</em></h2>';

/** @param {string} path */
const readRepoFile = (path) => readFile(`${REPO_ROOT}${path}`, "utf8");

/**
 * The text between the investor-portal heading and the end of the page's prose.
 * @param {string} html
 */
function investorSection(html) {
  const start = html.indexOf(SECTION_HEADING);
  return html.slice(start, html.indexOf("</div>", start));
}

/**
 * [label, href] of each link in one footer column, in order.
 * @param {string} footer
 * @param {string} title
 */
function footerColumnLinks(footer, title) {
  const column = footer.match(new RegExp(`title: '${title}',\\s*links: \\[([\\s\\S]*?)\\]`));
  if (!column?.[1]) throw new Error(`no footer column ${title}`);
  return [...column[1].matchAll(/label: '([^']+)', href: '([^']+)'/g)].map((m) => [m[1], m[2]]);
}

/** @type {string} */
let privacy;
/** @type {string} */
let footer;
/** @type {string} */
let appStrings;
beforeAll(async () => {
  [privacy, footer, appStrings] = await Promise.all([
    readRepoFile("privacy.html"),
    readRepoFile("_footer.js"),
    readRepoFile("investors/src/strings.ts"),
  ]);
});

describe("privacy.html", () => {
  it("has one investor-portal section, after Section 06, in the page's markup", () => {
    expect(privacy.split('id="investors"')).toHaveLength(2);
    expect(privacy.indexOf(SECTION_HEADING)).toBeGreaterThan(privacy.indexOf('<h2 id="s6">'));
    expect(privacy.indexOf(SECTION_HEADING)).toBeLessThan(privacy.indexOf("</article>"));
  });

  it("lists the section in the aside, after Contact us", () => {
    const entry = '<a href="#investors">07 · Investor portal</a>';
    expect(privacy).toContain(entry);
    expect(privacy.indexOf(entry)).toBeGreaterThan(privacy.indexOf('<a href="#s6">'));
    expect(privacy.indexOf(entry)).toBeLessThan(privacy.indexOf("</aside>"));
  });

  it("says what is recorded, why, who sees it, how long it is kept and how to get it or delete it", () => {
    const section = investorSection(privacy);
    for (const words of [
      "your profile",
      "documents you open or download",
      "how long you spend on each page",
      "your visits",
      "follow up with interested investors",
      "legitimate interest",
      "Automatos team members who run the portal",
      "24 months after your last visit",
      '<a href="mailto:privacy@automatos.app">privacy@automatos.app</a>',
    ]) {
      expect(section).toContain(words);
    }
  });
});

describe("_footer.js", () => {
  it("links the portal from the Company column, after Contact", () => {
    expect(footerColumnLinks(footer, "Company")).toEqual([
      ["Field notes", "/field-notes"],
      ["Research", "/research"],
      ["Enterprise", "/#editions"],
      ["Contact", "/contact"],
      ["Investors", "/investors"],
    ]);
  });
});

describe("the app's tracking notice", () => {
  it("links the investor-portal section of the privacy policy", () => {
    const href = appStrings.match(/policyHref: "([^"]+)"/)?.[1];
    expect(href).toBe("/privacy#investors");
    expect(privacy).toContain(`id="${href?.split("#")[1]}"`);
  });
});
