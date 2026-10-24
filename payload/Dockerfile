# Payload CMS image. Build from the repo root (workspace + root lockfile):
#   docker build -f payload/Dockerfile .
# Ignore rules: payload/Dockerfile.dockerignore (website/.dockerignore is the web image's).
# `next build` needs no database and no secrets; all runtime env (DATABASE_URL,
# PAYLOAD_SECRET, PAYLOAD_SERVER_URL) comes from compose at start.
FROM node:24-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS build
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

FROM --platform=$BUILDPLATFORM node:24-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS infisical-cli
ARG TARGETARCH
ARG INFISICAL_CLI_VERSION=0.44.2
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && case "$TARGETARCH" in \
      amd64) checksum=6e8a3b9c4f17e2a95d5934f9bc87b7935927c4cd43dd5f9ba984a89f898022ca ;; \
      arm64) checksum=baa7c8ef388a9f84a720e75fe972fb2f804f954c4e2b01a77c92e98a86cb26f5 ;; \
      *) echo "Unsupported Infisical CLI architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac \
 && archive="cli_${INFISICAL_CLI_VERSION}_linux_${TARGETARCH}.tar.gz" \
 && curl -fsSL "https://github.com/Infisical/cli/releases/download/v${INFISICAL_CLI_VERSION}/${archive}" -o "/tmp/${archive}" \
 && printf '%s  %s\n' "$checksum" "/tmp/${archive}" | sha256sum -c - \
 && tar -xzf "/tmp/${archive}" -C /tmp infisical \
 && install -D -m 0755 /tmp/infisical /out/infisical \
 && rm -f "/tmp/${archive}" /tmp/infisical

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:cb606325b7ec4af55462cb0b424a53b452a5b4a894ffe841fcf1048d216fb9f8
WORKDIR /app
COPY --from=build /repo/payload/.next/standalone/ ./
COPY --from=build /repo/payload/.next/static/ payload/.next/static/
COPY website/server/infisical-entrypoint.mjs infisical-entrypoint.mjs
COPY --from=infisical-cli /out/infisical /usr/local/bin/infisical
# Owned by nonroot, so a fresh named volume mounted here inherits it.
COPY --from=build --chown=nonroot:nonroot /empty-media /app/media

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3001 MEDIA_DIR=/app/media
EXPOSE 3001
ENTRYPOINT ["/nodejs/bin/node", "/app/infisical-entrypoint.mjs"]
CMD ["payload/server.js"]
