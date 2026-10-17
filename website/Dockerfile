# Runtime-only image: `dist/` is built beforehand (CI or `pnpm build:local`),
# so build secrets never enter a layer. The server bundle has every dep inlined
# (vite.ssr.noExternal) except what is read from disk at runtime: canvaskit-wasm
# (its .wasm, OG images). Only that one is installed below.
FROM node:24-slim AS og-deps
# package.json is only read for the version, never installed (it would run the pnpm-only preinstall).
COPY package.json /meta/package.json
WORKDIR /deps
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock \
    "canvaskit-wasm@$(node -p "require('/meta/package.json').dependencies['canvaskit-wasm']")" \
 && mkdir og-cache

FROM --platform=$BUILDPLATFORM node:24-slim AS infisical-cli
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

FROM gcr.io/distroless/nodejs24-debian13:nonroot

WORKDIR /app
COPY server/ server/
COPY dist/ dist/
COPY server/infisical-entrypoint.mjs infisical-entrypoint.mjs
COPY --from=infisical-cli /out/infisical /usr/local/bin/infisical
COPY --from=og-deps /deps/node_modules node_modules/
# Rendered OG images are kept here (a volume in compose); a named volume takes over this owner.
COPY --from=og-deps --chown=65532:65532 /deps/og-cache og-cache/
# OG images load their font relative to the working directory.
COPY src/assets/fonts/Berlin-Bold.woff2 src/assets/fonts/Berlin-Bold.woff2

ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production
EXPOSE 4321
ENTRYPOINT ["/nodejs/bin/node", "/app/infisical-entrypoint.mjs"]
CMD ["server/index.mjs"]
