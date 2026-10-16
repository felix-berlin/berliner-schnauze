# Cutover checklist: WordPress → Payload

Gates in order. Do not start a step before the one above is done. Everything before step 7 can be done and repeated
without visitors noticing; steps 7 and 8 are the actual switch.

Background: `docs/superpowers/specs/2026-10-16-payload-migration-design.md`. Setup of the CMS itself: `payload/README.md`.

## 0. What is already verified (2026-10-16, branch `feat/payload-migration`)

- **SEO parity:** `scripts/seo-diff.ts` compared 49 URLs of the live site (WordPress-fed) with the new stack on the
  real imported data: title, description, canonical, robots, og/twitter, JSON-LD, language and status code are
  identical. One deliberate difference: the homepage canonical is `/` now (it said `/index`, a URL that only
  redirects), and `/index` is redirected permanently.
- **Real image:** the Docker image was run against the imported database; all 28 routes answer, OG images are
  rendered and cached on the volume, media URLs are absolute, the suggest-word mail arrives (local SMTP sink,
  Cloudflare's dummy Turnstile keys).
- **Anki:** the deck built from Payload is identical to the one built from WordPress (5907/5907 Full, 603/603 Lite
  cards, same GUIDs and fields).
- **Not verified, needs you:** the PWA offline fallback in a browser (the service worker now precaches `/`),
  playing audio from the CMS host (CSP `media-src` was added), WebKit/Firefox/mobile Playwright projects (only
  Chromium ran locally; CI runs all), the GitHub Actions jobs (the branch was never pushed).

## 1. Secrets and env

- [ ] Infisical (`prod` and `staging`): `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_SERVER_URL` (`https://cms.berliner-schnauze.wtf`), `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `TURNSTILE_SECRET_KEY`, `SMTP_URL`, `SUGGEST_MAIL_TO`, `PAYLOAD_URL`, `PAYLOAD_API_KEY`.
  Inside compose the database host is `postgres`, on your machine `127.0.0.1`: compose overrides `DATABASE_URL` for `web` and `cms`.
- [ ] The server's `.env` (read by compose `env_file`) holds every runtime secret the `web` service needs: `IMAGOR_SECRET` and the vars above that are not set by compose itself. `IMAGOR_HOST`, `SITE_URL` and the other `public` vars are inlined at build time (CI build with the `prod` Infisical env).
- [ ] GitHub secrets for the Anki release: `PAYLOAD_URL`, `PAYLOAD_API_KEY` (the workflow reads Infisical `prod`).

## 2. Last import and content check

- [ ] `IMPORT_ALLOW_REMOTE_DB=1 NODE_ENV=production DATABASE_URL=<prod> npx infisical run -- pnpm --filter payload-app import:wp` on a machine that can reach the production database. Expected: exit 0, `failures: []`. Known warning: `word-without-berlinerisch` for `baletti-machen-2` (a published word without a headword; it is skipped, fix or delete it in WordPress).
- [ ] The two images the frontend hard-codes (`brown-bear-roar.png`, `bear-walking.png`) are in the Payload media list afterwards.
- [ ] Posts: WordPress has 1 published magazine post, the rest are drafts; check the same in the Payload admin before you publish anything.

## 3. Reverse proxy

- [ ] `berliner-schnauze.wtf` → `web:4321`. It must send `Host`, `X-Forwarded-Host` and `X-Forwarded-Proto: https`. Astro only trusts them for `berliner-schnauze.wtf` (`security.allowedDomains` in `astro.config.mjs`); without them breadcrumb JSON-LD ids say `http://localhost:4321`.
- [ ] `cms.berliner-schnauze.wtf` → `cms:3001`. `/wp-content/uploads/...` on this host is answered by the CMS with a 301 to the new file (old media links and previews keep working).
- [ ] The proxy may cache pages: responses carry `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400`; errors are `no-store`. A change in the admin is visible after about a minute (60 s in-process cache) plus the proxy's 5 minutes.

## 4. First admin and API users

- [ ] Create the first admin **before** `cms.berliner-schnauze.wtf` is reachable from the internet: `PAYLOAD_ALLOW_FIRST_USER=true` on the `cms` service, open the admin, create the user, remove the variable again. (`/api/users/first-register` ignores the flag, so the route must not be public before this step.)
- [ ] A user `anki-bot` with "Enable API Key"; its key is `PAYLOAD_API_KEY`.

## 5. Backups

- [ ] Portabase job on the Postgres container (replaces BackWPup) and one test restore into a throwaway database.
- [ ] A backup of the `media` volume (restic/rsync cron). The `ogcache` volume is a cache and needs none.

## 6. Dry run against the real stack

- [ ] Start the stack with the production image tags (`docker compose up -d`), without public DNS: `curl --resolve` or a hosts entry.
- [ ] `pnpm dlx tsx scripts/seo-diff.ts https://berliner-schnauze.wtf https://<new stack> scripts/seo-urls.txt` → exit 0 (the `known` line for `/` is expected).
- [ ] The homepage hero, the footer bear and the `/anki` og:image still use the old `https://cms.berliner-schnauze.wtf/wp-content/uploads/brown-bear-roar.png` / `bear-walking.png` urls (the 301 maps them to the imported media). They are loaded through Imagor: check that they show. If Imagor does not follow the redirect, change the four urls (`src/pages/index.astro`, `themen/index.astro`, `anki.astro`, `src/components/Footer.astro`) to `/api/media/file/<name>.png`.
- [ ] Old media link with a query string and an umlaut: `curl -sI "https://cms.berliner-schnauze.wtf/wp-content/uploads/K%C3%BCche.jpg?ver=2"` → `301`, and the target returns `200`.
- [ ] Anonymous API is closed: `curl -s -o /dev/null -w '%{http_code}' https://cms.berliner-schnauze.wtf/api/words` → `403`.
- [ ] One word page, the homepage, a magazine page and `/spenden` in light and dark mode, desktop and mobile width (`CLAUDE.md`).
- [ ] Play an audio file on a word page (CSP `media-src`), switch the browser offline after one visit and open a word page you have not visited (service worker fallback).
- [ ] Suggest-word form: real submission arrives at `SUGGEST_MAIL_TO`; check the spam folder (sender `mail@berliner-schnauze.wtf`, SPF).

## 7. Switch

- [ ] Point DNS / the proxy route at the new stack.
- [ ] Search Console: submit `https://berliner-schnauze.wtf/sitemap-index.xml` again, request indexing of the homepage, watch coverage and crawl errors for a week. Check Matomo, Sentry and the Anki checkout page (`/anki/danke`).

## 8. Only then, switch WordPress off

- [ ] Last BackWPup export of WordPress.
- [ ] Remove the WordPress MCP server (`.mcp.json` entry `berlinerSchnauze`, `WP_MCP_*` in `~/.claude/settings.json`, the "WordPress MCP Access" section in `CLAUDE.md`).
- [ ] Remove `wrangler.jsonc` and the `deploy` / `server:preview` scripts: a Cloudflare static deploy cannot serve this site any more.
- [ ] Decide about `scripts/scan_schlobinski.py`: its input producer (`fetch-wp-words-for-scan.mjs`) was removed.
- [ ] Keep the `wpId` / `wpPath` fields: `wpPath` drives the media redirects for good, `wpId` is the id of the Anki cards.

## Later

Move the Astro app into its own `website/` package, like `payloadcms/payload/examples/astro` (mechanical `git mv`, no
behaviour change; removes the `payload-app` types workarounds).
