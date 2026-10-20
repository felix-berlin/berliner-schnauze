# Cutover checklist: WordPress → Payload

Gates in order. Do not start a step before the one above is done. Everything before step 7 can be done and repeated
without visitors noticing; steps 7 and 8 are the actual switch.

Background: `docs/superpowers/specs/2026-10-16-payload-migration-design.md`. Setup of the CMS itself: `payload/README.md`.

## 0. What is already verified (2026-10-16, branch `feat/payload-migration`)

- **SEO parity:** `website/scripts/seo-diff.ts` compared 49 URLs of the live site (WordPress-fed) with the new stack on the
  real imported data: title, description, canonical, robots, og/twitter, JSON-LD, language and status code are
  identical. One deliberate difference: the homepage canonical is `/` now (it said `/index`, a URL that only
  redirects), and `/index` is redirected permanently.
- **Real image:** the Docker image was run against the imported database; all 28 routes answer, OG images are
  rendered and cached on the volume, media URLs are absolute, the suggest-word mail arrives (local SMTP sink,
  Cloudflare's dummy Turnstile keys).
- **Anki:** the deck built from Payload is identical to the one built from WordPress (5907/5907 Full, 603/603 Lite
  cards, same GUIDs and fields).
- **Not verified, needs you:** the PWA offline fallback in a browser (the service worker caches visited pages (NetworkFirst), there is no precached fallback page),
  playing audio from the CMS host (CSP `media-src` was added), WebKit/Firefox/mobile Playwright projects (only
  Chromium ran locally; CI runs all), the GitHub Actions jobs (the branch was never pushed).

## Before anything: do not merge early

- [ ] Do not merge `feat/payload-migration` into `main` before step 7, or first disconnect/pause Cloudflare Workers Builds for this repo. The branch builds without a database but `dist/client` holds no HTML any more; a Workers deploy of it would serve empty pages on the live domain.
- [ ] Known gap: Lexical links in magazine posts have no `rel="sponsored"` (the "Anzeige" disclosure in `article.ts` relies on it). No published post has one today; check before publishing a post with affiliate links.

## 1. Secrets and env

Env vars live in three places. Rule of thumb: what Compose needs _before_ the containers start goes to Komodo, what the
apps read at runtime goes to Infisical, what CI needs goes to GitHub. Details of the Infisical wiring:
[Infisical with Docker Compose](./infisical-compose.md).

### 1a. Komodo Stack environment (Compose, not Infisical)

- [ ] Create the secrets in Komodo (Settings → Variables): `WEB_CLIENT_ID`, `WEB_CLIENT_SECRET`, `CMS_CLIENT_ID`, `CMS_CLIENT_SECRET`, `POSTGRES_PASSWORD`.
- [ ] Stack environment (see the full block in `docs/infisical-compose.md`):

| Variable                              | Value                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `INFISICAL_ENABLED`                   | `true`                                                                              |
| `INFISICAL_PROJECT_ID`                | project ID                                                                          |
| `INFISICAL_ENV`                       | `prod`                                                                              |
| `INFISICAL_DOMAIN`                    | `https://infisical.kasimir.dev` (default)                                           |
| `INFISICAL_WEB_CLIENT_ID` / `_SECRET` | `[[WEB_CLIENT_ID]]` / `[[WEB_CLIENT_SECRET]]`                                       |
| `INFISICAL_CMS_CLIENT_ID` / `_SECRET` | `[[CMS_CLIENT_ID]]` / `[[CMS_CLIENT_SECRET]]`                                       |
| `APP_RUNTIME_ENV_FILE`                | `/dev/null` (keeps the client secrets out of the apps)                              |
| `POSTGRES_USER` / `POSTGRES_DB`       | `berliner` / `berliner_schnauze`                                                    |
| `POSTGRES_PASSWORD`                   | `[[POSTGRES_PASSWORD]]`, URL-safe: letters, digits, `-_.~` (`openssl rand -hex 16`) |

### 1b. Infisical (`prod`, locally `dev`)

Both containers read the same environment; each identity gets read access only. **Do not store** `DATABASE_URL`,
`NODE_ENV`, `OG_CACHE_DIR`, `MEDIA_DIR`, `PORT` for the containers: Compose pins them and wins over Infisical
(`DATABASE_URL` is built from `POSTGRES_*`; `PAYLOAD_RUN_MIGRATIONS` / `PAYLOAD_RUN_JOBS` are pinned on `cms` as well).

- [ ] Add these:

| Variable               | Used by                                  | `prod` example                                | `dev` example                                         |
| ---------------------- | ---------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `PAYLOAD_SECRET`       | web, cms                                 | `openssl rand -hex 32`, **different per env** | any other string (signs sessions and preview tokens)  |
| `PAYLOAD_SERVER_URL`   | web, cms                                 | `https://cms.berliner-schnauze.wtf`           | `http://localhost:3001`                               |
| `SITE_URL`             | cms (+ build)                            | `https://berliner-schnauze.wtf`               | `http://localhost:4321`                               |
| `IMAGOR_HOST`          | web                                      | your Imagor URL                               | your Imagor URL                                       |
| `IMAGOR_SECRET`        | web                                      | Imagor signing secret                         | same as Imagor dev                                    |
| `TURNSTILE_SECRET_KEY` | web                                      | real key (Cloudflare dashboard)               | `1x0000000000000000000000000000000AA` (always passes) |
| `TURNSTILE_SITE_KEY`   | web (public)                             | real site key                                 | `1x00000000000000000000AA`                            |
| `SMTP_URL`             | web, cms (cms mails password resets)     | `smtps://user:pw@smtp.example.com:465`        | empty: mails go to the console                        |
| `SUGGEST_MAIL_TO`      | web, cms                                 | `redaktion@berliner-schnauze.wtf`             | `dev@localhost`                                       |
| `DATABASE_URL`         | **dev only** (`pnpm dev` has no Compose) | not in Infisical                              | `postgres://USER:PASSWORD@localhost:5432/DBNAME`      |

`DATABASE_URL` format: `postgres://USER:PASSWORD@HOST:PORT/DBNAME`. Host `localhost` for dev; in Compose it is `postgres`,
built for you. The remaining optional vars (`SENTRY_*`, `WAKAPI_*`, `MATOMO_*`, `POLAR_*`, `ENABLE_ANALYTICS`, …) keep
their current values; the schema is in `website/astro.config.mjs`.

- [ ] `IMAGOR_HOST`, `SITE_URL` and the other public vars are inlined at build time: the CI build reads the `prod` Infisical env.
- [ ] The server's `.env` (Compose `env_file`) is only a fallback while Infisical is disabled. With `APP_RUNTIME_ENV_FILE=/dev/null` it is ignored; remove application secrets from it.
- [ ] A failing Infisical login stops the container instead of starting it without secrets: watch `docker compose logs web cms` on first start.

### 1c. GitHub and local only

- [ ] GitHub secrets for the Anki release and `publish-drafts.ts`: `PAYLOAD_URL` (`https://cms.berliner-schnauze.wtf`), `PAYLOAD_API_KEY` (key of the `anki-bot` user, step 4). Locally `PAYLOAD_URL=http://localhost:3001`.
- [ ] Local only, in the git-ignored `payload/.env`, never in Infisical: `DATABASE_URL_TEST=postgres://USER:PASSWORD@localhost:5432/bs_test` (a throwaway DB whose name ends in `_test`).

## 2. Last import and content check

- [ ] `IMPORT_ALLOW_REMOTE_DB=1 NODE_ENV=production DATABASE_URL=<prod> npx infisical run -- pnpm --filter payload-app import:wp` on a machine that can reach the production database. Expected: exit 0, `failures: []`. Known warning: `word-without-berlinerisch` for `baletti-machen-2` (a published word without a headword; it is skipped, fix or delete it in WordPress). Needs the code of `26df38e9` (removed afterwards) and must run before the migration `20261020_191940_drop_wp_id`: the import matches words by `wpId`.
- [ ] The two images the frontend hard-codes (`brown-bear-roar.png`, `bear-walking.png`) are in the Payload media list afterwards.
- [ ] Posts: WordPress has 1 published magazine post, the rest are drafts; check the same in the Payload admin before you publish anything.

## 3. Reverse proxy

- [ ] `berliner-schnauze.wtf` → `web:4321`. It must send `Host`, `X-Forwarded-Host` and `X-Forwarded-Proto: https`. Astro only trusts them for `berliner-schnauze.wtf` (`security.allowedDomains` in `astro.config.mjs`); without them breadcrumb JSON-LD ids say `http://localhost:4321`.
- [ ] `cms.berliner-schnauze.wtf` → `cms:3001`. `/wp-content/uploads/...` on this host is answered by the CMS with a 301 to the new file (old media links and previews keep working).
- [ ] The proxy may cache pages: responses carry `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400`; errors are `no-store`. A change in the admin is visible after about a minute (60 s in-process cache) plus the proxy's 5 minutes.
- [ ] Pangolin (Traefik) is enough as the proxy; it sets `X-Forwarded-Proto: https` and passes `X-Forwarded-Host`. It caches nothing, so `s-maxage` is unused: every request reaches Node, admin changes are live after the 60 s in-process cache.
- [ ] Pangolin resources ask for a login by default. `berliner-schnauze.wtf`: authentication off. `cms.berliner-schnauze.wtf`: off, or SSO only for the admin with rules that bypass it for `/api/*` (Imagor fetches `/api/media/file/*`, the Anki release and `publish-drafts.ts` use the REST API with an API key) and `/wp-content/*` (old media links). Payload guards the API itself (anonymous → 403).
- [ ] Newt targets: on the host `127.0.0.1:4321` / `127.0.0.1:3001` (compose binds both ports to localhost only); as a container in the compose network `web:4321` / `cms:3001`.

## 4. First admin and API users

- [ ] Create the first admin **before** `cms.berliner-schnauze.wtf` is reachable from the internet: `PAYLOAD_ALLOW_FIRST_USER=true` on the `cms` service, open the admin, create the user, remove the variable again. (`/api/users/first-register` ignores the flag, so the route must not be public before this step.)
- [ ] A user `anki-bot` with "Enable API Key"; its key is `PAYLOAD_API_KEY`.

## 5. Backups

- [ ] Portabase job on the Postgres container (replaces BackWPup) and one test restore into a throwaway database.
- [ ] A backup of the `media` volume (restic/rsync cron). The `ogcache` volume is a cache and needs none.

## 6. Dry run against the real stack

- [ ] Start the stack with the production image tags (`docker compose up -d`), without public DNS: `curl --resolve` or a hosts entry.
- [ ] `pnpm dlx tsx website/scripts/seo-diff.ts https://berliner-schnauze.wtf https://<new stack> website/scripts/seo-urls.txt` → exit 0 (the `known` line for `/` is expected). Needs the code of `26df38e9` (removed afterwards).
- [ ] The homepage hero, the footer bear and the og:images of `/`, `/themen` and `/anki` load `brown-bear-roar.png` / `bear-walking.png` from `PAYLOAD_SERVER_URL/api/media/file/` through Imagor (`mediaFileUrl`): check that they show (Imagor must reach the CMS host).
- [ ] Old media link with a query string and an umlaut: `curl -sI "https://cms.berliner-schnauze.wtf/wp-content/uploads/K%C3%BCche.jpg?ver=2"` → `301`, and the target returns `200`.
- [ ] Anonymous API is closed: `curl -s -o /dev/null -w '%{http_code}' https://cms.berliner-schnauze.wtf/api/words` → `403`.
- [ ] One word page, the homepage, a magazine page and `/spenden` in light and dark mode, desktop and mobile width (`CLAUDE.md`).
- [ ] Play an audio file on a word page (CSP `media-src`), switch the browser offline after one visit and open a word page you have not visited (service worker fallback).
- [ ] Suggest-word form: real submission shows up in the admin under Suggestions and arrives at `SUGGEST_MAIL_TO`; check the spam folder (sender `mail@berliner-schnauze.wtf`, SPF).
- [ ] Admin preview: the preview button of a draft word opens the draft on the site (not the cached public page).

## 7. Switch

- [ ] Point DNS / the proxy route at the new stack.
- [ ] Search Console: submit `https://berliner-schnauze.wtf/sitemap-index.xml` again, request indexing of the homepage, watch coverage and crawl errors for a week. Check Matomo, Sentry and the Anki checkout page (`/anki/danke`).

## 8. Only then, switch WordPress off

- [ ] Last BackWPup export of WordPress.
- [x] Remove the WordPress MCP server (`.mcp.json` entry `berlinerSchnauze`, `WP_MCP_*` in `~/.claude/settings.json`, the "WordPress MCP Access" section in `CLAUDE.md`).
- [x] Remove `wrangler.jsonc` and the `deploy` / `server:preview` scripts: a Cloudflare static deploy cannot serve this site any more. (Done on the branch: a Workers Build of it now fails instead of deploying empty pages.)
- [x] Remove the WordPress import (`payload/src/import/`, `import:wp`), `website/scripts/seo-diff.ts` and `scripts/scan_schlobinski.py`; they live on in git history (last commit before removal: `26df38e9`).
- [x] Keep `wpPath` (it drives the media redirects for good); `wpId` is removed, the Anki cards get new GUIDs.

## Later

Move the Astro app into its own `website/` package, like `payloadcms/payload/examples/astro` (mechanical `git mv`, no
behaviour change; removes the `payload-app` types workarounds).
