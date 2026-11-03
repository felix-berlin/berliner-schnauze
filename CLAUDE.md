# CLAUDE.md

## Project Overview

Berliner Schnauze is a Berlin dialect translator web app. Data lives in the Payload CMS (`payload/`, Postgres); the frontend is an Astro site with Vue 3 islands for interactivity. Every page renders on demand (`output: "server"`, Node adapter, Docker image); the build needs no database.

**Layout** (pnpm workspace, like Payload's `examples/astro`): `website/` is the Astro app (package `website`), `payload/` the CMS (package `payload-app`). The root holds only workspace, release (`.releaserc` bumps the root, `website/` and `payload/` `package.json` versions to one product version (also the MCP `serverInfo.version`)), `compose.yaml`, `docs/`, `data/` and the CMS/Anki scripts in `scripts/`. The root scripts below delegate to `website` or `payload-app` via `pnpm --filter`.

**Where the rules live:** this file holds what applies everywhere. Package rules load on demand when you work in that directory: `website/CLAUDE.md` (Astro, Vue, architecture, E2E, design) and `payload/CLAUDE.md` (access, MCP, CMS commands). File-type rules in `.claude/rules/` load when you touch matching files (SCSS/Vue, tests, PWA/build config, Payload migrations, Renovate). Read the matching file before changing code there. A change that crosses both packages (a collection field used by a page) needs both.

## Commands

```bash
# Development
pnpm dev                     # Website dev server (port WEBSITE_PORT from .env.worktree, else 4321). Needs infisical login and a database, see docs/worktree-setup.md; auto-runs supportedBrowsers via predev
pnpm cms:dev                 # Payload admin + API, see payload/CLAUDE.md for all cms:* commands
pnpm dev:all                 # Both in parallel

# Testing
pnpm test:unit               # Run full test suite with coverage
# in website/: test:unit:watch (watch), test:unit:ui (Vitest UI), test:ci (coverage + JUnit)

# Linting & type checking
pnpm lint                    # Oxlint (website + payload/, root .oxlintrc.json holds typeAware) + Stylelint (SCSS) — auto-fixes (--fix), modifies files
pnpm typechecking            # astro check + vue-tsc  (slow — run targeted, not after every edit; tsc can't resolve .vue imports)

# Build
pnpm build                   # Production build (./dist, server entry + assets) — needs no database; no infisical, env vars must already be set
pnpm build:local             # Production build locally — wraps build with infisical (dev) to inject env vars
# in website/: build:strict  # Strict build with full type checking

# Formatting
pnpm format                  # Format with oxfmt
pnpm format:check            # Check formatting without writing

# Docker (Node adapter; run after build)
docker compose up --build    # Serve website/dist/ via server/index.mjs (www redirect + security headers; redirects in astro.config.mjs)
website/scripts/docker-smoke.sh   # Build image from dist/, check routes/headers/redirects (runs on every PR; leaves a running postgres up)
                             # Release CI builds + pushes ghcr.io/felix-berlin/berliner-schnauze and …/berliner-schnauze-cms (release.yml `docker` job)

# Cloudflare Workers cannot serve this stack (no wrangler config, a Workers Build fails).

# Anki decks (Python venv `.venv-anki`, setup in docs/anki/README.md)
pnpm anki:build              # Build Full + Lite into dist-anki/ (version <package.json version>-dev)
pnpm anki:push:sandbox       # Upload that Full deck to the Polar sandbox
```

When Claude runs `oxlint` directly (not via `pnpm lint`), always pass `--format=agent`.

Single test file, snapshots and E2E: `website/CLAUDE.md`.

## Secrets

Secrets are managed via [Infisical](https://infisical.com). Run `npx infisical login` once before local development. The `dev` script automatically injects secrets via `scripts/with-env.sh`.

Docker/compose reads the root `.env`; the `payload/` CLI and Next read a git-ignored `payload/.env` (see `payload/README.md`).

## Worktree setup (Orca)

Walkthrough for developers (also without Orca): `docs/worktree-setup.md`. `orca.yaml` runs `scripts/orca-setup.sh` in every new worktree and `scripts/orca-archive.sh` when it is archived (clear Orca's local setup script, or it wins over the YAML). Every worktree gets its own database `bsw_<workspace>` cloned from `bs_template` (on the dev-only container `bs-dev-postgres`, `127.0.0.1:5433`), a fixed dev admin and MCP key, and its own ports; `.env.worktree` (git-ignored) holds `DATABASE_URL`, `DATABASE_URL_TEST`, `WEBSITE_PORT`, `CMS_PORT`, `E2E_PORT`, `PAYLOAD_SERVER_URL`, `SITE_URL`.

- **`scripts/with-env.sh <cmd>`** runs a command with Infisical **dev** plus `.env.worktree`; `pnpm dev`, `pnpm cms:dev` and `build:local` go through it. It refuses prod. `.infisical.yaml` maps every branch to dev: a checkout on `main` used to resolve prod, so builds there baked the production Matomo ID into the client. Never use `--env=prod` locally, and no browser tool (Playwright, Chrome DevTools) against berliner-schnauze.wtf: every page view counts in the production Matomo.
- `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, `DEV_MCP_KEY` live in Infisical dev, never in a file or the chat. The template is built from a production backup by `scripts/dev-template.sh` (login data stripped; it still holds personal data from suggestions/comments: never in the repo or the chat).
- **The Payload MCP (`mcp__payload__*`) talks to production by default**, in every worktree (`.mcp.json`, key from `.claude/settings.local.json`). Writes are drafts only, but still prod. For the worktree database set `PAYLOAD_MCP_URL=http://localhost:$CMS_PORT/api/mcp` and `PAYLOAD_MCP_KEY` to `DEV_MCP_KEY` (from Infisical, never into a file or the chat), then restart Claude Code.
- **Production reads behind the basic-auth gate**: `scripts/prod-curl.sh <url>` (GET/HEAD only). The credential `PROD_BASIC_AUTH` sits in Infisical dev, folder `/agent`, and is injected at run time; never type, print or paste it.

## Deployment

Production is not deployed from this repo. The Komodo GitOps repo `felix-berlin/komodo` (local: `~/workspace/komodo`) holds the compose file (`remote/thrash/berliner-schnauze/compose.yaml`) and the `berliner-schnauze` stack in its `komodo.toml` (server `thrash - Hetzner`). The root `compose.yaml` here is for local use only.

- Release CI pushes `ghcr.io/felix-berlin/berliner-schnauze` and `…-cms`; Komodo pulls them. A change to ports, env vars, volumes, healthchecks or Traefik labels belongs in the komodo repo, not here.
- Runtime secrets come from Infisical via the stack `environment` in `komodo.toml` (machine identities `web`/`cms`), not from a `.env`.
- Rolling release: `web` is rolled via `scripts/rollout.sh` in the komodo repo (needs a real healthcheck, no `container_name`, no published ports); `cms` is recreated first so migrations run before the new `web` starts (see the expand/contract rule in `payload/CLAUDE.md`).
- Pull `komodo` before editing it (Komodo commits to `main` itself) and read its `CLAUDE.md` first; every decision goes into its `docs/entscheidungen.md`.

## Git Commit Conventions

Format: `<type>(<scope>): <description>` — imperative, lowercase, no trailing period (Conventional Commits).

Types: `feat` (bumps minor), `fix` (bumps patch), `refactor`, `perf`, `style` (formatting only), `test`, `docs`, `build` (deps, tooling, versions), `chore` (config, CI tweaks). Breaking change: `!` before the colon (`feat(api)!: remove endpoint`) plus a `BREAKING CHANGE: <description>` footer.

Scopes (optional, encouraged): `bon`, `pwa`, `search`, `toast`, `word`, `images`, `anki`, `ci`, `deps`, `dev`.

## Renovate

Rules for `renovate.json` and the dependency age gates load from `.claude/rules/renovate.md` when you touch `renovate.json`, `pnpm-workspace.yaml` or workflows.

## Package Manager

This project uses **pnpm only**: never `npm` or `yarn` to install or run scripts (`npx` for one-off CLIs such as `infisical` or `playwright` is fine). The `preinstall` script enforces this via `only-allow pnpm`.

pnpm supply-chain policy: freshly published packages (< 24h) trigger a lockfile age-gate. Fix: `pnpm clean --lockfile && pnpm install` — rebuilds the lockfile from scratch.
