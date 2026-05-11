# Automatos v2 — landing site

Editorial, static-HTML replacement for the v1 React landing. Pure HTML/CSS/JS.
No build step. Served by a tiny Express container on Railway.

## Deploy (Railway — drop-in swap of v1)

1. Point the Railway service at this repo / branch.
2. Set the env vars below (same names as v1 — copy/paste from v1's service).
3. Deploy. The Dockerfile and `server.js` handle the rest.

### Env vars (set on Railway)

| Var | Purpose | Required |
|---|---|---|
| `VITE_AUTOMATOS_PUBLIC_KEY` | `ak_pub_*` — widget SDK auth (chat + blog). Allow-listed by origin server-side. | for chat + blog widgets |
| `VITE_AUTOMATOS_WORKSPACE_ID` | Workspace ID for the direct-fetch blog path used by `field-notes.html`. | for blog list |
| `VITE_AUTOMATOS_CHAT_AGENT_ID` | UUID of the public-facing chat agent (CONCIERGE). Empty → workspace default. | optional |
| `SMTP_HOST` | SMTP host. Defaults to `mail.privateemail.com`. | for contact form |
| `SMTP_PORT` | SMTP port. Defaults to `465`. | for contact form |
| `SMTP_USER` | SMTP user (the sending address). | for contact form |
| `SMTP_PASS` | SMTP password. | for contact form |
| `CONTACT_EMAIL` | Where to deliver contact submissions. Defaults to `SMTP_USER`. | optional |
| `PORT` | Set by Railway automatically. | n/a |

### How config flows in

`server.js` reads `_config.js.template` at container start and writes `_config.js`
with the substituted values. `_config.js` is `.gitignored` and `.dockerignored`,
so the in-tree version is whatever the last local run produced — never the
deployed values.

### Allowed domains on the public key

The `ak_pub_*` key is allow-listed by origin server-side. If v2 deploys on the
same domain as v1 (`automatos.app` / `www.automatos.app`), the existing key
works. New subdomain → add it to `allowed_domains` on the key first (no code
change can fix that — it's server-side).

## Local development

```sh
cp .env.example .env       # then fill in
npm install
npm start                  # http://localhost, or set PORT
```

For lightweight previews without the widgets / contact form,
`python3 -m http.server 8765` also works — chat will log a console warning and
stay hidden.

## Architecture

- **Static HTML pages**: `index`, `marketplace`, `pricing`, `contact`,
  `field-notes`, `field-notes-five-tiers`, `pitch-mode`, `styleguide`,
  `terms`, `404`, `landing-mobile`, `states-and-motion`.
- **Shared scripts**: `_theme.js` (bone/pitch toggle), `_hero-picker.js`
  (hero image picker), `_waitlist.js` (Sign-up popup), `_chat.js` (Automatos
  chat widget), `_config.js` (runtime config carrier).
- **Server**: `server.js` — Express + nodemailer for `/api/contact`,
  static for everything else, runtime envsubst for `_config.js`.

## Known gaps (post-deploy iterations)

- `field-notes.html` is currently 12 hand-written `.note` cards. Once live,
  swap to direct-fetch from
  `${apiBase}/api/widgets/blog/posts?workspace_id=${workspaceId}` and render
  into the same `.note` template.
- `/about`, `/privacy`, `/cookies`, `/eu-ai-act` in the footer point to `#` —
  either redirect to v1's existing pages or build v2 mocks.
- Chat widget visual QA needs the SDK to actually mount, which requires real
  env on the deployed origin.
