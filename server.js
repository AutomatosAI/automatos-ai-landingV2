/**
 * Automatos v2 — static landing server.
 *
 * Mirrors v1's server.js shape so the Railway container is a drop-in
 * swap. Differences:
 *   - No /dist (v2 is pure HTML — root is the static root).
 *   - Hydrates _config.js from _config.js.template + env at startup
 *     (replaces v1's Vite build-time ARG/ENV injection).
 *   - No SPA fallback — v2 uses real .html files, so 404 returns 404.html.
 */
import express from "express";
import { createTransport } from "nodemailer";
import compression from "compression";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createInvestorsPortal } from "./server/investors/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 80;

// ── Hydrate _config.js from env at startup ────────────────────────────
function hydrateConfig() {
  const tplPath = join(__dirname, "_config.js.template");
  const outPath = join(__dirname, "_config.js");
  if (!existsSync(tplPath)) {
    console.warn("[config] _config.js.template missing — skipping hydration");
    return;
  }
  const tpl = readFileSync(tplPath, "utf8");
  const out = tpl
    .replace(/\$\{VITE_AUTOMATOS_PUBLIC_KEY\}/g,   process.env.VITE_AUTOMATOS_PUBLIC_KEY   || "")
    .replace(/\$\{VITE_AUTOMATOS_WORKSPACE_ID\}/g, process.env.VITE_AUTOMATOS_WORKSPACE_ID || "")
    .replace(/\$\{VITE_AUTOMATOS_CHAT_AGENT_ID\}/g, process.env.VITE_AUTOMATOS_CHAT_AGENT_ID || "");
  writeFileSync(outPath, out, "utf8");
  console.log("[config] _config.js hydrated from env");
}
hydrateConfig();

const app = express();
app.use(compression());

// ── Investor portal API: /api/investors ──────────────────────────────
// Mounted before the global express.json() so portal routes own their body
// parsing. Optional: without its config the portal answers 503 on its own
// paths and every other route behaves as before (server/investors/index.js).
const investorsPortal = createInvestorsPortal({ env: process.env });
app.use("/api/investors", investorsPortal.apiRouter);

app.use(express.json());

// ── SMTP transporter (lazy) ───────────────────────────────────────────
let transporter = null;
function getTransporter() {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      throw new Error("SMTP_USER and SMTP_PASS environment variables are required");
    }
    transporter = createTransport({
      host: process.env.SMTP_HOST || "mail.privateemail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
}

// ── Contact form endpoint ─────────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  const { firstName, lastName, email, message, topic, company } = req.body || {};

  if (!firstName || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    const smtp = getTransporter();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const subjTopic = topic ? ` [${topic}]` : "";

    await smtp.sendMail({
      from: `"Automatos Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      replyTo: `"${fullName}" <${email}>`,
      subject: `Contact${subjTopic}: ${fullName}`,
      text: [
        `Name: ${fullName}`,
        `Email: ${email}`,
        company ? `Company / Role: ${company}` : null,
        topic ? `Topic: ${topic}` : null,
        "",
        "Message:",
        message,
      ].filter(Boolean).join("\n"),
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        ${company ? `<p><strong>Company / Role:</strong> ${company}</p>` : ""}
        ${topic ? `<p><strong>Topic:</strong> ${topic}</p>` : ""}
        <hr />
        <p>${String(message).replace(/\n/g, "<br />")}</p>
      `,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Failed to send contact email:", err);
    return res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
});

// ── Blog post route (dynamic): /blog/{slug} → blog-post.html ─────────
// Slug pattern keeps it out of the way of asset paths (/blog/image.png etc.).
app.get(/^\/blog\/([A-Za-z0-9_\-]+)\/?$/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(__dirname, "blog-post.html"));
});

// ── Blog index: /blog → /field-notes ─────────────────────────────────
// There is no blog index page; CMS post bodies and older READMEs link /blog.
// The slug route above needs at least one slug character, so no overlap.
app.get(/^\/blog\/?$/, (req, res) => {
  res.redirect(301, `/field-notes${req.url.slice(req.path.length)}`);
});

// ── Research paper route: /research/{slug} → blog-post.html ──────────
// Same API shape (the post is just categorised "Research"), same renderer.
app.get(/^\/research\/([A-Za-z0-9_\-]+)\/?$/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(__dirname, "blog-post.html"));
});

// ── Research index: /research → research.html ────────────────────────
// research.html loads its assets by relative path, so /research/ (with the
// slash) would resolve them under /research/ and 404. Redirect it to the
// canonical URL, keeping any query string.
app.get(/^\/research\/$/, (req, res) => {
  res.redirect(301, `/research${req.url.slice(req.path.length)}`);
});
app.get(/^\/research$/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(__dirname, "research.html"));
});

