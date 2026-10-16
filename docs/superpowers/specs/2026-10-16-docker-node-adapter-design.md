# Docker + Node adapter (replace Cloudflare Workers)

## Goal

Self-host the site as a Docker container instead of Cloudflare Workers static assets. Every page that can be prerendered stays prerendered; the Node server only serves them. Each release publishes an image to GHCR.

## Decisions

- **Adapter**: `@astrojs/node` in `standalone` mode. `output` stays `static`, so nothing changes about prerendering. Output: `dist/client/` (static) + `dist/server/entry.mjs`.
- **Build where the secrets are**: the image is built from a `dist/` produced on the GitHub Actions runner (Infisical OIDC, same as `release.yml`). Secrets never enter a Docker layer, and the container needs no runtime secrets (no on-demand routes).
- **Minimal image**: `vite.ssr.noExternal: true` bundles the server entry, so the image has no `node_modules`. Base: `gcr.io/distroless/nodejs24-debian12:nonroot`. `.dockerignore` allows only `dist/`.
- **OG image cache**: `actions/cache` keeps `.og-cache/` (astro-og-canvas `cacheDir`) between release runs; only new/changed images are rendered.
- **Not cached on purpose**: the words cache (prod must have fresh words) and `incrementalBuild` state (stale-page risk).
- **Compose**: one `web` service, image `ghcr.io/felix-berlin/berliner-schnauze:${TAG:-latest}`, `build: .` for local use, port 4321, healthcheck via `node -e fetch(...)`. TLS/compression belong to the reverse proxy in front.
- **Workflow** `.github/workflows/docker.yml`: on `release: published` + `workflow_dispatch`; tags from `docker/metadata-action` (`x.y.z`, `x.y`, `latest` for releases, `beta` for prereleases).

## Local usage

```bash
pnpm build:local
docker compose up --build
```

## Out of scope (after the move)

Removing `wrangler.jsonc` and the `deploy`/`server:preview` scripts, re-enabling `prefetch` (disabled only because of Cloudflare), the server-side deploy (`compose pull`).

## Dynamic routes (later)

Most pages stay prerendered; a route opts into on-demand rendering with `export const prerender = false`. Keep `output: "static"` until most pages are dynamic (Astro docs recommendation). When the first one lands:

1. **Runtime env is required.** The adapter does not load env vars, and `astro:env/server` validates *all* required secrets whenever anything imports it — so the container needs every non-optional server secret (e.g. `WP_AUTH_REFRESH_TOKEN`, `IMAGOR_SECRET`, `SENTRY_AUTH_TOKEN`), not just the ones the route uses. Add `env_file:` to `compose.yaml`.
2. **Bundling escape hatch.** `ssr.noExternal: true` breaks for deps with native addons or files loaded next to the package (e.g. `sharp`, Prisma). List those in `ssr.external` and add a build stage that runs `pnpm deploy --prod` (pnpm Docker docs), copying only that `node_modules` into the image.
3. **Server-side error tracking.** Sentry only runs in the browser today.
4. **Cache headers.** On-demand responses get none; set them per route via `Astro.response.headers`.

`server/index.mjs` needs no change: everything that is not a static file falls through to the Astro handler, with the `_headers` rules applied. It relies on the standalone entry's `handler` export and `ASTRO_NODE_AUTOSTART=disabled` — both in the adapter source but not in its docs, so re-run the Docker smoke test after `@astrojs/node` major updates.
