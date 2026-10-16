# Runtime-only image: `dist/` is built beforehand (CI or `pnpm build:local`),
# so build secrets never enter a layer. The server bundle has every dep inlined
# (vite.ssr.noExternal) except what is read from disk at runtime: canvaskit-wasm
# (its .wasm, OG images) and all-the-german-words (a 28 MB JSON, loaded with
# createRequire for word decomposition). Only these two are installed below.
FROM node:24-slim AS og-deps
# package.json is only read for the version, never installed (it would run the pnpm-only preinstall).
COPY package.json /meta/package.json
WORKDIR /deps
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock \
    "canvaskit-wasm@$(node -p "require('/meta/package.json').dependencies['canvaskit-wasm']")" \
    "all-the-german-words@$(node -p "require('/meta/package.json').dependencies['all-the-german-words']")" \
 && mkdir og-cache

FROM gcr.io/distroless/nodejs24-debian13:nonroot

WORKDIR /app
COPY server/ server/
COPY dist/ dist/
COPY --from=og-deps /deps/node_modules node_modules/
# Rendered OG images are kept here (a volume in compose); a named volume takes over this owner.
COPY --from=og-deps --chown=65532:65532 /deps/og-cache og-cache/
# OG images load their font relative to the working directory.
COPY src/assets/fonts/Berlin-Bold.woff2 src/assets/fonts/Berlin-Bold.woff2

ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production
EXPOSE 4321
CMD ["server/index.mjs"]
