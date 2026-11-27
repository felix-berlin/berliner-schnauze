# payload/ (CMS, package `payload-app`)

Loaded when Claude works in `payload/`. Repo-wide rules (commands, secrets, git, deployment) are in the root `CLAUDE.md`; the site is in `website/CLAUDE.md`. Setup and credentials: `README.md` here and `docs/worktree-setup.md`.

**Paths:** `src/…` and `tests/…` are relative to `payload/` (`hooks/`, `lib/` mean `src/hooks`, `src/lib`). Commands and `scripts/…` run from the repo root (`payload/src/scripts/` holds the `payload run` scripts such as `devAccess.ts`).

Payload 3 backend (Next.js admin + REST, Postgres; GraphQL disabled). Compose services `cms` (image `berliner-schnauze-cms`, media volume) and `postgres`. The Astro site reads it through the Local API (`getPayloadClient()` in `website/src/services/payload.ts`, `payload-app` workspace dependency; its types come from the `types` export condition).

## Commands

```bash
pnpm cms:dev                     # Payload admin + API (port CMS_PORT from .env.worktree, else 3001; secrets via with-env.sh)
scripts/with-env.sh pnpm cms:test    # Payload tests; they DELETE rows, so only against DATABASE_URL_TEST (a throwaway DB named *_test; each worktree has its own)
pnpm cms:migrate:create <name>   # After EVERY schema change; commit it. The cms container runs migrations on start (CI fails on drift)
scripts/migration-upgrade-test.sh [base-ref]   # DATABASE_URL=…_e2e: migrate with base-ref's code + seed, upgrade with this checkout, roll back, forward again (CI: migration-upgrade job)
scripts/migration-dryrun.sh <backup.dump|.sql>  # Before a risky deploy: restore a prod backup into a throwaway Postgres container, migrate, read every collection
scripts/with-env.sh env NODE_ENV=production pnpm cms:migrate   # Apply migrations to the worktree DB. Setup already did; once `cms:dev` pushed the schema, Payload marks the DB (batch -1) and migrate asks to accept data loss. To test migrations use migration-upgrade-test.sh, or reset the DB (orca-archive.sh + orca-setup.sh)
scripts/with-env.sh env NODE_ENV=production pnpm --filter payload-app dev:access   # (re)creates the dev admin and MCP key in a local DB
docker compose up --build cms postgres   # CMS image (payload/Dockerfile, context = repo root)
infisical run -- pnpm dlx tsx scripts/publish-drafts.ts --dry-run   # Publish all draft words via REST (PAYLOAD_URL, PAYLOAD_API_KEY)
```

## Schema and migrations

- Schema: dev and tests push it; production (`NODE_ENV=production`, pinned on `cms`) only runs the committed migrations, and only where `PAYLOAD_RUN_MIGRATIONS=true` (set on `cms` alone). Never point a push-filled DB at the prod container.
- **Migrations are expand/contract** (add nullable/default, drop or rename only in a later release; working `down`). Full rule and the schema-change steps: `.claude/rules/payload-migrations.md` (loads when you touch collections, globals or migrations).
- **Pending contract (after the start-page v20 release)**: drop the `facts` field of the `home` global (table `home_facts`) with `pnpm cms:migrate:create drop_home_facts`; not earlier, the old `web` still reads it during a rolling release. Steps: `docs/claude/payload-features.md`.
- **Partial unique index** `comments_one_featured_per_word_idx` (one published featured Jeschichte per word) exists ONLY in migration `20261122_165037_comments_bezirk_featured`: Payload cannot declare it, so dev/test databases built by schema push have just the `singleFeatured` hook, and a `migrate:create` or push may drop the index. Keep it in the migration; never rely on the hook alone in production.
- Schema push in dev asks interactively (rename vs. create, data-loss confirm). Without a TTY the dev server hangs at it; run `pnpm payload run <boot script>` under `script -qfec … /dev/null` and answer, or migrate.

## Access and drafts

