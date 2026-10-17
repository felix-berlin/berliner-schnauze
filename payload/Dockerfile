# Payload CMS image. Build from the repo root (workspace + root lockfile):
#   docker build -f payload/Dockerfile .
# Ignore rules: payload/Dockerfile.dockerignore (website/.dockerignore is the web image's).
# `next build` needs no database and no secrets; all runtime env (DATABASE_URL,
# PAYLOAD_SECRET, PAYLOAD_SERVER_URL) comes from compose at start.
FROM node:24-slim AS build
WORKDIR /repo
# pnpm version pinned by `packageManager` in the root package.json.
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# patchedDependencies must exist for a frozen install.
COPY patches/ patches/
# Every workspace manifest: a frozen install checks the lockfile against all of them.
COPY payload/package.json payload/
COPY website/package.json website/
RUN pnpm install --frozen-lockfile --filter payload-app...
COPY payload/ payload/
RUN pnpm --filter payload-app build \
  && mkdir /empty-media

FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
COPY --from=build /repo/payload/.next/standalone/ ./
COPY --from=build /repo/payload/.next/static/ payload/.next/static/
# Owned by nonroot, so a fresh named volume mounted here inherits it.
COPY --from=build --chown=nonroot:nonroot /empty-media /app/media

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3001 MEDIA_DIR=/app/media
EXPOSE 3001
CMD ["payload/server.js"]