// ── Sitemap: /sitemap.xml ────────────────────────────────────────────
// Statically-known pages + dynamic /blog/{slug} and /research/{slug}
// pulled from the CMS API. Cached in-process for 1 hour so we don't
// hammer the API on every crawler hit.
const SITE = "https://automatos.app";
const STATIC_URLS = [
  { loc: "/",             priority: 1.0, changefreq: "weekly"  },
  { loc: "/academy",      priority: 0.6, changefreq: "monthly" },
  { loc: "/contact",      priority: 0.5, changefreq: "yearly"  },
  { loc: "/terms",        priority: 0.3, changefreq: "yearly"  },
  { loc: "/privacy",      priority: 0.3, changefreq: "yearly"  },
  { loc: "/cookies",      priority: 0.3, changefreq: "yearly"  },
  { loc: "/eu-ai-act",    priority: 0.7, changefreq: "monthly" },
  { loc: "/eu-ai-act/checker", priority: 0.7, changefreq: "monthly" },
  { loc: "/field-notes",  priority: 0.9, changefreq: "daily"   },
  { loc: "/research",     priority: 0.9, changefreq: "weekly"  },
];
// Posts served from this repo rather than the CMS (_research.js STATIC_POSTS).
const STATIC_POST_URLS = [
  { loc: "/research/from-tool-lists-to-operating-graphs", priority: 0.7, changefreq: "monthly", lastmod: "2026-05-02" },
];

let sitemapCache = { xml: null, at: 0 };
const SITEMAP_TTL_MS = 60 * 60 * 1000;
const CMS_PER_PAGE = 50;   // the blog API rejects per_page above 50 with HTTP 422
const CMS_MAX_PAGES = 20;  // safety stop for the page loop

function xmlEscape(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  }[c]));
}

async function fetchCmsPosts() {
  const workspaceId = process.env.VITE_AUTOMATOS_WORKSPACE_ID;
  if (!workspaceId) return [];
  let posts = [];
  try {
    for (let page = 1; page <= CMS_MAX_PAGES; page += 1) {
      const url = `https://api.automatos.app/api/widgets/blog/posts?workspace_id=${encodeURIComponent(workspaceId)}&per_page=${CMS_PER_PAGE}&page=${page}`;
      const r = await fetch(url);
      if (!r.ok) {
        console.warn(`[sitemap] CMS page ${page} returned HTTP ${r.status}`);
        break;
      }
      const data = await r.json();
      const batch = data.posts || [];
      posts = [...posts, ...batch];
      const totalPages = Number(data.total_pages) || 1;
      if (batch.length < CMS_PER_PAGE || page >= totalPages) break;
    }
  } catch (err) {
    console.warn("[sitemap] CMS fetch failed:", err.message);
  }
  return posts;
}