- **Drafts**: the Local API ignores access control unless asked — every site query spreads `siteRead()`, or `siteDocs()` for drafts listings (`website/src/services/payload.ts`: `overrideAccess: false` + `req.context.siteRead`), and `draftsRead`/`contentRead` (`src/access.ts`) then return published docs only, also in populated relations. REST stays login-only (it cannot set `req.context`). `SHOW_TEST_DATA` includes drafts on purpose (`siteDocs()`).
- The comment collections (`comments`, `comment-votes`, `comment-reports`) are login-only; the site queries them outside `siteRead()` with its own `status` filter and `depth: 0` (`website/CLAUDE.md`, Jeschichten). Keep access and that filter in step.
- `bon-games` (BON game results) is login-only; the site writes it through the Local API. It holds a hash of the visitor cookie, the dealt cards with their solutions, the display name, the result and timestamps, no IPs; there is no delete-by-visitor tool, only the CMS (website/CLAUDE.md, BON game).
- `bon-players` (BON player codes) is login-only too: `codeHash` (sha256 of the code, unique) and `name`; games link to it via `bon-games.player` (deleting a player sets that to null).
- `bon-games.nameReports` counts „Namen melden“ reports; from `NAME_REPORT_LIMIT` (3, `lib/bonNames.ts`) on, or with `nameHidden`, the name shows as Anonym. The `afterChange` hook mails the editors once when the reports reach the limit; reset with Meldungen = 0.
- First admin: in production `PAYLOAD_ALLOW_FIRST_USER=true` gates `POST /api/users`, but Payload's `/api/users/first-register` bypasses it. Cutover: create the first admin before the proxy route goes public.

## Derived fields and exports

- **Derived word fields** (`derived` group) are computed on save by the `beforeChange` hook from `src/lib/wordDerived.ts`, which the site also imports as `payload-app/word-derived` — keep it free of payload/next/config imports. `derived.decomposition` (compound parts) comes from `src/lib/decompose.ts` instead, CMS only: its 28 MB dictionary never loads in the site. Changing the derivation leaves existing words stale until re-saved (there is no bulk tool; write a `payload run` script that updates every word with `req.context[PRESERVE_CONTENT_MODIFIED_AT] = true` to keep the sitemap lastmod).
- `payload-app` exports (see `exports` in `package.json`): the pure rule modules (`./word-derived`, `./comments`, `./word-feedback`, `./bon-*`, `./home-stats`, …) must not import payload/next/config. `bon-rules` and `bon-names` reach the client bundle; `bon-player` and `bon-ranking` import `node:crypto` (the client takes only types); `./word-stats` and `./home-stats-load` are server-only (raw SQL). `.` has a hand-kept types-only mirror in `src/astro.d.ts`: update both.
- **Start page seeds** (dev only): `seed:home`, `seed:home-stats`; they refuse any database but a worktree's `bsw_<workspace>`. Test words: `docs/test-words.md`.

## Trending words (`word-stats`, export `payload-app/word-stats`)

Collection `word-stats` (one row per word and Berlin day, counters, no timestamps for privacy); `trending()` ranks published words only; its `collect()` is raw SQL that bypasses access and hooks, so table/column names must follow any rename. Site routes: `POST /api/word-pulse`, `GET /api/trending`. Formulas and limits: `docs/claude/payload-features.md`.

## MCP (`@payloadcms/plugin-mcp`, `src/mcp.ts`)

`/api/mcp` on the cms host: Claude can find/create/update `words` and find/update `suggestions` (no delete). Per-user key from the admin, every capability off until toggled; `hooks/mcpDraftOnly.ts` refuses any MCP write that publishes or edits a published word without `draft: true`; `userName`/`userMail` are hidden from MCP; one metadata-only audit line per call (`[mcp]`). `MCP_DISABLED=true` switches it off. The site bundle aliases the plugin to `website/src/lib/payloadMcpStub.ts` (it crashes the production bundle). Client setup (`PAYLOAD_MCP_KEY`, `PAYLOAD_MCP_URL`, default prod; never commit the key): `docs/claude/payload-features.md`.

## Other features

