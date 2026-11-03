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
- Schema push in dev asks interactively (rename vs. create, data-loss confirm). Without a TTY the dev server hangs at it; run `pnpm payload run <boot script>` under `script -qfec … /dev/null` and answer, or migrate.

## Access and drafts

- **Drafts**: the Local API ignores access control unless asked — every site query spreads `siteRead()`, or `siteDocs()` for drafts listings (`website/src/services/payload.ts`: `overrideAccess: false` + `req.context.siteRead`), and `draftsRead`/`contentRead` (`src/access.ts`) then return published docs only, also in populated relations. REST stays login-only (it cannot set `req.context`). `SHOW_TEST_DATA` includes drafts on purpose (`siteDocs()`).
- The comment collections (`comments`, `comment-votes`, `comment-reports`) are login-only; the site queries them outside `siteRead()` with its own `status` filter and `depth: 0` (`website/CLAUDE.md`, Word comments). Keep access and that filter in step.
- First admin: in production `PAYLOAD_ALLOW_FIRST_USER=true` gates `POST /api/users`, but Payload's `/api/users/first-register` bypasses it. Cutover: create the first admin before the proxy route goes public.

## Derived fields and exports

- **Derived word fields** (`derived` group) are computed on save by the `beforeChange` hook from `src/lib/wordDerived.ts`, which the site also imports as `payload-app/word-derived` — keep it free of payload/next/config imports. `derived.decomposition` (compound parts) comes from `src/lib/decompose.ts` instead, CMS only: its 28 MB dictionary never loads in the site. Changing the derivation leaves existing words stale until re-saved (there is no bulk tool; write a `payload run` script that updates every word with `req.context[PRESERVE_CONTENT_MODIFIED_AT] = true` to keep the sitemap lastmod).
- `payload-app` exports: `.` (types via `src/astro.d.ts`, a hand-kept types-only mirror of `src/index.ts` — update both), `./word-derived`, `./lexical-html`, `./routes` (collection → site path, shared by SEO, redirects and rich-text links), `./preview` (signed preview tokens), `./comments` (pure comment rules: limits, link check, auto-hide, pseudonyms; no payload/next/config imports, like `./word-derived`), `./word-feedback` (pure feedback rules: answer lists, `MIN_GROUP`; same import rule).

## MCP (`@payloadcms/plugin-mcp`, `src/mcp.ts`)

`/api/mcp` on the cms host, so Claude can find/create/update `words` and find/update `suggestions` (no delete). Auth is a per-user key from the admin (`payload-mcp-api-keys`, every capability off until toggled per key); the tools run as that user. The tools default to `draft: false` and take `_status` as an argument, so `hooks/mcpDraftOnly.ts` (keyed on the documented `req.payloadAPI === "MCP"`) refuses any MCP write that publishes or edits a published word without `draft: true`. Field access in `collections/Suggestions.ts` hides `userName`/`userMail` from every MCP request (read, write result, query; the tools run with `overrideAccess: false`), and `lib/mcpGuards.ts` writes one metadata-only audit line per finished tool call to the cms log (`onEvent`, prefix `[mcp]`; never arguments or results). Every tool takes an optional `select` (Payload Select API, e.g. `{ slug: true }`); without it each result is the full document, so the collection descriptions in `mcp.ts` tell the client to set it. The enabled flags are columns of the keys table: changing them needs a migration. `MCP_DISABLED=true` switches the endpoint off. The site bundle aliases the plugin to `website/src/lib/payloadMcpStub.ts` (production build): the plugin drags the TypeScript compiler into the bundle, which crashes on `__filename` and 500s every page. Client: the `payload` server in `.mcp.json` reads the key from the env var `PAYLOAD_MCP_KEY` (URL override: `PAYLOAD_MCP_URL`, default prod). Never commit the key: put it in the git-ignored `.claude/settings.local.json` under `"env": { "PAYLOAD_MCP_KEY": "…" }` (or export it in the shell), then restart Claude Code and approve the server. Local databases get a fixed dev key from `DEV_MCP_KEY` (`dev:access`); the client still points at production unless `PAYLOAD_MCP_URL` is set (root `CLAUDE.md`, Worktree setup).

## Other features

- **Redirects** (`@payloadcms/plugin-redirects`, `src/redirects.ts`): `website/src/middleware/index.ts` answers a 404 with a matching redirect (`website/src/services/payload/redirects.ts`). Changing the slug of a public doc adds a 301 itself (`hooks/redirectOldSlug.ts`).
- **Draft preview**: the admin's preview button (words, posts) links to `/api/preview` with a token signed by `PAYLOAD_SECRET` (1 h); the site keeps it in an httpOnly cookie and renders the latest draft with `Cache-Control: private, no-store`. Admin and site are on different hosts, so the Payload login cookie is not used. The CMS builds the link from `SITE_URL`.
- **Jobs** (scheduled publishing of posts) run only where `PAYLOAD_RUN_JOBS=true` (the `cms` container), never in the site's Local API process.
- **Editable site texts**: globals `home` (facts), `anki` (steps, features with `{liteWords}`/`{totalWords}`, FAQ), `company` (platforms, wallets, donation highlights, social links). Price (Polar) and layouts stay in code.
- **Suggestions → words** (`hooks/adoptSuggestion.ts`, `hooks/suggestionLock.ts`, `lib/wordMatch.ts`): creating a suggestion or changing its Berliner Wort fills `similarWords` (same `matchKey` spelling, without its own word; a failing search is logged and skipped). Status `accepted` without a `word` creates a draft word and links it (an empty or taken slug is refused with 400); a hand-chosen `word` is only linked. A suggestion is locked while its linked word is published: derived from the word's `_status` (virtual field `lockedByWord`), so withdrawing or deleting the word unlocks it. The `update` access makes it read-only in the admin (REST/MCP get a 403); `refuseWhenLocked` is the backstop with a readable message for bulk and Local API updates. Deleting stays possible.
- **Suggestions/comments mail**: `afterChange` hooks mail the editors via Payload's nodemailer adapter (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` to the console). Site side: `website/CLAUDE.md`.
