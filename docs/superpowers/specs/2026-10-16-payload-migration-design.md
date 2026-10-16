# WordPress → Payload migration

Branch `feat/payload-migration`, stacked on `feat/docker-node` (PR #1800).

## Why

Two very different stacks (WordPress/PHP backend, Astro/Vue frontend) are too much to maintain. Logic that belongs in the backend runs in the Astro build instead (search-index enrichment, similar-sounding words, paging ~6000 words out of WPGraphQL with a disk cache so WordPress survives the build). Upcoming features (user accounts for the BON game, word feedback) need a real backend with users, which WordPress makes awkward. The suggest-word form is also broken security-wise: it calls WPGraphQL's `sendEmail` mutation straight from the browser, and the Turnstile token is only checked client-side (`isVerified` in `SuggestWordForm.vue`), so anyone can send mail without a CAPTCHA.

## Goal / done when

WordPress is switched off. Words, magazine posts and all other content are edited only in the Payload admin, and the public site serves everything from Payload. Visitors notice no difference.

## Non-goals

User accounts, game features, word feedback, S3 storage, a Payload MCP server. They come later and build on this.

## Anti-goals

- **Losing Google rankings.** Public URLs, slugs and SEO metadata stay identical. Anything whose URL does change gets a 301.
- **Word data becoming publicly fetchable.** The dataset is not open source. No unauthenticated endpoint may return word documents (single or bulk). The public site rendering a word page, and the slim search index it already ships, are fine. That is today's exposure.

## Decisions (made with Felix)

- **Payload 3** with **Postgres** (`@payloadcms/db-postgres`).
- **Monorepo in this public repo**, laid out like the official example [`payloadcms/payload/examples/astro`](https://github.com/payloadcms/payload/tree/3.x/examples/astro): a pnpm workspace with the Payload app as its own package (`payload/`, Next.js admin + API). The Astro app imports the Payload config as a workspace dependency. Only config and schema are public; data lives in the database.
- **One Docker Compose stack**: `web` (Astro, Node adapter from #1800), `payload` (admin + REST/GraphQL), `postgres`. Media on a **Docker volume** for now (S3 later, a storage-adapter swap).
- **Admin at `cms.berliner-schnauze.wtf`** (the Payload service behind the reverse proxy). Old WordPress media URLs (`…/wp-content/uploads/…`) are 301-redirected on that host.
- **DB backups with [Portabase](https://portabase.io)**, which replaces BackWPup. The compose stack exposes Postgres to Portabase. Setting up the Portabase job is part of the cutover checklist.
- **Mail via SMTP** for the suggest-word form, with credentials as runtime env (Infisical → `.env`).
- **Astro reads via the Payload Local API** (`getPayload({ config })`) server-side, with no HTTP hop and no public endpoint involved.
- **Payload's REST/GraphQL API stays for non-Astro consumers and requires auth** (API key on a user). Anonymous `read` on words (and anything not meant to be public) is denied by collection access control. Consumers: the Anki deck build (`scripts/build_anki_decks.py`, today WPGraphQL + Basic Auth) and the maintenance scripts in `scripts/` that use `scripts/lib/wp-rest.ts` (imports, `publish-drafts`, audits). The Anki build must be ported. The other scripts are ported or deleted case by case (many are one-off WP imports already done).
- **Astro is no longer purely static.** Word pages, Themen and magazine pages render on demand and are cached, so an edit in the admin is live without a rebuild. Pages that practically never change and use no Payload data (`/anki`, changelog, …) may stay prerendered.
- *(Claude's call)* **Everything derived from Payload data is on demand too**: `api/search/index.json` + `meta.json`, the homepage word list, the sitemap, and OG images (`src/pages/og/[wordSlug].ts`, rendered on first request and cached on a volume). So a new word gets its search hit, sitemap entry and OG image without a release, and **the build needs no database**. That keeps #1800's rule that the image is built on the runner with no secrets inside it. Existing PWA runtime caching (StaleWhileRevalidate for the search index) stays as is.
- **Derived word data is computed on save** in Payload hooks and stored as fields: syllable count, word types (NLP tags), consonant/vowel counts, word components (suffix tokens) and similar-sounding words. Anagrams and alphabetical neighbors are cheap and may stay at render time. The search stays **Orama in the browser** (it works offline in the PWA). `api/search/index.json` only assembles stored fields and computes nothing itself.
- **WordPress is cut over once and then switched off**, after a re-runnable import script has copied everything.

## What moves (current inventory)

All in `src/services/queries/`, `src/services/fragments/`, `src/stores/wordOfTheDay.ts`, `src/components/SuggestWordForm.vue`, `src/utils/article.ts`, `src/pages/[legalPages].astro`.

| WordPress today | Payload |
| --- | --- |
| `berlinerWords` CPT + ACF `wordProperties` (berlinerisch, article, translations[], alternativeWords[], examples[] with explanation + audio by gender, berlinerischAudio by gender, relatedWords → words, wikimediaFiles[], infoText, learnMore, sources[], images → media, berolinismus), `wordGroup`, `berlinerWordId`, dates, draft/publish status | `words` collection with drafts. Field names may be cleaned up; the frontend types adapt. |
| Taxonomies `berlinerischWordTypes`, `berlinerischThemen` | Collections `word-types`, `themen` (relationship fields) |
| Posts (magazine) with Gutenberg blocks (core image, core quote, HTML) + featured image | `posts` collection, Lexical rich text (image + quote blocks) |
| Yoast `seo` on words, posts, taxonomies | SEO group (title, description, canonical, OG title/description/image, robots noindex/nofollow), e.g. `@payloadcms/plugin-seo`, values imported 1:1 |
| Media library (images, audio) | `media` upload collection on the volume |
| Menus, legal pages (`getPage`), affiliate books, company funding/donation wallets, social media | Globals or small collections |
| `GET /wp-json/berliner-schnauze/v1/word-of-the-day` (browser fetch) | Astro on-demand endpoint (deterministic pick per day), same response shape or the store adapts |
| `sendEmail` mutation called from the browser | Astro Action / endpoint that **verifies the Turnstile token server-side**, validates with the existing zod schema and sends the mail over SMTP (sender stays the site for SPF, the suggester is reply-to). A `suggestions` collection to store submissions is optional. |
| BackWPup | Portabase (DB). The media volume needs its own backup (builder's choice, e.g. restic/rsync cron). |
| Sitemap dates (`getSitemapWordDates`) | Read from Payload |

## SEO / redirects

- `/wort/<slug>`, `/themen/<slug>`, `/magazin/<slug>` and the rest keep their paths. Slugs are imported verbatim.
- The Yoast output (title, meta description, canonical, OG/Twitter, robots) must render identically. Diff a sample of pages before and after.
- Media URLs change (`…/wp-content/uploads/…` → Payload media URLs). Anything indexed or shared under an old media URL gets a 301 to its new URL on `cms.berliner-schnauze.wtf`. The import records the old→new mapping for this. *(Assumption: WordPress runs on that host today. If it doesn't, the old host needs a redirect too.)*
- Sitemap with `lastmod` stays.

## Import

A re-runnable script (idempotent, keyed on the WP ID) reads everything from WordPress (WPGraphQL/REST, existing credentials) and writes it to Payload via the Local API: media first (download + upload), then taxonomies, words (two passes for `relatedWords`), posts, globals. It runs the derived-data hooks. It is re-run right before cutover.

## Constraints

- pnpm only. Project conventions in `CLAUDE.md` apply to the Astro app.
- Secrets via Infisical. The container gets runtime env via `.env` (see #1800 spec, "Dynamic routes").
- `ssr.noExternal: true` from #1800 will not survive Payload (native `pg`, `sharp` for Payload image sizes). Use the `pnpm deploy --prod` escape hatch described in the #1800 spec.
- The Imagor image service stays. It gets Payload media URLs instead of WP URLs.
- **CI / E2E cannot use real word data** (public repo). E2E runs against a Postgres seeded with a small fixture: the slugs in `E2E_REQUIRED_SLUGS` plus whatever pages the specs need. `E2E_WORD_LIMIT` and the dev words disk cache likely become obsolete.

## Claude's calls (check these)

- Derived-data routes and OG images on demand, no DB at build time (see Decisions).
- WYSIWYG/HTML fields (`infoText`, `learnMore`, example explanations, post HTML blocks) are **converted to Lexical**, since all future editing happens in Payload. A before/after render diff of a sample (the reference words `wa`, `anmachen`, `aasen` plus a few posts) catches regressions.
- **No draft preview** in this round. Drafts are visible in the admin. `SHOW_TEST_DATA` keeps working for dev.
- **Local dev DB**: until cutover, the import script fills it from WordPress. Afterwards, a restore from a prod dump (Portabase backup). CI uses the fixture seed.
- **Other WordPress dependencies** (MCP abilities, BackWPup, `SUGGEST_WORD_FORM_ID`, WP cron) are dropped or replaced as listed above. Nothing else is known to depend on WordPress.

## Left to the builder

Exact schema/field naming, Payload admin layout, how on-demand pages are cached (HTTP `Cache-Control` at the proxy, in-process cache, or both), whether `payload` and `web` share one process or run as two containers, how the MCP abilities Claude uses today get replaced (fine to drop for now), migration order, and whether the import script lives in `payload/` or `scripts/`.
