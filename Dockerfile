# Automatos v2 landing: the static site served by server.js, plus the investor
# portal app (investors/, a Vite + React build) built in its own stage.
# The runtime image carries the app's build (investors/dist), never its source.

# ── Stage 1: build the investor portal app ─────────────────────────────────
FROM node:22-alpine AS investors-build

WORKDIR /build/investors

# Lockfile first, so the dependency layer is reused when only source changes.
COPY investors/package.json investors/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY investors/ ./
RUN npm run build

# ── Stage 2: the site without the app's source ─────────────────────────────
FROM node:22-alpine AS site

WORKDIR /site
COPY . .
RUN rm -rf investors

# ── Stage 3: runtime ───────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install only production deps.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# The site (static HTML, JS, CSS, images, server.js, server/, _config template),
# then the portal app's build, served at /investors by server/investors/static.js.
COPY --from=site /site/ ./
COPY --from=investors-build /build/investors/dist ./investors/dist

# Railway sets PORT; default to 80 in case of bare runs.
ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
