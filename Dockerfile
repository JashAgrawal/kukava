# syntax=docker/dockerfile:1

# Multi-stage build. The dependencies and the Next.js output are built in one
# stage and only the runtime artefacts are copied forward, so the final image
# carries no toolchain, no sources and no dev dependencies.

ARG NODE_VERSION=22.15.0
ARG ALPINE_VERSION=3.21

# ---------- deps: install everything needed to build ----------
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps
WORKDIR /app

# libc6-compat is required by Next.js's SWC native binary on musl.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./

# `npm ci` installs exactly the lockfile, which is what makes builds repeatable.
# --ignore-scripts is safe here because the only postinstall is esbuild's
# platform binary shim, which the next stage re-triggers via `npm rebuild`.
RUN npm ci --ignore-scripts

# ---------- build: produce the production server bundle ----------
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# BUILDKIT_INLINE_CACHE keeps the layer cached when only application code
# changes, not when dependencies do.
RUN --mount=type=cache,target=/root/.npm \
    npm rebuild && npm run build

# The app has no runtime server logic. The standalone bundle in
# .next/standalone carries its own minimal node_modules, which is why the
# runtime stage copies that directory instead of installing anything.
RUN rm -rf .next/cache

# ---------- runtime: serve the standalone bundle ----------
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runtime
WORKDIR /app

RUN apk add --no-cache curl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# server.js plus the traced dependencies it actually needs.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Build assets and static files are excluded from the standalone bundle by
# design and have to be copied alongside it.
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Reports unhealthy while the app is still booting, so an orchestrator does not
# route traffic to a container that cannot serve it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:${PORT}/ || exit 1

CMD ["node", "server.js"]