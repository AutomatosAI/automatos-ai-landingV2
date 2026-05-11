# Automatos v2 landing — single-stage, no build (pure static HTML).
# Mirrors v1's runtime stage so Railway can swap container without config drift.

FROM node:20-alpine

WORKDIR /app

# Install only production deps. No build step — v2 has no source compile.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy the rest of the site (static HTML, JS, CSS, images, server.js, _config template).
COPY . .

# Railway sets PORT; default to 80 in case of bare runs.
ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
