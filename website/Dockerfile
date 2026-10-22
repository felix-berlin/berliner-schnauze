# Runtime-only image: `dist/` is built beforehand (CI or `pnpm build:local`),
# so build secrets never enter a layer. The server bundle has every dep inlined
# (vite.ssr.noExternal) except what runs outside it: astro-og-canvas with canvaskit-wasm
# (its .wasm), loaded by the OG worker thread (server/og-worker.mjs). Only those are installed below.
# Pure JS and wasm, so they are fetched once on the build platform for every target.
FROM --platform=$BUILDPLATFORM node:24-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS og-deps
# package.json is only read for the (exact, lockfile-matching) version, never installed (it would run the pnpm-only preinstall).
COPY package.json /meta/package.json
WORKDIR /deps
# --legacy-peer-deps: astro-og-canvas's peer `astro` is not needed to render.
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock --ignore-scripts \
    --legacy-peer-deps \
    "canvaskit-wasm@$(node -p "require('/meta/package.json').dependencies['canvaskit-wasm']")" \
    "astro-og-canvas@$(node -p "require('/meta/package.json').dependencies['astro-og-canvas']")" \
 && mkdir og-cache

FROM --platform=$BUILDPLATFORM node:24-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS infisical-cli
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

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:59c479c9b8c123e66047315c968aa2d35e31ae5149c856e4110a79c8b3563f0b

WORKDIR /app
COPY server/ server/
COPY dist/ dist/
COPY --from=infisical-cli /out/infisical /usr/local/bin/infisical
COPY --from=og-deps /deps/node_modules node_modules/
# Rendered OG images are kept here (a volume in compose); a named volume takes over this owner.
COPY --from=og-deps --chown=65532:65532 /deps/og-cache og-cache/
# OG images load their font relative to the working directory.
COPY src/assets/fonts/Berlin-Bold.woff2 src/assets/fonts/Berlin-Bold.woff2

ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production
EXPOSE 4321
ENTRYPOINT ["/nodejs/bin/node", "/app/server/infisical-entrypoint.mjs"]
CMD ["server/index.mjs"]
