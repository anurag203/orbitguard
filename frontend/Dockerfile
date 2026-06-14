# syntax=docker/dockerfile:1
# ---- build stage: compile the Vite/React app to static files ----
# glibc (Debian) base, NOT Alpine/musl: vite@8 bundles with rolldown, whose native
# binding (@rolldown/binding-linux-*) resolves reliably on gnu but trips npm's
# optional-deps bug on musl. See npm/cli#4828.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install deps first (cached unless package files change).
COPY frontend/package*.json ./
# npm/cli#4828: `npm ci` intermittently skips transitive OPTIONAL native bindings
# (rolldown, lightningcss, @tailwindcss/oxide, esbuild, ...) when the lockfile was
# generated on a different OS/arch — which breaks `vite build` in this Linux image.
# A fresh `npm install` re-resolves and pulls the correct platform binaries in one
# go. The committed package-lock.json stays intact for reproducible host installs.
RUN rm -f package-lock.json \
    && npm install --include=optional --no-audit --no-fund

# Build the production bundle into /app/dist.
COPY frontend/ .
RUN npm run build

# ---- runtime stage: serve static files via non-root nginx ----
# nginx-unprivileged runs as uid 101 and listens on 8080 (no root needed).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