- **Cache stamp** (`globals/CacheStamp.ts`, `hooks/cacheStamp.ts`): hooks set the global `cache-stamp` in the transaction of every change; the web containers poll it and empty their caches (`website/CLAUDE.md`, Cache clearing). **A new collection or global that changes a public page must be added to `STAMPED_COLLECTIONS`/`STAMPED_GLOBALS`** (votes, reactions, stats and Bon games stay out: they write all the time); `tests/cacheStamp.test.ts` fails otherwise. A migration older than `20261127_113328_cache_stamp` that seeds through the Local API must set `context: { skipCacheStamp: true }`. Details: `docs/claude/payload-features.md`.
- **Redirects** (`@payloadcms/plugin-redirects`, `src/redirects.ts`): `website/src/middleware/index.ts` answers a 404 with a matching redirect (`website/src/services/payload/redirects.ts`). Changing the slug of a public doc adds a 301 itself (`hooks/redirectOldSlug.ts`), also after withdraw → rename → republish (it falls back to the last published version's slug).
- **Draft preview**: the admin's preview button (words, posts) links to `/api/preview` with a token signed by `PAYLOAD_SECRET` (1 h); the site keeps it in an httpOnly cookie and renders the latest draft with `Cache-Control: private, no-store`. Admin and site are on different hosts, so the Payload login cookie is not used. The CMS builds the link from `SITE_URL`.
- **Jobs** (scheduled publishing of posts and the retention task) run only where `PAYLOAD_RUN_JOBS=true` (the `cms` container), never in the site's Local API process.
- **Retention job** (`src/jobs/retention.ts`, daily 03:30 UTC, only where `PAYLOAD_RUN_JOBS=true`): clears personal data after fixed periods (suggestion name/mail 90 days, never-handled 365, comments 183, feedback `visitor` hash 13 months, report mail 90). The periods are promised in the privacy policy; change both together. Details: `docs/claude/payload-features.md`.
- **Admin stats** (`/admin/stats`, `components/StatsView.tsx`, `lib/statsQueries.ts`): range and choices live in the URL (parsed by `lib/statsParams.ts`/`statsRange.ts`); queries are raw SQL that bypasses access and hooks, so table/column names must follow any rename (`statsQueries.test.ts` checks). Details: `docs/claude/payload-features.md`.
- **Trash**: `words`, `posts`, `pages`, `themen` and `word-types` have `trash: true` (soft delete; reads skip trashed docs unless `trash: true`; a restore needs it on the update too). A trashed doc still holds its unique `slug`. Details (`liveLink`, admin groups, trashed suggestions): `docs/claude/payload-features.md`.
- **Editable site texts**: globals `home` (start page: intro, try-words, browse links, knowledge text, six sound rules, FAQ, about sentence; `facts` is a leftover of the old page, see **Pending contract** above; topic sayings and the magazine teaser quote/IPA live on `themen` and `posts`), `anki` (steps, features with `{liteWords}`/`{totalWords}`, FAQ), `company` (platforms, wallets, donation highlights, social links), `word-page` (word page: `storyPrompt`, the „Frage der Woche“ with `{Wort}`; empty = `STORY_PROMPT_DEFAULT`, filled by `storyPrompt()` in `lib/storyPrompt.ts`). Price (Polar) and layouts stay in code.
- **Word page data**: `words` has `stress`, `grammar`, `examples`, `facts`, `related`; rows may carry a public `contributorName` credit (hidden from MCP, not covered by the 90-day suggestion clean-up: named in the privacy policy). An MCP update replaces these arrays wholesale, `mcpKeepCredits` merges the credits back by row index. The old `infoText`/`sources` are gone. Details: `docs/claude/payload-features.md`.
- **Suggestions → words** (`hooks/adoptSuggestion.ts`, `lib/suggestionEntry.ts`, `hooks/suggestionLock.ts`): setting a suggestion to `accepted` takes effect at once in its transaction (new word is created **published**; example/fact/related append a credited row to the live `targetWord` and republish); it refuses with a readable 400 on a trashed, unpublished or draft-changed word. Accepting over MCP is refused (403), bulk accept is refused (400), a suggestion is locked while its linked `word` is published. Details: `docs/claude/payload-features.md`.
- **Suggestions/comments mail**: `afterChange` hooks mail the editors via Payload's nodemailer adapter (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` to the console). Site side: `website/CLAUDE.md`.
