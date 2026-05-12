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

// ── Research paper route: /research/{slug} → blog-post.html ──────────
// Same API shape (the post is just categorised "Research"), same renderer.
app.get(/^\/research\/([A-Za-z0-9_\-]+)\/?$/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(__dirname, "blog-post.html"));
});

// ── Research index: /research → research.html ────────────────────────
app.get(/^\/research\/?$/, (_req, res) => {
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
  { loc: "/marketplace",  priority: 0.8, changefreq: "weekly"  },
  { loc: "/pricing",      priority: 0.8, changefreq: "monthly" },
  { loc: "/contact",      priority: 0.5, changefreq: "yearly"  },
  { loc: "/terms",        priority: 0.3, changefreq: "yearly"  },
  { loc: "/field-notes",  priority: 0.9, changefreq: "daily"   },
  { loc: "/research",     priority: 0.9, changefreq: "weekly"  },
];

let sitemapCache = { xml: null, at: 0 };
const SITEMAP_TTL_MS = 60 * 60 * 1000;

function xmlEscape(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  }[c]));
}

async function fetchCmsPosts() {
  const workspaceId = process.env.VITE_AUTOMATOS_WORKSPACE_ID;
  if (!workspaceId) return [];
  try {
    const url = `https://api.automatos.app/api/widgets/blog/posts?workspace_id=${encodeURIComponent(workspaceId)}&per_page=100&page=1`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return data.posts || [];
  } catch (err) {
    console.warn("[sitemap] CMS fetch failed:", err.message);
    return [];
  }
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

  const all = [
    ...STATIC_URLS.map((u) => ({ ...u, lastmod: null })),
    ...postUrls,
  ];

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

// ── Static files ──────────────────────────────────────────────────────
// Cache strategy:
//   .html / _config.js  → no-cache (must revalidate every request)
//   _*.js  / _*.css     → 60s, must-revalidate (shared loaders that we ship to often)
//   images, fonts, etc. → 30d (fingerprint by URL if needed later)
app.use(express.static(__dirname, {
  maxAge: "30d",
  immutable: false,
  index: "index.html",
  extensions: ["html"],
  setHeaders(res, filePath) {
    const base = filePath.split("/").pop() || "";
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return;
    }
    if (base === "_config.js") {
      res.setHeader("Cache-Control", "no-cache");
      return;
    }
    // Shared loaders + stylesheets — keep short so we can iterate
    if (/^_.+\.(js|css)$/.test(base)) {
      res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
      return;
    }
  },
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
});
