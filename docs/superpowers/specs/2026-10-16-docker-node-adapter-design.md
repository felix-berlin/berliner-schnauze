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
