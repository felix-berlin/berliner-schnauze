# Word Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every published word page gets like/dislike buttons with counts and a step-by-step "Sagste det noch?" card (usage → residence map → origin → Ost/West → age → comparison), stored per visitor and word in Payload and counted in the admin.

**Architecture:** One new Payload collection `word-feedback` (one row per visitor + word, login-only). Pure option constants and a counting helper live in a new `payload-app/word-feedback` export, used by the admin `ui` field and the site API. The site exposes `GET`/`PATCH /api/word-feedback` (visitor cookie + rate limits, modelled on `comment-votes.ts`). Two Vue islands (thumbs in the hero, card after the examples) share one nanostore per page; the profile lives in localStorage.

**Tech Stack:** Payload 3 (Postgres), Astro 7 API routes, Vue 3 `<script setup>`, nanostores, VueUse, zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-word-feedback-design.md`

## Global Constraints

- pnpm only. Import aliases (`@components/…`, `@stores/…`), never relative paths across folders.
- Vue: `<script setup lang="ts">`, block order template → script → style, unscoped `<style lang="scss">` that `@use`s its own `src/styles/components/_<name>.scss`; BEMIT classes (`c-word-feedback-card__…`, `c-word-feedback-thumbs__…`, `c-berlin-area-map__…`). Answer buttons are `.c-choice` (`aria-pressed`), text actions `.c-link`, no per-component button CSS (docs/design/wortseite/SPEC.md).
- Icons: Lucide via `defineAsyncComponent(() => import("virtual:icons/lucide/thumbs-up"))` / `thumbs-down`. No emoji anywhere.
- Look: `DESIGN.md` (dashed borders, currywurst orange selection, `mx.paper-card`). Functional text ≥ 11 px; text on orange meets WCAG AA. Verified in light + dark, desktop + 360 px mobile.
- Migrations are expand-only: one new table; nothing changes on `words`. After the schema edit: `pnpm --filter payload-app generate:types`, then `pnpm cms:migrate:create word_feedback`.
- No counts stored on `words` (versioned with drafts). Count live from `word-feedback`.
- No stored IPs; the only identity is the existing visitor cookie (`visitorId()` in `src/services/payload/comments.ts`).
- Copy (exact): like "Jefällt ma", dislike "Nee", hint "Sagste det noch? Hier abstimmen ↓"; card title "Sagste det noch?"; usage "Sag ick selbst" / "Kenn ick" / "Nie jehört"; "Wo wohnste?" with "Woanders"; "Uffjewachsen oder zujezogen?" with "Hier uffjewachsen" / "Zujezogen, über 10 Jahre her" / "Zujezogen, unter 10 Jahren"; "In welcher Hälfte?" with "Ost" / "West" / "Beides / nach der Wende"; "Wie alt biste?" with "unter 20", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"; skip link "überspringen"; "Angaben ändern".
- Comparison groups are shown only with ≥ `MIN_GROUP = 10` usage votes.

## Review Focus

1. **Request fails or offline mid-flow** (PATCH rejects): the answer stays selected locally, a toast says it wasn't saved, the step does not advance. Test in Task 5.
2. **Malformed localStorage profile** (hand-edited, old shape): treated as "no profile", island keeps working. Test in Task 5.
3. **Origin changed away from "grewUp"** after `half` was set: the server clears `half`; `half` without `origin = grewUp` is a 400. Test in Task 3.
4. **Double click / two islands racing on first vote** (unique violation on `word`+`visitor`): second request updates the row instead of failing. Test in Task 3.
5. **Feedback on a draft or unknown word id**: 404, no row written. Test in Task 3.

---

### Task 1: `word-feedback` collection and shared options

**Files:**
- Create: `payload/src/lib/wordFeedback.ts`
- Create: `payload/src/collections/WordFeedback.ts`
- Modify: `payload/src/payload.config.ts` (add to `collections`), `payload/package.json` (`exports["./word-feedback"]`, same shape as `./comments`), `payload/src/astro.d.ts` only if the types mirror needs it
- Create: `payload/src/migrations/<timestamp>_word_feedback.ts` (generated)
- Test: `payload/tests/access.test.ts` (add `"word-feedback"` to `lockedCollections`), `payload/tests/wordFeedback.test.ts`

**Interfaces:**
- Produces (`payload-app/word-feedback`, no payload/next/config runtime imports):
  - `REACTIONS = ["like", "dislike"] as const`
  - `USAGES = ["say", "know", "never"] as const`
  - `AREAS = ["mitte", "wedding-tiergarten", "friedrichshain", "kreuzberg", "pankow", "lichtenberg", "marzahn-hellersdorf", "treptow-koepenick", "reinickendorf", "spandau", "charlottenburg-wilmersdorf", "steglitz-zehlendorf", "tempelhof-schoeneberg", "neukoelln", "brandenburg", "elsewhere"] as const`
  - `ORIGINS = ["grewUp", "movedOver10", "movedUnder10"] as const`, `HALVES = ["east", "west", "both"] as const`
  - `AGES = ["u20", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80plus"] as const`
  - `MIN_GROUP = 10`
  - types `Reaction`, `Usage`, `Area`, `Origin`, `Half`, `Age` (element types of the arrays)
  - `type FeedbackTotals = { like: number; dislike: number; say: number; know: number; never: number }`
  - `type FeedbackCompare = { east: number | null; west: number | null; moved: number | null; area: number | null }` (percent 0–100 of `usage = "say"`, rounded, `null` below `MIN_GROUP`)
  - `feedbackTotals(payload: Pick<BasePayload, "count">, wordId: number): Promise<FeedbackTotals>`
  - `feedbackCompare(payload: Pick<BasePayload, "count">, wordId: number, area: Area | null): Promise<FeedbackCompare>`
- Collection slug `word-feedback`, fields per spec table (`word` relationship required, `visitor` text required, the rest `select` nullable with the arrays above), `indexes: [{ fields: ["word", "visitor"], unique: true }]`, `access: authenticatedOnly`, `admin.defaultColumns: ["word", "usage", "reaction", "area", "origin", "age"]`.

- [ ] **Step 1: Write the failing tests.** In `access.test.ts` add `"word-feedback"` to `lockedCollections`. In `wordFeedback.test.ts` (throwaway DB like `comments.test.ts`), seed one published word and rows, then assert:
  - `feedbackTotals` → `{ like: 2, dislike: 1, say: 3, know: 1, never: 0 }` for rows (like+say, like+say, dislike+say, null+know, dislike+null)
  - `feedbackCompare` with 10 rows `half: "east"` of which 7 `say` → `east: 70`; with 9 `west` rows → `west: null`; rows without `usage` are not counted in any group
  - creating a second row with the same `word` + `visitor` throws a unique violation
- [ ] **Step 2: Run** `pnpm cms:test -- wordFeedback access` → FAIL (collection unknown).
- [ ] **Step 3: Implement** `wordFeedback.ts` and `WordFeedback.ts`, register the collection, add the package export. `feedbackCompare` groups: east = `half = east`, west = `half = west`, moved = `origin in [movedOver10, movedUnder10]`, area = `area = <given>` (skip when `null`); every group also requires `usage exists`.
- [ ] **Step 4: Generate** types and the migration (commands in Global Constraints). Run `pnpm cms:test -- wordFeedback access` → PASS.
- [ ] **Step 5: Commit** `feat(word): add word-feedback collection and shared options`.

### Task 2: Admin counts on the word

**Files:**
- Create: `payload/src/components/WordFeedbackCounts.tsx` (React server component)
- Modify: `payload/src/collections/Words.ts` (add `ui` field `feedbackCounts`, `admin.position: "sidebar"`, `admin.components.Field: "@/components/WordFeedbackCounts"` (path style as Payload's importMap expects)), `payload/src/app/(payload)/admin/importMap.js` (regenerate with `pnpm --filter payload-app payload generate:importmap`)
- Test: `payload/tests/wordFeedback.test.ts`

**Interfaces:**
- Consumes: `feedbackTotals` (Task 1).
- Renders: "Jefällt ma N · Nee N" and "Sag ick selbst N · Kenn ick N · Nie jehört N", plus a link to the `word-feedback` list filtered by this word (`/admin/collections/word-feedback?where[word][equals]=<id>`). On a new (unsaved) word it renders nothing.

- [ ] **Step 1: Write the failing test:** `Words` config has a field named `feedbackCounts` of type `ui`; saving a word does not create a row in `word-feedback` and the word's version count does not change when a feedback row is created (guards against the counter-on-word pattern).
- [ ] **Step 2: Run** `pnpm cms:test -- wordFeedback` → FAIL.
- [ ] **Step 3: Implement** the component (`props.payload` / `req.payload` from the server component props, `feedbackTotals(payload, Number(id))`) and the field.
- [ ] **Step 4: Run** the test → PASS; start `pnpm cms:dev`, open a word, see the sidebar block (owner checks visually).
- [ ] **Step 5: Commit** `feat(cms): show word feedback counts in the word sidebar`.

### Task 3: Site API `GET`/`PATCH /api/word-feedback`

**Files:**
- Create: `website/src/utils/wordFeedbackSchema.ts`, `website/src/pages/api/word-feedback.ts`
- Test: `website/src/tests/unit/pages/api/word-feedback.test.ts` (mock style of `comment-votes.test.ts`)

**Interfaces:**
- Consumes: Task 1 constants/helpers, `visitorId`, `clientIp`, `rateLimitedBy`, `reply`, `isUniqueViolation`, `orNull`.
- Produces:
  - `feedbackPatchSchema` (zod): `{ word: positive int, reaction?: Reaction | null, usage?: Usage | null, area?: Area | null, origin?: Origin | null, half?: Half | null, age?: Age | null }`, strict (unknown keys rejected); refine: `half` non-null requires `origin === "grewUp"`.
  - `type MyFeedback = { reaction: Reaction | null; usage: Usage | null; area: Area | null; origin: Origin | null; half: Half | null; age: Age | null }`
  - `type WordFeedbackState = { mine: MyFeedback | null; totals: FeedbackTotals; compare: FeedbackCompare }` — the body of both GET and PATCH.
  - `GET /api/word-feedback?word=<id>`: reads cookie without creating it (`visitorId(cookies, false)`); `compare` uses `mine?.area ?? null`.
  - `PATCH /api/word-feedback` with `feedbackPatchSchema` body: creates cookie, upserts (create; on unique violation re-find and update), applies only the keys present; when `origin` is set to anything but `"grewUp"`, also sets `half: null`.
  - Rate limits: `rateLimitedBy(ip, \`word-feedback ${word}\`, 30, DAY)` and `rateLimitedBy(ip, "word-feedback-all", 500, DAY)` → 429 "Jenug jestimmt für heute."
  - Word check: `payload.findByID({ collection: "words", id, depth: 0, ...siteRead() })` via `orNull`; missing → 404 "Wort nicht gefunden". Errors → 502 "Die Stimme konnte leider nicht gezählt werden."

- [ ] **Step 1: Write the failing tests:**
  - first PATCH `{ word: 7, usage: "say" }` → 200, cookie set, `create` called with `{ word: 7, visitor: <id>, usage: "say" }`, body has `mine.usage === "say"`
  - PATCH with existing row → `update` with only the sent keys
  - PATCH `{ word: 7, origin: "movedOver10" }` → update data `{ origin: "movedOver10", half: null }`
  - PATCH `{ word: 7, half: "east" }` without `origin: "grewUp"` in the body → 400 (the refine is body-only; the client always sends `origin` and `half` together)
  - PATCH `{ word: 7, reaction: null }` → update `{ reaction: null }`
  - unique violation on create → re-find + update, 200
  - unknown key `{ word: 7, foo: 1 }` → 400; `area: "atlantis"` → 400
  - `findByID` resolves null (draft/unknown) → 404, no create/update
  - 31st PATCH for the same word and IP → 429
  - GET without cookie → `mine: null`, totals from mocked `count`
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/pages/api/word-feedback.test.ts)` → FAIL.
- [ ] **Step 3: Implement** schema and route.
- [ ] **Step 4: Run** the test → PASS.
- [ ] **Step 5: Commit** `feat(word): add word feedback API`.

### Task 4: Berlin area map component

**Files:**
- Create: `scripts/berlin-map/build.py` (from the spike `.superpowers/brainstorm/335196-1793630504/map-spike/split.py`, extended to emit TS), `website/src/data/berlinAreas.ts` (generated, committed), `website/src/components/word-feedback/BerlinAreaMap.vue`, `website/src/styles/components/_berlin-area-map.scss`
- Test: `website/src/tests/unit/components/word-feedback/BerlinAreaMap.test.ts`

**Interfaces:**
- Produces:
  - `berlinAreas.ts`: `export const MAP_VIEWBOX: string`, `export const BERLIN_AREAS: ReadonlyArray<{ key: Exclude<Area, "brandenburg" | "elsewhere">; name: string; short: string; side: "east" | "west"; d: string; labelX: number; labelY: number }>` (12 entries; `name` full, e.g. "Wedding/Tiergarten", `short` map label, e.g. "X'berg"). Header comment: source URLs + licence line.
  - `BerlinAreaMap.vue`: props `modelValue: Area | null`; emits `update:modelValue(Area)`. Renders an SVG with a Brandenburg frame + 12 paths, each a focusable control in one `role="radiogroup"` (`aria-label="Wo wohnste?"`), `role="radio"`, `aria-checked`, `aria-label` = full name; arrow keys move between areas, Enter/Space selects. Below it a "Woanders" button emitting `"elsewhere"`. Narrow containers (`NARROW_PX`) show a list first and the map behind a `<summary>`.

- [ ] **Step 1: Check the licence** of both GeoJSON sources (Geoportal Berlin / FIS-Broker metadata for "Bezirksgrenzen" and "LOR Ortsteile"). Record name + attribution requirement in the `berlinAreas.ts` header; if attribution is required, add it under the map (small text, ≥ 11 px). If the licence forbids reuse, stop and tell the owner.
- [ ] **Step 2: Generate** `berlinAreas.ts` with `python3 -I scripts/berlin-map/build.py <bezirke.geojson> <ortsteile.geojson> > website/src/data/berlinAreas.ts`. Label positions: use each polygon's area centroid (not the vertex mean the spike used), so no label leaves its area; check by eye in the browser.
- [ ] **Step 3: Write the failing tests:** renders 12 `role="radio"` + Brandenburg + "Woanders"; clicking "Kreuzberg" emits `"kreuzberg"`; `modelValue: "pankow"` → that radio has `aria-checked="true"`; ArrowRight from the checked radio moves focus to the next; Enter on a focused radio emits its key.
- [ ] **Step 4: Run** `(cd website && rtk vitest run src/tests/unit/components/word-feedback/BerlinAreaMap.test.ts)` → FAIL, implement, → PASS.
- [ ] **Step 5: Commit** `feat(word): add Berlin area map with east/west split districts`.

### Task 5: Feedback store and profile

**Files:**
- Create: `website/src/stores/wordFeedback.ts`
- Test: `website/src/tests/unit/stores/wordFeedback.test.ts`

**Interfaces:**
- Consumes: `WordFeedbackState`, `feedbackPatchSchema` types (Task 3), option arrays (Task 1).
- Produces:
  - `$feedback = atom<WordFeedbackState | null>(null)`, `$feedbackError = atom<boolean>(false)`
  - `type Profile = { area?: Area | null; origin?: Origin | null; half?: Half | null; age?: Age | null }` — a key present with `null` means "skipped", absent means "not asked yet".
  - `$profile = persistentAtom<Profile>("bs-word-feedback-profile", {}, { encode: JSON.stringify, decode: (s) => parseProfile(safeJsonParse(s)) })` (`@nanostores/persistent`, already a dependency); `parseProfile(raw: unknown): Profile` drops unknown keys/values (malformed → `{}`).
  - `loadFeedback(wordId: number): Promise<void>` — GET once per word (second call is a no-op while loaded/loading).
  - `sendFeedback(wordId: number, patch: Partial<MyFeedback>): Promise<boolean>` — PATCH; on success sets `$feedback`, returns true; on failure sets `$feedbackError`, shows the toast "Hat nich jeklappt, versuch's nochma." via `createToastNotify`, returns false, `$feedback` unchanged.
  - `answerUsage(wordId, usage)`: sends `{ usage, ...profile }` (all answered/skipped profile keys) in one PATCH.
  - `nextStep(profile: Profile): "area" | "origin" | "half" | "age" | "done"` — first key not yet present; `"half"` only when `origin === "grewUp"`.

- [ ] **Step 1: Write the failing tests:** `parseProfile({ area: "atlantis", age: "30-39", x: 1 })` → `{ age: "30-39" }`; `parseProfile("garbage")` → `{}`; `nextStep({})` → `"area"`; `nextStep({ area: null })` → `"origin"`; `nextStep({ area: "pankow", origin: "grewUp" })` → `"half"`; `nextStep({ area: null, origin: "movedOver10" })` → `"age"`; `nextStep({ area: null, origin: null, age: null })` → `"done"`; `sendFeedback` with fetch rejecting → returns false, toast called, `$feedback` unchanged; `answerUsage` with profile `{ area: "pankow", origin: null }` sends body `{ word, usage, area: "pankow", origin: null }`.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/stores/wordFeedback.test.ts)` → FAIL, implement, → PASS.
- [ ] **Step 3: Commit** `feat(word): add word feedback store and profile`.

### Task 6: Thumbs in the hero

**Files:**
- Create: `website/src/components/word-feedback/WordFeedbackThumbs.vue`, `website/src/styles/components/_word-feedback-thumbs.scss`
- Modify: `website/src/components/word/WordHero.astro` (render `<WordFeedbackThumbs client:idle wordId={word.id} />` below the definition, not on drafts: pass `draft` the way the page passes it to comments)
- Test: `website/src/tests/unit/components/word-feedback/WordFeedbackThumbs.test.ts`

**Interfaces:**
- Consumes: `$feedback`, `loadFeedback`, `sendFeedback` (Task 5).
- Behaviour: two `aria-pressed` buttons with Lucide icons, label + count (`totals.like` / `totals.dislike`, count hidden until loaded); click inactive → `sendFeedback(id, { reaction, ...profile })` (spec: the stored profile also goes onto like-only rows); click active → `{ reaction: null }`; hint link "Sagste det noch? Hier abstimmen ↓" to `#sagste-det-noch`. `trackEvent("Word Feedback", "reaction", <like|dislike|none>)`.

- [ ] **Step 1: Write the failing tests:** both buttons render with labels "Jefällt ma"/"Nee" and icons `icon-lucide-thumbs-up`/`-down`; after load with `totals.like: 128` the like button shows "128"; with `$profile` `{ area: "pankow" }` clicking like sends `{ reaction: "like", area: "pankow" }`; with `mine.reaction: "like"` the button has `aria-pressed="true"` and clicking it sends `{ reaction: null }`; hint link `href="#sagste-det-noch"`.
- [ ] **Step 2: Run** → FAIL, implement, → PASS.
- [ ] **Step 3: Commit** `feat(word): add like/dislike to the word hero`.

### Task 7: "Sagste det noch?" card and page wiring

**Files:**
- Create: `website/src/components/word-feedback/WordFeedbackCard.vue`, `website/src/styles/components/_word-feedback-card.scss`
- Modify: `website/src/pages/wort/[...wordSlug].astro` (after `<WordSectionBeispiele …/>`: `{!draft && <div id='sagste-det-noch'><WordFeedbackCard client:visible wordId={word.id} /></div>}`)
- Test: `website/src/tests/unit/components/word-feedback/WordFeedbackCard.test.ts`, `website/src/tests/e2e/word-feedback.spec.ts`

**Interfaces:**
- Consumes: Tasks 4 and 5.
- Behaviour: exactly one step visible; a six-segment progress bar with "Schritt X von N", "← Zurück" (history-based; back to the first step withdraws the vote) and a "Warum fragen wa dit?" fold-out; states `usage` → (result bars) → `nextStep(profile)` … → `done`. Each answer: update `$profile`, `sendFeedback`, advance only on `true`. "überspringen" sets the profile key to `null`, sends it, advances. Choosing an origin other than `grewUp` also sets `half: null` locally. Done state: usage bars (percent + "N Stimmen") and the comparison rows whose value is non-null ("Ost-Berliner", "West-Berliner", "Zujezogene", "in <area name>"), plus "Angaben ändern" (clears the stored profile on the server and `$profile`, starts at `"area"`). Revisiting an answered word starts in the done state with `mine.usage` highlighted and the usage buttons still clickable. `trackEvent("Word Feedback", <step>, <value|skip>)`.

- [ ] **Step 1: Write the failing component tests:** initial state shows only the three usage buttons; clicking "Kenn ick" (send resolves true) shows bars and the "Wo wohnste?" step; with send resolving false the usage step stays; skip on area shows "Uffjewachsen oder zujezogen?"; "Hier uffjewachsen" leads to "In welcher Hälfte?", "Zujezogen, über 10 Jahre her" leads to "Wie alt biste?"; with a complete profile, answering usage goes straight to done; `compare.west: null` hides the "West-Berliner" row; "Angaben ändern" shows "Wo wohnste?".
- [ ] **Step 2: Run** → FAIL, implement, → PASS.
- [ ] **Step 3: Write the e2e spec** against the e2e seed (word `aasen`): answer "Sag ick selbst", pick Kreuzberg, "Hier uffjewachsen", "West", "30–39" → done state visible; reload → done state with "Sag ick selbst" highlighted; like → count +1, like again → back.
- [ ] **Step 4: Run** the e2e per CLAUDE.md (throwaway `bs_e2e`, `E2E_BUILD=1 pnpm build`, server on 4322) → PASS.
- [ ] **Step 5: Browser check** light + dark, 1280 px and 360 px: hero thumbs above the fold, every step, map tappable at 360 px (Friedrichshain, Kreuzberg, Mitte); if those are not reliably tappable, add a list of area buttons below the map. Contrast of white-on-orange checked.
- [ ] **Step 6: Commit** `feat(word): add Sagste det noch? card to word pages`.

### Task 8: Docs and privacy handoff

**Files:**
- Modify: `CLAUDE.md` (Architecture: one bullet for word feedback: collection, API, counts never on `words`, `payload-app/word-feedback` export; add `./word-feedback` to the `payload-app` exports list; add `word-feedback/` to the component feature groups)

- [ ] **Step 1:** Update `CLAUDE.md` as above.
- [ ] **Step 2:** Run `pnpm lint`, `pnpm typechecking`, `pnpm test:unit`, `pnpm cms:test` → all green.
- [ ] **Step 3:** Tell the owner (no code): the Datenschutz page is CMS content and needs a paragraph: per word vote we store the answers (usage, like/dislike, district, origin, east/west, age bracket) with a random visitor id from a cookie; no IP address.
- [ ] **Step 4: Commit** `docs: document word feedback`.
