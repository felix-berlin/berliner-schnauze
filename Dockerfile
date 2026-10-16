# Runtime-only image: `dist/` is built beforehand (CI or `pnpm build:local`),
# so build secrets never enter a layer. The server bundle has every dep inlined
# (vite.ssr.noExternal), hence no node_modules.
FROM gcr.io/distroless/nodejs24-debian12:nonroot

WORKDIR /app
COPY server/ server/
COPY dist/ dist/

ENV HOST=0.0.0.0 PORT=4321 NODE_ENV=production
EXPOSE 4321
CMD ["server/index.mjs"]
