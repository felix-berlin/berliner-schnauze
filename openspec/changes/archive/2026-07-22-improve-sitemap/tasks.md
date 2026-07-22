## 1. Verify backend fields

- [x] 1.1 Confirm WPGraphQL date fields. **Done:** `posts` expose `date` + `modifiedGmt`; `BerlinerischThema` is a taxonomy term with no date field → Themen get no `lastmod` (user-confirmed).

## 2. Generalize the date-fetch service

- [x] 2.1 In `src/services/queries/getSitemapWordDates.ts`, generalize the paginated fetch helper so it can query any content-type root field for `{ slug, modifiedGmt }`, keeping the urql-free, `process.env.WP_API` + Basic-auth-header pattern.
- [x] 2.2 Export `getPostDates()` alongside the existing `getWordDates()`, each returning a cached `Promise<Map<slug, isoDate>>` with its own module-level cache.

## 3. Wire dates into the sitemap

- [x] 3.1 In `astro.config.mjs`, extract the `filter` predicate to a named, importable pure function (`sitemapFilter`) that keeps `/magazin/` and `/themen/` and drops `/settings*` and the BON `/share` route.
- [x] 3.2 Extend the sitemap `serialize` to match `/wort/` and `/magazin/` URLs and set `lastmod` from the matching date map; emit the URL without `lastmod` when no date resolves (and for `/themen/`).

## 4. Tests

- [x] 4.1 Update `src/tests/unit/services/getSitemapWordDates.test.ts` to cover `getPostDates()` (slug→ISO mapping, pagination, cache reuse, missing-timestamp handling).
- [x] 4.2 Add a test for the extracted `filter` predicate asserting `/magazin/<slug>` and `/themen/<slug>` are kept while `/settings` and `/share` are dropped.

## 5. Verify

- [x] 5.1 Ran the sitemap test file (13 pass) and `pnpm lint` (clean). `pnpm typechecking`: my changed file has 0 diagnostics; the 1 reported error is pre-existing in the generated `tests/unit/coverage/prettify.js` artifact, unrelated to this change.
- [x] 5.2 Ran `pnpm build:local` (1375 pages). Verified in `dist/sitemap-0.xml`: `/wort/` + `/magazin/` URLs carry `<lastmod>`, the 1 published magazine article is present (sitemap count == backend count), `/themen/` URLs present without lastmod.
