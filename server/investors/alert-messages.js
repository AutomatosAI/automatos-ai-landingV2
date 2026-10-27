/**
 * The admin alert emails' words (US-017): pure functions from an investor
 * (and a document) to {subject, text, html}. Every value is made one line
 * (a forged line break cannot add a header or a fake line), and every value
 * in the HTML is escaped: the contact form in server.js interpolates raw
 * input, this does not. Each email links to the investor's admin page.
 */

/** The profile's choice lists (routes/me.js) as the app labels them (investors/src/strings.ts). */
const LABELS = Object.freeze({
  investorType: Object.freeze({
    vc: "Venture capital",
    angel: "Angel",
    family_office: "Family office",
    corporate: "Corporate",
    accelerator: "Accelerator",
    other: "Other",
  }),
  chequeSize: Object.freeze({
    lt_50k: "Under 50k",
    "50k_250k": "50k to 250k",
    "250k_1m": "250k to 1M",
    gt_1m: "Over 1M",
  }),
  source: Object.freeze({
    websummit: "Web Summit",
    intro: "An introduction",
    website: "The Automatos website",
    other: "Somewhere else",
  }),
});

const WORDS = Object.freeze({
  signupSubject: "New investor",
  signupIntro: "An investor completed their profile on the investor portal.",
  firstOpenIntro: "An investor opened a document for the first time.",
  name: "Name",
  email: "Email",
  firm: "Firm",
  investorType: "Type",
  chequeSize: "Cheque size",
  source: "Source",
  document: "Document",
  notGiven: "Not given",
  link: "See the investor",
});

/** The admin investor page (the app's adminInvestorPath). */
const ADMIN_INVESTOR_PATH = "/investors/admin/investors/";

const HTML_ENTITIES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });

/**
 * @typedef {import("./auth.js").Investor} Investor
 * @typedef {{id: string, title: string}} AlertDocument
 * @typedef {{subject: string, text: string, html: string}} AlertMessage
 * @typedef {readonly (readonly [string, unknown])[]} Rows label and value pairs
 */

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[/** @type {keyof typeof HTML_ENTITIES} */ (char)]);
}

/**
 * One line: control characters (a line break included) become one space.
 * @param {unknown} value
 */
function oneLine(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim();
}

/** @param {unknown} value */
const orNotGiven = (value) => (value == null || value === "" ? WORDS.notGiven : value);

/**
 * A stored choice as the form showed it; an unknown value as stored.
 * @param {keyof typeof LABELS} list
 * @param {unknown} value
 */
function choice(list, value) {
  const labels = /** @type {Readonly<Record<string, string>>} */ (LABELS[list]);
  return orNotGiven(typeof value === "string" ? (labels[value] ?? value) : value);
}

/**
 * The link to the investor's admin page.
 * @param {string} baseUrl
 * @param {string} investorId
 */
export function investorUrl(baseUrl, investorId) {
  return `${baseUrl}${ADMIN_INVESTOR_PATH}${encodeURIComponent(investorId)}`;
}

/**
 * "Name (Firm)", the email standing in for a missing name (an investor may
 * open a document before the profile form names them).
 * @param {Investor} investor
 */
function who(investor) {
  const name = investor.name || investor.email;
  return investor.firm ? `${name} (${investor.firm})` : name;
}

/**
 * The plain text and the HTML of one email, from the same rows.
 * @param {{intro: string, rows: Rows, link: string}} parts
 */
function render({ intro, rows, link }) {
  const lines = rows.map(([label, value]) => [label, oneLine(value)]);
  const text = [intro, "", ...lines.map(([label, value]) => `${label}: ${value}`), "", `${WORDS.link}: ${link}`];
  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    "<table>",
    ...lines.map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`),
    "</table>",
    `<p><a href="${escapeHtml(link)}">${escapeHtml(WORDS.link)}</a></p>`,
  ];
  return { text: text.join("\n"), html: html.join("\n") };
}

/**
 * The sign-up email: 'New investor: <name> (<firm>)'.
 * @param {Investor} investor
 * @param {{baseUrl: string}} options
 * @returns {Readonly<AlertMessage>}
 */
export function signupMessage(investor, { baseUrl }) {
  const rows = /** @type {Rows} */ ([
    [WORDS.name, orNotGiven(investor.name)],
    [WORDS.email, investor.email],
    [WORDS.firm, orNotGiven(investor.firm)],
    [WORDS.investorType, choice("investorType", investor.investorType)],
    [WORDS.chequeSize, choice("chequeSize", investor.chequeSize)],
    [WORDS.source, choice("source", investor.source)],
  ]);
  const body = render({ intro: WORDS.signupIntro, rows, link: investorUrl(baseUrl, investor.id) });
  return Object.freeze({ subject: oneLine(`${WORDS.signupSubject}: ${who(investor)}`), ...body });
}

/**
 * The first-open email: '<name> (<firm>) opened <title>'.
 * @param {Investor} investor
 * @param {AlertDocument} document
 * @param {{baseUrl: string}} options
 * @returns {Readonly<AlertMessage>}
 */
export function firstOpenMessage(investor, document, { baseUrl }) {
  const rows = /** @type {Rows} */ ([
    [WORDS.name, orNotGiven(investor.name)],
    [WORDS.email, investor.email],
    [WORDS.firm, orNotGiven(investor.firm)],
    [WORDS.document, document.title],
  ]);
  const body = render({ intro: WORDS.firstOpenIntro, rows, link: investorUrl(baseUrl, investor.id) });
  return Object.freeze({ subject: oneLine(`${who(investor)} opened ${document.title}`), ...body });
}