app.get("/sitemap.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const now = Date.now();
  if (sitemapCache.xml && now - sitemapCache.at < SITEMAP_TTL_MS) {
    return res.send(sitemapCache.xml);
  }

  const posts = await fetchCmsPosts();
  const postUrls = posts.map((p) => ({
    loc: (p.category === "Research" ? "/research/" : "/blog/") + p.slug,
    priority: 0.7,
    changefreq: "monthly",
    lastmod: p.updated_at || p.published_at || null,
  }));

  const candidates = [
    ...STATIC_URLS.map((u) => ({ ...u, lastmod: null })),
    ...STATIC_POST_URLS,
    ...postUrls,
  ];
  // A static post that later lands in the CMS must not be listed twice.
  const all = candidates.filter((u, i) => candidates.findIndex((v) => v.loc === u.loc) === i);

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const u of all) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(SITE + u.loc)}</loc>`);
    if (u.lastmod) {
      const d = new Date(u.lastmod);
      if (!isNaN(d.getTime())) {
        lines.push(`    <lastmod>${d.toISOString().split("T")[0]}</lastmod>`);
      }
    }
    lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    lines.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");

  const xml = lines.join("\n");
  sitemapCache = { xml, at: now };
  res.send(xml);
});

// ── EU AI Act checker: /eu-ai-act/checker → eu-ai-act-checker.html ────
// (/eu-ai-act itself is eu-ai-act.html through the allow-list below.)
app.get(/^\/eu-ai-act\/checker\/?$/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(__dirname, "eu-ai-act-checker.html"));
});
// The clean URL /eu-ai-act-checker served the checker until the allow-list
// (Oct 2026); send it to the canonical route, keeping any query string.
app.get(/^\/eu-ai-act-checker\/?$/, (req, res) => {
  res.redirect(301, `/eu-ai-act/checker${req.url.slice(req.path.length)}`);
});

// ── Retired pages (8 Oct 2026) ───────────────────────────────────────
// automatos.app sells the family, not a product: each product prices itself
// on its own site, and Studio's site carries its marketplace. Old links land
// on the family section instead of a 404.
for (const path of ["/pricing", "/pricing.html", "/marketplace", "/marketplace.html"]) {
  app.get(path, (_req, res) => res.redirect(301, "/#family"));
}

// ── Static files: an explicit allow-list ─────────────────────────────
// The repo also holds design artefacts, briefs, uploads and this server's
// own source, and none of it is public. Only the pages and assets below
// (plus /images/) are served; every other path falls through to the 404
// handler. When a live page starts to load a new local file, add it here.
//
// Cache strategy:
//   .html / _config.js  → no-cache (must revalidate every request)
//   _*.js  / _*.css     → 60s, must-revalidate (shared loaders that we ship to often)
//   images, fonts, etc. → 30d (fingerprint by URL if needed later)
const CLEAN_URL_PAGES = [
  "index", "academy", "contact", "terms", "privacy", "cookies",
  "eu-ai-act", "field-notes", "research",
];
const HTML_ONLY_PAGES = [
  "eu-ai-act-checker.html", // canonical URL: /eu-ai-act/checker (route above)
  "blog-post.html",         // canonical URLs: /blog/{slug} and /research/{slug}
];
const PUBLIC_ASSETS = [
  "llms.txt", "robots.txt",
  "plates.css", "_responsive.css",
  "_config.js", // written by hydrateConfig() at startup; not in git
  "_theme.js", "_nav.js", "_footer.js", "_chat.js", "_analytics.js",
  "_hub.js", "_hero-picker.js", "_fieldnotes.js", "_research.js",
  "_blogpost.js", "_aiact-checker.js",
  "uploads/from-tool-lists-to-operating-graphs.html", // fetched by _blogpost.js
];
// ── Clean URLs with a trailing slash: /contact/ → /contact ───────────
// The allow-list below matches exact paths, so /contact/ used to 404. Each
// clean page answers its slashed form with a 301 to the canonical URL,
// keeping any query string. /research/ has its own route above; /eu-ai-act/
// is matched exactly, so /eu-ai-act/checker/ keeps its own route.
const SLASHED_CLEAN_URL = new RegExp(
  `^/(${CLEAN_URL_PAGES.filter((name) => name !== "index").join("|")})/$`,
);
app.get(SLASHED_CLEAN_URL, (req, res) => {
  res.redirect(301, `/${req.params[0]}${req.url.slice(req.path.length)}`);
});

const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ...CLEAN_URL_PAGES.flatMap((name) => [
    [`/${name}`, `${name}.html`],
    [`/${name}.html`, `${name}.html`],
  ]),
  ...[...HTML_ONLY_PAGES, ...PUBLIC_ASSETS].map((file) => [`/${file}`, file]),
]);
const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

function cacheControlFor(file) {
  const base = file.split("/").pop() || "";
  if (file.endsWith(".html")) return "no-store, no-cache, must-revalidate";
  if (base === "_config.js") return "no-cache";
  // Shared loaders + stylesheets — keep short so we can iterate
  if (/^_.+\.(js|css)$/.test(base)) return "public, max-age=60, must-revalidate";
  return `public, max-age=${THIRTY_DAYS_S}`;
}

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const file = PUBLIC_FILES.get(req.path);
  if (!file) return next();
  res.setHeader("Cache-Control", cacheControlFor(file));
  res.sendFile(resolve(__dirname, file), (err) => {
    if (!err || res.headersSent) return;
    res.removeHeader("Cache-Control"); // e.g. _config.js not hydrated yet
    next();
  });
});

// Images are the one folder served whole: page art, OG cards and the
// covers CMS posts link to (images/semantic-field-memory-cover.png).
app.use("/images", express.static(join(__dirname, "images"), {
  maxAge: "30d",
  index: false,
  redirect: false,
}));

// ── 404 ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404);
  const fallback = resolve(__dirname, "404.html");
  if (existsSync(fallback)) {
    res.sendFile(fallback);
  } else {
    res.send("Not found");
  }
});

app.listen(PORT, () => {
  console.log(`Automatos v2 landing on port ${PORT}`);
  investorsPortal.start().catch((err) => console.error("[investors] portal start failed:", err.message));
});
