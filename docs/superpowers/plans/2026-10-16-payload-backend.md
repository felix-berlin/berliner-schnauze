# Payload Backend + WordPress Import Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Payload 3 + Postgres backend in this repo that holds a complete, re-importable copy of all WordPress content, with authenticated-only API access. The Astro site is untouched and still reads WordPress.

**Architecture:** New pnpm workspace package `payload/` (Next.js admin + REST/GraphQL), Postgres and a media volume in `compose.yaml`. Derived word data is computed in a `beforeChange` hook from helpers that move out of `src/utils/wordHelper.ts` into the package. An idempotent import script copies WordPress → Payload via the Local API.

**Plan 2 (separate, after this one ships):** Astro reads Payload via Local API, on-demand rendering of word/Themen/magazine/search/sitemap/OG, suggest-word form with server-side Turnstile + SMTP, word of the day, Anki build port, CI E2E fixture seed, cutover + WordPress shutdown.

**Tech Stack:** Payload 3.91.x, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, Next.js 16 (≥16.3.3, Payload's peer range), React 19, Postgres 18, Vitest, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-16-payload-migration-design.md`

## Global Constraints

- pnpm only; new deps go through the repo's `minimumReleaseAgeExclude` policy in `pnpm-workspace.yaml` (fix age-gate with `pnpm clean --lockfile && pnpm install`).
- Package dir `payload/`, package name `payload-app` (as in the official `examples/astro`), Astro app stays at the repo root.
- Postgres via `@payloadcms/db-postgres`. Media on a Docker volume, no S3, **no `sharp`** (Imagor does all resizing, so no `imageSizes`).
- Anonymous REST/GraphQL `read` is **denied on every collection and global except `media`** (files must load on the public site). Auth = Payload users with `useAPIKey: true`.
- Public slugs imported **verbatim**. WP draft → Payload `_status: "draft"`, publish → `"published"`.
- Every imported document stores its WordPress origin (`wpId`, media `wpPath`) so the import is idempotent and the 301 map is derivable.
- Admin host: `https://cms.berliner-schnauze.wtf` (env `PAYLOAD_SERVER_URL`). WordPress lives on this host today. Until cutover Payload runs locally or on another host.
- Secrets via Infisical: `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_SERVER_URL`, `MEDIA_DIR`, plus the existing `WP_API`, `WP_AUTH_USER`, `WP_AUTH_PASS` for the import. **Felix adds the new ones to Infisical.** The executor lists them in the PR.
- Commit format per `CLAUDE.md`, scope `cms` for this plan.

## Review Focus

1. **Anonymous API access to words**: `GET /api/words`, `/api/words/:id`, the GraphQL `Words` query and `/api/globals/*` without auth must return 403/empty. One unprotected collection leaks the dataset. Pinned in Task 2.
2. **Import re-run**: a second run must update in place, never duplicate words, media or relations. Pinned in Task 6.
3. **Partial import failure** (a media download 404s, WP times out mid-pagination): the run must exit non-zero and print what failed, not report success with missing words. Pinned in Task 6.
4. **Edge-case headwords** for derived data: empty string, digits/punctuation (`08/15`), umlaut start (`Ärger`), multi-word (`Ballast der Republik`). Pinned in Task 4.
5. **Old media URL with a query string or URL-encoded umlaut** (`/wp-content/uploads/K%C3%BCche.jpg?ver=2`) must still 301 to the right file. Pinned in Task 2.

---

### Task 1: Workspace package, Postgres, users with API keys

**Files:**
- Modify: `pnpm-workspace.yaml` (add `packages: ["payload"]`; the root stays a package)
- Modify: `package.json` (root scripts `cms:dev`, `cms:test` → `pnpm --filter payload-app …`)
- Create: `payload/package.json`, `payload/tsconfig.json`, `payload/next.config.mjs`, `payload/src/payload.config.ts`, `payload/src/index.ts`, `payload/src/app/(payload)/**` (copy from `payloadcms/payload/examples/astro/payload/src/app` at tag `v3.91.0`), `payload/src/collections/Users.ts`, `payload/vitest.config.ts`, `payload/tests/helpers/payload.ts`, `payload/tests/boot.test.ts`
- Modify: `compose.yaml` (add `postgres` service + `pgdata` volume, healthcheck `pg_isready`)

**Interfaces:**
- Produces: `payload-app` exports `.` → `./src/index.ts` (`export { default as config } from "./payload.config"` + `payload-types`), and `./word-derived` → `./src/lib/wordDerived.ts` (Task 4).
- Produces: `getTestPayload(): Promise<Payload>` in `payload/tests/helpers/payload.ts`. It uses `DATABASE_URL_TEST` (fails loudly if unset, never skips) and `push` schema mode.
- Produces: scripts in `payload/package.json`: `dev` (`next dev -p 3001`), `build`, `start`, `test` (`vitest run`), `generate:types`, `import:wp` (Task 6).

- [ ] **Step 1: Scaffold the package from the example** with dependency versions pinned to `payload@3.91.0` and matching `@payloadcms/*`. Config: `db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } })`, `secret: PAYLOAD_SECRET`, `serverURL: PAYLOAD_SERVER_URL`, `editor: lexicalEditor()`, `typescript.outputFile: src/payload-types.ts`, `collections: [Users]`. `Users`: `auth: { useAPIKey: true }`, `admin.useAsTitle: "email"`.
- [ ] **Step 2: Add `postgres` to `compose.yaml`** (`image: postgres:18`, env `POSTGRES_DB=berliner_schnauze`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from `.env`, volume `pgdata:/var/lib/postgresql`, port `127.0.0.1:5432:5432` for local dev/Portabase).
- [ ] **Step 3: Write the failing boot test** in `payload/tests/boot.test.ts`:

```ts
it("boots and creates an API-key user", async () => {
  const payload = await getTestPayload();
  const user = await payload.create({
    collection: "users",
    data: { email: "bot@test.local", password: "x".repeat(16), enableAPIKey: true, apiKey: "k-test" },
  });
  expect(user.enableAPIKey).toBe(true);
});
```

- [ ] **Step 4: Run** `docker compose up -d postgres && (cd payload && DATABASE_URL_TEST=postgres://…/bs_test rtk vitest run tests/boot.test.ts)`. Expected first FAIL (no config), then PASS after Step 1 is complete.
- [ ] **Step 5: Verify the admin boots**: `pnpm cms:dev`, open `http://localhost:3001/admin`, create the first user. Expected: dashboard renders.
- [ ] **Step 6: Commit** `feat(cms): add payload workspace package with postgres`

### Task 2: Access control, media, old-URL redirects

**Files:**
- Create: `payload/src/access.ts`, `payload/src/collections/Media.ts`, `payload/src/app/wp-content/uploads/[...path]/route.ts`
- Test: `payload/tests/access.test.ts`, `payload/tests/mediaRedirect.test.ts`

**Interfaces:**
- Produces: `authenticated: Access` (`({ req }) => Boolean(req.user)`) and `anyone: Access` in `payload/src/access.ts`. **Every** collection/global after this uses `access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated }`. `Media.read` is the only `anyone`.
- Produces: `media` collection: `upload: { staticDir: process.env.MEDIA_DIR ?? "media", mimeTypes: ["image/*", "audio/*"] }`, fields `alt` (text), `caption` (text), `wpPath` (text, unique, indexed, admin readOnly; the old URL normalized by `wpUploadPath`).
- Produces: `wpUploadPath(url: string): string` (exported from the route module or a sibling `payload/src/lib/wpUploadPath.ts`). It normalizes an old URL to its `wp-content/uploads/…` path: query stripped, percent-decoded.

- [ ] **Step 1: Write failing tests**
  - `access.test.ts` (Local API with `overrideAccess: false` and no `user`, which runs the same access functions REST and GraphQL use): create one user and one `media` doc. `find({ collection: "users", overrideAccess: false })` throws `Forbidden`. `find({ collection: "media", overrideAccess: false })` succeeds. Task 3 and Task 5 append one line each per new collection/global (`words`, `word-types`, `themen`, `posts`, `pages`, `navigation`, `affiliate`, `company`) asserting `Forbidden`. Also assert that a user authenticated via API key (`user` passed) can read.
  - `mediaRedirect.test.ts`: `wpUploadPath("https://cms.berliner-schnauze.wtf/wp-content/uploads/K%C3%BCche.jpg?ver=2")` → `"Küche.jpg"`; `wpUploadPath("…/uploads/2023/05/a.mp3")` → `"2023/05/a.mp3"`.
- [ ] **Step 2: Run** `(cd payload && rtk vitest run tests/access.test.ts tests/mediaRedirect.test.ts)`. Expected: FAIL.
- [ ] **Step 3: Implement** access helpers, `Media`, and the route: `GET` normalizes the request path with `wpUploadPath`, looks up `media` where `wpPath` equals it, then returns `Response.redirect(<doc.url absolute>, 301)`, or 404.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(cms): lock api reads behind auth and redirect old media urls`

### Task 3: Taxonomies, SEO group, words schema

**Files:**
- Create: `payload/src/fields/seo.ts`, `payload/src/collections/WordTypes.ts`, `payload/src/collections/Themen.ts`, `payload/src/collections/Words.ts`
- Modify: `payload/src/payload.config.ts`, `payload/tests/access.test.ts`

**Interfaces:**
- Produces: `seoField: GroupField` named `seo` with fields `title`, `description` (textarea), `canonical`, `ogTitle`, `ogDescription`, `ogImage` (upload → media), `twitterTitle`, `twitterDescription`, `noindex` (checkbox), `nofollow` (checkbox). This is the subset of the Yoast fields the site renders (`PostTypeSeoFragment` / `TaxonomySeoFragment` in `src/services/fragments/fragments.ts`). `readingTime` is dropped (it is computed).
- Produces collections (all with `wpId: number` unique+indexed, admin readOnly, and `slug: text` unique+indexed):
  - `word-types`: `name`.
  - `themen`: `name`, `description` (textarea), `seo`.
  - `words` (`versions: { drafts: true }`, `admin.useAsTitle: "berlinerisch"`): `berlinerisch` (required), `berlinerWordId` (number), `article` (text), `translations` (array `{ translation }`), `alternativeWords` (array `{ alternativeWord }`), `examples` (array `{ example: text, exampleExplanation: textarea, exampleAudio: array { gender: select male|female, audio: upload media } }`), `berlinerischAudio` (array `{ gender, audio }`), `relatedWords` (relationship words, hasMany), `wikimediaFiles` (array `{ wikimediaFile, description, caption }`), `infoText` (richText), `learnMore` (text, URL), `berolinismus` (checkbox), `sources` (text, `hasMany: true`; WP returns `quelle` as an array), `images` (upload media, hasMany), `wordTypes` (relationship word-types, hasMany), `themen` (relationship themen, hasMany), `publishedAt` (date, from WP `dateGmt`), `seo`, `derived` (group, Task 4).
- WP `modifiedGmt` must survive as the sitemap `lastmod`. The import passes it as `data.updatedAt`, and Task 6's `run.test.ts` asserts the stored `updatedAt` equals the fixture's `modifiedGmt`. If Payload overwrites `updatedAt` regardless, add a `contentModifiedAt` date field instead: the import sets it from WP, a `beforeChange` hook sets it to now on edits that don't pass it, and Plan 2's sitemap reads it.

- [ ] **Step 1: Extend `access.test.ts`** with `Forbidden` assertions for `words`, `word-types`, `themen`. Add `payload/tests/words.test.ts`: create a word with `slug: "aasen"`; a second create with the same slug rejects; `_status` defaults to `draft`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement the collections**, register them, run `pnpm --filter payload-app generate:types`.
- [ ] **Step 4: Run tests, expect PASS.**
- [ ] **Step 5: Commit** `feat(cms): add words, themen and word types collections`

### Task 4: Derived word fields

**Files:**
- Create: `payload/src/lib/wordDerived.ts`, `payload/src/hooks/deriveWordFields.ts`
- Modify: `payload/src/collections/Words.ts` (`derived` group + `hooks.beforeChange`), `src/utils/wordHelper.ts` (re-export the moved functions), `src/pages/api/search/index.json.ts` (import `getWordComponents` from `payload-app/word-derived`), root `package.json` (`"payload-app": "workspace:*"`)
- Move deps: `de-compromise`, `natural`, `hypher` (+ `hyphenation.de` or whichever pattern pkg `src/utils/hypher.ts` uses) are also declared in `payload/package.json`.
- Test: `payload/tests/wordDerived.test.ts`, `payload/tests/words.test.ts`

**Interfaces:**
- Produces in `payload/src/lib/wordDerived.ts` (moved verbatim, same behavior): `countLetters`, `getWordType`, `translateNlpTags`, `WordTags`, `hypher`, `getWordComponents(word: string, minLen = 4): string[]`. New: `soundexCode(word: string): string` (`new natural.SoundEx().process`, `""` for empty), `wordGroupOf(word: string): string` (first char uppercased if `/\p{L}/u`, else `""`), and
  `deriveWordFields(berlinerisch: string): { wordGroup: string; characterLength: number; syllablesCount: number; consonantsCount: number; vowelsCount: number; nlpTags: WordTags[]; wordComponents: string[]; soundexCode: string }`. `nlpTags` = `translateNlpTags(getWordType(b))`, `syllablesCount` = `b ? hypher.hyphenate(b).length : 0`.
- `src/utils/wordHelper.ts` keeps its public API. The moved names are re-exported from `payload-app/word-derived`, so existing callers and tests stay unchanged.
- `words.derived` group (admin readOnly, sidebar) holds exactly those keys. `soundexCode` is `index: true`. Plan 2 queries similar-sounding words with `where: { "derived.soundexCode": { equals } }`, so nothing cascades on save.

- [ ] **Step 1: Write failing tests** in `wordDerived.test.ts`:

```ts
it.each([
  ["aasen", "A"], ["Ärger", "Ä"], ["08/15", ""], ["", ""],
])("wordGroupOf(%s) = %s", (w, g) => expect(wordGroupOf(w)).toBe(g));

it("derives fields for a multi-word headword", () => {
  const d = deriveWordFields("Ballast der Republik");
  expect(d.characterLength).toBe(20);
  expect(d.wordComponents).toContain("publik");
  expect(d.soundexCode).toBe(soundexCode("Ballast der Republik"));
});

it("handles the empty headword", () => {
  expect(deriveWordFields("")).toMatchObject({ syllablesCount: 0, characterLength: 0, soundexCode: "", wordComponents: [] });
});
```

  In `words.test.ts`: creating `{ berlinerisch: "aasen" }` stores `derived.wordGroup === "A"`. Updating `berlinerisch` to `"Bulette"` updates `derived.wordGroup` to `"B"`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Move the helpers**, add the hook (`beforeChange` sets `data.derived = deriveWordFields(data.berlinerisch ?? originalDoc.berlinerisch ?? "")`), wire the re-exports.
- [ ] **Step 4: Run** `(cd payload && rtk vitest run)` **and** the existing Astro tests that cover the moved code: `pnpm vitest run src/tests/unit/utils/wordHelper.test.ts src/tests/unit/pages/api/search/index.json.test.ts`. Expected: all PASS, Astro tests unchanged.
- [ ] **Step 5: Verify the Astro dev build still resolves the workspace import**: `pnpm typechecking` (slow, run once here). Expected: no new errors.
- [ ] **Step 6: Commit** `feat(cms): compute derived word fields on save`

### Task 5: Posts, pages, globals

**Files:**
- Create: `payload/src/collections/Posts.ts`, `payload/src/collections/Pages.ts`, `payload/src/globals/Navigation.ts`, `payload/src/globals/Affiliate.ts`, `payload/src/globals/Company.ts`
- Modify: `payload/src/payload.config.ts`, `payload/tests/access.test.ts`

**Interfaces:**
- `posts` (drafts): `wpId`, `slug`, `title`, `excerpt` (textarea, HTML stripped), `publishedAt` (date), `featuredImage` (upload), `content` (richText, Lexical with default features incl. upload + blockquote), `seo`.
- `pages`: `wpId`, `slug`, `title`, `content` (richText), `seo`. Imported: `datenschutz`, `impressum`.
- Global `navigation`: arrays `main`, `footer1`, `footer2`, each item `{ title, link, rel?, description? }` (same shape as `MenuItem` in `src/services/queries/getMenu.ts`; WP menus `Main Menu`, `Footer Nav 1`, `Footer Nav 2`).
- Global `affiliate`: `books` array `{ title, description, href, imageUrl, imageAlt, badge, badgeModifier }`, `disclaimers` array `{ plattform, text }` (mirrors the `Affiliate` query).
- Global `company`: `funding` array `{ name, link?, adresse? }` (raw WP rows; the platform/wallet grouping stays in the frontend), `socialMedia` array `{ network, label, profile, rel? }`.

- [ ] **Step 1: Extend `access.test.ts`** with `Forbidden` for `posts`, `pages` and `findGlobal` of `navigation`, `affiliate`, `company` with `overrideAccess: false`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**, regenerate types.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(cms): add posts, pages and site globals`

### Task 6: WordPress import

**Files:**
- Create: `payload/src/import/wp.ts` (GraphQL fetch + queries), `payload/src/import/mappers.ts` (pure WP → Payload data), `payload/src/import/html.ts` (HTML → Lexical), `payload/src/import/run.ts` (orchestration)
- Test: `payload/tests/import/mappers.test.ts`, `payload/tests/import/html.test.ts`, `payload/tests/import/run.test.ts`, fixtures `payload/tests/import/fixtures/{word-aasen,word-wa,post}.json` (hand-trimmed WPGraphQL responses; **public words only**, these three are on the live site)

**Interfaces:**
- `wpGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T>`: POST to `WP_API` with Basic Auth from `WP_AUTH_USER`/`WP_AUTH_PASS` (same as `src/services/wpGraphqlClient.ts`). Throws on HTTP or GraphQL errors. Queries copy the field selections of `src/services/fragments/fragments.ts` + `src/services/queries/*` as plain strings, **plus `databaseId`** on every node. Words paginate 100/page sequentially, both stati `DRAFT`, `PUBLISH`.
- `htmlToLexical(html: string, config: SanitizedConfig): Promise<SerializedEditorState>` via `convertHTMLToLexical` + `editorConfigFactory.default` from `@payloadcms/richtext-lexical` and `JSDOM` (add `jsdom`).
- `type ImportRefs = { mediaIdByUrl: Map<string, number>; wordTypeIdByName: Map<string, number>; themaIdBySlug: Map<string, number>; wordIdByWpId: Map<number, number> }`. Media URLs are keyed by `wpUploadPath(url)` (Task 2).
- `collectMediaUrls(words, posts, pages, themen): string[]`: every audio URL, image `sourceUrl`, featured image and `seo.opengraphImage.sourceUrl`, deduplicated.
- `mapWord(node: WpWord, refs: ImportRefs, config): Promise<Omit<Word, "id" | "derived" | "relatedWords">>` and `mapRelatedWords(node: WpWord, refs): number[]`. Pass 2 ignores related IDs that are missing and **counts** them in the report.
- `mapSeo(seo: WpSeo | null, refs): Word["seo"]`.
- `mapPost(node: WpPost, refs, config): Promise<…>`: blocks in `order`. Consecutive non-image blocks have their `saveContent` HTML joined and converted with `htmlToLexical`. Each `core/image` block becomes a Lexical upload node `{ type: "upload", relationTo: "media", value: mediaId, version: 3, format: "", fields: null }`. Root children are concatenated.
- `runImport(payload: Payload, opts?: { only?: ("media"|"taxonomies"|"words"|"posts"|"pages"|"globals")[] }): Promise<ImportReport>`, with `ImportReport = { created: Record<string, number>; updated: Record<string, number>; missingRelated: number; failures: { kind: string; ref: string; error: string }[] }`.
  Order: media → word-types → themen → words pass 1 → words pass 2 (relatedWords) → posts → pages → globals. Upsert = `find` by `wpId`/`wpPath`, then `update` or `create`, with `draft`/`_status` set from the WP status. Media: `fetch(url)` → `payload.create({ collection: "media", data: { wpPath: wpUploadPath(url), alt }, file: { data, mimetype, name, size } })`. Existing `wpPath` → skip download.
  CLI entry (`pnpm --filter payload-app import:wp` → `payload run src/import/run.ts`) prints the report and **exits 1 if `failures.length > 0`**.

- [ ] **Step 1: Write failing mapper tests** (`mappers.test.ts`), with a stub `ImportRefs`:
  - `aasen` fixture → `slug: "aasen"`, `berlinerisch: "aasen"`, `translations[0].translation` equals the fixture's first translation, `sources` is a flat string array, `infoText` is a Lexical root whose first paragraph text equals `"Adjektiv zu „Aas“, das in verstärkender Bedeutung („sehr“) auch als Adverb gebraucht wird."`, `_status` matches the fixture's `status`.
  - `wa` fixture: example audio maps to `{ gender, audio: <mediaId from refs> }`.
  - `collectMediaUrls` on both fixtures returns the `cms.berliner-schnauze.wtf/wp-content/uploads/…` URLs, deduplicated.
  - `mapSeo` maps `metaRobotsNoindex: "noindex"` → `noindex: true`. Check the fixture for Yoast's actual value format and pin it.
- [ ] **Step 2: Write failing `html.test.ts`**: `<p>a <strong>b</strong></p><blockquote><p>q</p></blockquote>` → root with a paragraph (text `a `, bold `b`) and a `quote` node. The post fixture → `mapPost` yields an upload node at the image block's position.
- [ ] **Step 3: Write failing `run.test.ts`** against `getTestPayload()`, with `wpGraphql` and `fetch` mocked (`vi.mock("../../src/import/wp")`, `vi.spyOn(globalThis, "fetch")` returning a 1-byte PNG/MP3):
  - **Idempotent:** `runImport` twice → word count 2, media count = unique URLs, second report has `created.words === 0`, `updated.words === 2`.
  - **Failure is loud:** one media URL returns 404 → `report.failures` has that URL with `kind: "media"`, and the CLI wrapper's exit code is 1 (test the exported `exitCodeFor(report)`).
  - **Relations:** `aasen.relatedWords` points to `wa`'s Payload ID when the fixture links them.
  - **Dates:** the stored word's modified date equals the fixture's `modifiedGmt` (see Task 3 for the fallback field).
- [ ] **Step 4: Run** `(cd payload && rtk vitest run tests/import)`. Expected: FAIL.
- [ ] **Step 5: Implement** `wp.ts`, `html.ts`, `mappers.ts`, `run.ts`.
- [ ] **Step 6: Run tests, expect PASS.**
- [ ] **Step 7: Commit** `feat(cms): add idempotent wordpress import`

### Task 7: Docker image, compose service, CI

**Files:**
- Create: `payload/Dockerfile`, `payload/.dockerignore`
- Modify: `payload/next.config.mjs` (`output: "standalone"`), `payload/src/payload.config.ts` (`db: postgresAdapter({ …, prodMigrations: migrations })`), create `payload/src/migrations/` via `payload migrate:create initial`
- Modify: `compose.yaml` (service `cms`: image `ghcr.io/felix-berlin/berliner-schnauze-cms:${TAG:-latest}`, `depends_on: postgres (healthy)`, volume `media:/app/media`, `MEDIA_DIR=/app/media`, `env_file .env`, port `3001`, healthcheck `fetch('http://localhost:3001/api/users/me')` (`200` with `user: null`))
- Modify: `.github/workflows/unit-test.yml` (job `cms-test`: `services.postgres` `postgres:18`, `DATABASE_URL_TEST`, `pnpm --filter payload-app test`)
- Modify: `.github/workflows/release.yml` `docker` job (second build+push for `payload/` with the same tag scheme)
- Modify: `CLAUDE.md` (Commands: `pnpm cms:dev`, `pnpm cms:test`, `pnpm --filter payload-app import:wp`; one line under Architecture about the `payload/` package)

**Interfaces:**
- Consumes everything above. Produces image `ghcr.io/felix-berlin/berliner-schnauze-cms`.

- [ ] **Step 1: Multi-stage Dockerfile**: build stage `node:24-slim` with `pnpm --filter payload-app build`, runtime `gcr.io/distroless/nodejs24-debian13:nonroot` copying `.next/standalone`, `.next/static`, `public`. The build must not need a database (`next build` with Payload only reads config). If it does, set `PAYLOAD_DISABLE_DB_CONNECT` or document a dummy `DATABASE_URL` build-arg. Never bake a real one.
- [ ] **Step 2: Build and run locally**: `docker compose up --build cms postgres`, then `curl -sI localhost:3001/admin` → `200`; `curl -s localhost:3001/api/words` → `403`.
- [ ] **Step 3: Push the branch and check the `cms-test` job is green.**
- [ ] **Step 4: Commit** `build(cms): add docker image, compose service and ci job`

### Task 8: Real import dry run (manual verification)

No new code. Gate before Plan 2.

- [ ] **Step 1:** Locally, with Infisical secrets: `docker compose up -d postgres && pnpm --filter payload-app import:wp`. Expected: exit 0, report shows ≈5935 words, ≈100 posts at most, 2 pages, `failures: []`.
- [ ] **Step 2: Spot-check in the admin**: `wa`, `anmachen`, `aasen` (the reference words, see memory `word-detail-test-words`): translations, examples with audio playing, images, info text formatting, Themen, SEO fields, `derived` group filled.
- [ ] **Step 3: Re-run the import.** Expected: `created` all 0 (except new WP content in between), no duplicates in the admin list counts.
- [ ] **Step 4: Old media URL**: `curl -sI "localhost:3001/wp-content/uploads/na_allet_in_butta.mp3"` → `301` to `/api/media/file/…`, and that URL returns `200 audio/mpeg`.
- [ ] **Step 5: Anonymous API check** with the populated DB: `/api/words?limit=1`, `/api/graphql` `{ Words { docs { slug } } }`, `/api/globals/navigation` all deny.
- [ ] **Step 6:** Note the report numbers in the PR description.
