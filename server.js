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

// ── Static files ──────────────────────────────────────────────────────
app.use(express.static(__dirname, {
  maxAge: "1y",
  immutable: true,
  index: "index.html",
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    if (filePath.endsWith("_config.js")) {
      // Config is per-deploy; don't aggressively cache
      res.setHeader("Cache-Control", "no-cache");
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
