# Word Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anonymous comments (one reply level, votes, reports, 5-minute self-edit) under every published word page, stored and moderated in Payload.

**Architecture:** Three Payload collections (`comments`, `comment-votes`, `comment-reports`) hold the data; Payload hooks keep denormalized counts, apply link-hold and auto-hide, and mail the editor. The Astro site exposes four API route files that call the Local API (no public REST), and a lazily hydrated Vue island renders the section with virtua.

**Tech Stack:** Payload 3.92 (Postgres), Astro 7 API routes, Vue 3 + VueUse + virtua 0.53 (`virtua/vue`), zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-word-comments-design.md`

## Global Constraints

- Plain text only, max **1000** characters per comment; name optional, max 50, shown as „Anonymer Berliner“ when empty.
- One reply level; replies chronological; top-level sort „Beste“ (score desc, ties newest first) or „Neueste“; default „Beste“.
- Link (`http(s)://…`, `www.…`, bare domain like `xyz.de`, `foo.com/bar`) ⇒ comment status `pending`, not public until released.
- Self-edit/delete window: **5 minutes**, same browser, edit key hashed (SHA-256) in DB.
- Auto-hide when `reports >= max(2, 3 + floor(score / 10))`, unless `reviewed`. Constants in one place.
- Rate limits per IP: post 5/10 min, edit+delete 10/5 min, vote 30/min, report 10/h, list GET 120/min.
- Report dedup: one counted report per IP per comment per 24 h, in memory only.
- No stored IP, no e-mail, no fingerprint. Visitor cookie = random UUID.
- Turnstile `appearance: "interaction-only"`; the word "Turnstile" never appears in UI copy.
- Copy in the site's cheeky Berlin voice; BEMIT, own SCSS file per component, `@use`, no scoped styles, path aliases, Lucide icons via `defineAsyncComponent`.
- New collections: `authenticatedOnly` access + entry in `lockedCollections` of `payload/tests/access.test.ts`. Schema change ⇒ `pnpm --filter payload-app generate:types` + `pnpm cms:migrate:create word_comments`, committed.
- UI checked in light + dark, desktop + mobile (CLAUDE.md).

## Review Focus

1. **Placeholder rows in paging:** a removed top-level comment without visible replies must vanish, and a page that shrinks because of that must still report `hasMore` correctly → test in Task 4 (`listComments` drops it, `hasMore` true).
2. **Edit key after the window / wrong key:** 5 min + 1 s or a wrong key must be refused with 403 without leaking whether the comment exists → tests in Task 5.
3. **Vote on a non-published comment** (pending, hidden, removed, deleted) must be refused, otherwise held spam gains score → test in Task 6.
4. **Reply to a reply via the API** (bypassing the UI) must attach to the top-level comment, not nest → test in Task 2 (`beforeValidate` re-parents).
5. **Rate-limit key collision:** GET list and POST create share the `/api/comments` prefix; they must count separately → test in Task 3.

---

## File Structure

**Payload (`payload/`)**
- `src/lib/comments.ts` — pure rules, no payload/next imports: `containsLink`, `hideThreshold`, `shouldAutoHide`, `COMMENT_MAX`, `NAME_MAX`, `EDIT_WINDOW_MS`, status type. Exported as `payload-app/comments` (site uses the same rules).
- `src/lib/notifyEditors.ts` — `notifyEditors(req, subject, lines)`: mails `SUGGEST_MAIL_TO`, logs and swallows failures.
- `src/collections/Comments.ts`, `src/collections/CommentVotes.ts`, `src/collections/CommentReports.ts` — schema + hooks.
- `src/hooks/commentCounts.ts` — `recountComment(req, commentId)`: recomputes up/down/score/reportCount and applies auto-hide.
- `src/payload.config.ts`, `package.json` (exports), `src/migrations/*` (generated).
- Tests: `tests/comments.test.ts`, `tests/commentRules.test.ts`, `tests/access.test.ts`.

**Site (`website/`)**
- `src/utils/rateLimit.ts` — new rules + method in key.
- `src/utils/commentSchema.ts` — zod schemas for create/edit/vote/report bodies.
- `src/services/payload/comments.ts` — `listComments`, `toPublicComment`, `PublicComment` type, visitor-cookie helper.
- `src/pages/api/comments/index.ts` (GET list, POST create), `src/pages/api/comments/[id].ts` (PATCH edit, DELETE), `src/pages/api/comment-votes.ts` (POST), `src/pages/api/comment-reports.ts` (POST).
- `src/components/TurnStile.vue` — `appearance` prop, `reset()` exposed.
- `src/composable/useComments.ts` — fetch/paging/sort/vote/report/edit state.
- `src/components/comments/WordComments.vue`, `CommentForm.vue`, `CommentCard.vue` + `src/styles/components/_word-comments.scss`, `_comment-form.scss`, `_comment-card.scss`.
- `src/pages/wort/[...wordSlug].astro` — mount island.
- Tests under `src/tests/unit/` mirroring these paths.

---

### Task 1: Comment rules (pure functions)

**Files:**
- Create: `payload/src/lib/comments.ts`
- Modify: `payload/package.json` (add `"./comments": "./src/lib/comments.ts"` to `exports`)
- Test: `payload/tests/commentRules.test.ts` (no DB needed)

**Interfaces:**
- Produces:
  - `export const COMMENT_MAX = 1000; export const NAME_MAX = 50; export const EDIT_WINDOW_MS = 5 * 60_000;`
  - `export type CommentStatus = "published" | "pending" | "hidden" | "removed" | "deleted";`
  - `export const containsLink = (text: string): boolean`
  - `export const hideThreshold = (score: number): number` → `Math.max(2, 3 + Math.floor(score / 10))`
  - `export const shouldAutoHide = (c: { status: CommentStatus; reviewed?: boolean | null; score: number; reportCount: number }): boolean` → only `published`, not `reviewed`, `reportCount >= hideThreshold(score)`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("containsLink", () => {
  it.each(["https://x.de", "http://a.b/c", "guck www.spam.com", "kauf bei xyz.de", "foo.com/bar", "SPAM.DE"])("%s → true", (t) => expect(containsLink(t)).toBe(true));
  it.each(["Na und?", "Ick bin 1.5 Meter", "z.B. so", "Dit is ne Sache… ja.", "e-mail"])("%s → false", (t) => expect(containsLink(t)).toBe(false));
});
describe("hideThreshold", () => {
  it.each([[-5, 2], [0, 3], [9, 3], [25, 5], [50, 8]])("score %i → %i", (s, n) => expect(hideThreshold(s)).toBe(n));
});
describe("shouldAutoHide", () => {
  const base = { status: "published" as const, reviewed: false, score: 0, reportCount: 3 };
  it("hides at threshold", () => expect(shouldAutoHide(base)).toBe(true));
  it("not below", () => expect(shouldAutoHide({ ...base, reportCount: 2 })).toBe(false));
  it("never when reviewed", () => expect(shouldAutoHide({ ...base, reviewed: true, reportCount: 99 })).toBe(false));
  it("only published", () => expect(shouldAutoHide({ ...base, status: "pending" })).toBe(false));
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter payload-app exec vitest run tests/commentRules.test.ts` → module not found.
- [ ] **Step 3: Implement `payload/src/lib/comments.ts`.** Link regex: scheme, `www.`, or `label.tld` with a 2–24 letter TLD followed by end/space/`/`/punctuation; must not match `z.B.` or `1.5` (TLD letters only, label ≥ 2 chars). No payload/next imports (the site imports this file).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(word): add comment rules`

---

### Task 2: Payload collections, hooks, mails, migration

**Files:**
- Create: `payload/src/lib/notifyEditors.ts`, `payload/src/collections/Comments.ts`, `payload/src/collections/CommentVotes.ts`, `payload/src/collections/CommentReports.ts`, `payload/src/hooks/commentCounts.ts`
- Modify: `payload/src/payload.config.ts` (append the three collections to `collections`), `payload/tests/access.test.ts` (`lockedCollections` += `"comments", "comment-votes", "comment-reports"`)
- Generated: `payload/src/payload-types.ts`, `payload/src/migrations/<ts>_word_comments.{ts,json}`, `payload/src/migrations/index.ts`
- Test: `payload/tests/comments.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces (collection slugs and fields the site uses):
  - `comments`: `word` (rel `words`, required, indexed), `parent` (rel `comments`, optional, indexed), `authorName` (text, max `NAME_MAX`), `text` (textarea, required, max `COMMENT_MAX`), `status` (select `CommentStatus`, default `published`, sidebar), `removalReason` (text, sidebar, shown when `status = removed`), `reviewed` (checkbox, sidebar), `editKeyHash` (text, `admin.hidden: true`), `editedAt` (date), `upvotes`/`downvotes`/`score`/`reportCount` (number, default 0, `admin.readOnly`, `score` indexed). Timestamps on. `admin.useAsTitle: "text"`, `defaultColumns: ["text", "word", "status", "score", "reportCount", "createdAt"]`, `listSearchableFields: ["text", "authorName"]`.
  - `comment-votes`: `comment` (rel, required), `visitor` (text, required), `value` (number, required, 1 or -1); `indexes: [{ fields: ["comment", "visitor"], unique: true }]`.
  - `comment-reports`: `comment` (rel, required), `visitor` (text, required), `reason` (text, max 300); same unique index.
  - `notifyEditors(req: PayloadRequest, subject: string, lines: string[]): Promise<void>`
  - `recountComment(req: PayloadRequest, commentId: number): Promise<void>`
  - Admin link format used in mails: `${req.payload.config.serverURL}/admin/collections/comments/${id}`.

Hook behaviour (decided here):
- `comments.beforeValidate`: if `parent` points to a comment that itself has a `parent`, replace with that grandparent; if `parent.word !== word`, reject (`ValidationError`).
- `comments.beforeChange`, only when `!req.user` (the site): on create, `status = containsLink(text) ? "pending" : "published"`; on update where `text` changed, `editedAt = now` and same link rule.
- `comments.beforeChange`, when `req.user` and `originalDoc.status === "hidden"` and `data.status === "published"`: `reviewed = true`.
- `comments.afterChange` create: `notifyEditors` subject „Neuer Kommentar – Berliner Schnauze“ (+ „ (wartet auf Freigabe)“ when pending), lines: word id/slug, name, text, admin link. Update by site that turns it pending: same mail with „Kommentar bearbeitet, wartet auf Freigabe“.
- `comment-votes` afterChange/afterDelete and `comment-reports` afterChange: `recountComment`. `recountComment` counts with `payload.count` (votes value 1 / -1, reports), updates the comment with `context: { skipCommentHooks: true }` so no mail fires; if `shouldAutoHide` → set `status: "hidden"` and `notifyEditors` „Kommentar automatisch ausgeblendet“.
- `comment-reports.afterChange` create: `notifyEditors` „Kommentar gemeldet“ with reason, report count and link (also for `reviewed` comments — they only mail).

- [ ] **Step 1: Write failing tests in `payload/tests/comments.test.ts`** (pattern of `suggestions.test.ts`; create one published word fixture in `beforeAll`, delete comments by word in `afterEach`; spy `payload.sendEmail`):
  - `creates published comment and mails`: create without user → `status === "published"`, one mail whose `text` contains the admin link.
  - `holds a comment with a link`: text `"kiek ma www.spam.de"` → `status === "pending"`, mail subject contains „wartet auf Freigabe“.
  - `re-parents a reply to a reply`: reply B to A, reply C with `parent: B` → `C.parent === A.id`.
  - `rejects a parent from another word` → throws.
  - `counts votes`: two votes +1, one -1 → comment `upvotes 2, downvotes 1, score 1`.
  - `unique vote per visitor`: second vote same (comment, visitor) → throws.
  - `auto-hides at threshold`: 3 reports from 3 visitors on score 0 → `status "hidden"`, an „automatisch ausgeblendet“ mail.
  - `release marks reviewed and stays visible`: update as user `status: "published"` → `reviewed true`; a 4th report keeps `published`.
  - `editor update does not apply link hold`: update with `user` and a link text → status unchanged.
- [ ] **Step 2: Run, expect FAIL** — `pnpm cms:test -- tests/comments.test.ts` (needs `DATABASE_URL_TEST`).
- [ ] **Step 3: Implement** `notifyEditors.ts` (lift the try/catch/logger pattern of `Suggestions.ts`; leave Suggestions as is), the three collections, `commentCounts.ts`, register in config, extend `lockedCollections`.
- [ ] **Step 4: Run** `pnpm cms:test` → all PASS (incl. access Forbidden for the three new collections).
- [ ] **Step 5: Generate** `pnpm --filter payload-app generate:types` then `pnpm cms:migrate:create word_comments`; check the migration creates the two unique compound indexes.
- [ ] **Step 6: Commit** `feat(word): add comment collections in payload`

---

### Task 3: Rate-limit rules

**Files:**
- Modify: `website/src/utils/rateLimit.ts`
- Test: `website/src/tests/unit/utils/rateLimit.test.ts` (extend if it exists, else create)

**Interfaces:**
- Produces: rules (order matters, first match wins):
  `{ max: 5, method: "POST", prefix: "/api/comments", windowMs: 10*60_000 }`,
  `{ max: 120, method: "GET", prefix: "/api/comments", windowMs: 60_000 }`,
  `{ max: 10, method: "PATCH", prefix: "/api/comments/", windowMs: 5*60_000 }`,
  `{ max: 10, method: "DELETE", prefix: "/api/comments/", windowMs: 5*60_000 }`,
  `{ max: 30, method: "POST", prefix: "/api/comment-votes", windowMs: 60_000 }`,
  `{ max: 10, method: "POST", prefix: "/api/comment-reports", windowMs: 60*60_000 }`.
  The `/api/comments/` rules must come **before** the `/api/comments` ones. Add optional `key?: string` to `Rule`; the counter key becomes `` `${rule.key ?? `${rule.method ?? "*"} ${rule.prefix}`} ${client}` ``. The PATCH and DELETE rules both get `key: "comment-own"` so they share one counter.

- [ ] **Step 1: Failing tests:** `GET and POST /api/comments count separately` (6 GETs then 1 POST → POST allowed), `PATCH and DELETE share 10 per 5 min` (5 PATCH + 5 DELETE allowed, 11th refused), `vote limited at 31st per minute`.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/utils/rateLimit.test.ts)` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(word): rate-limit comment routes`

---

### Task 4: List + create API

**Files:**
- Create: `website/src/utils/commentSchema.ts`, `website/src/services/payload/comments.ts`, `website/src/pages/api/comments/index.ts`
- Test: `website/src/tests/unit/services/payload/comments.test.ts`, `website/src/tests/unit/pages/api/comments.test.ts` (mock style of `suggest-word.test.ts`)

**Interfaces:**
- Consumes: `payload-app/comments` (Task 1), collections (Task 2), `verifyTurnstile`, `getPayloadClient`, `siteRead`.
- Produces:
  - `commentCreateSchema = z.object({ wordId: z.number().int().positive(), parentId: z.number().int().positive().optional(), authorName: z.string().trim().max(NAME_MAX).default(""), text: z.string().trim().min(2).max(COMMENT_MAX) })` (+ German messages like `suggestWordSchema`); also `commentEditSchema = { editKey: z.string().min(32), text }`, `voteSchema = { commentId, value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }`, `reportSchema = { commentId, reason: z.string().trim().max(300).default("") }`.
  - `type PublicComment = { id: number; parentId: number | null; authorName: string; text: string | null; state: "visible" | "removed" | "reviewing"; removalReason: string | null; createdAt: string; edited: boolean; upvotes: number; downvotes: number; myVote: -1 | 0 | 1; replies: PublicComment[] }` (`text` null unless `visible`; `authorName` falls back to „Anonymer Berliner“).
  - `listComments(wordId: number, sort: "best" | "new", page: number, visitor?: string): Promise<{ comments: PublicComment[]; hasMore: boolean; total: number }>` — top-level with status in `published|hidden|removed|deleted`, 20 per page, sort `["-score","-createdAt"]` or `["-createdAt"]`; replies of those ids in one query, `createdAt` asc, same statuses; placeholders (`hidden` → `reviewing`, `removed`/`deleted` → `removed`) kept only when they have a visible reply; `myVote` from one `comment-votes` query by visitor; `total` = count of `published` comments for the word; `hasMore` from Payload's `hasNextPage`.
  - `VISITOR_COOKIE = "bs_visitor"`; `visitorId(cookies: AstroCookies, create: boolean): string | undefined` — reads, or sets a `crypto.randomUUID()` (httpOnly, sameSite lax, secure in prod, path `/api/`, maxAge 1 year) when `create`.
  - `GET /api/comments?word=<id>&sort=best|new&page=<n>` → `200 { comments, hasMore, total }`, `Cache-Control: no-store`; bad params → 400.
  - `POST /api/comments` body `commentCreateSchema & { turnstileToken }` → Turnstile like `suggest-word.ts` (503 / 403); word must be published (`findByID` with `siteRead()`, else 404); parent must be a `published` comment of that word (else 400); creates with `editKeyHash = sha256(editKey)`; returns `201 { comment: PublicComment, editKey, pending: boolean }` (`comment` omitted when pending).

- [ ] **Step 1: Failing tests (service):** `drops a removed top-level comment without visible replies`, `keeps it as "removed" with a visible reply, removalReason passed through`, `maps hidden to "reviewing" with text null`, `hasMore true when Payload reports hasNextPage even if the page shrank`, `myVote from the visitor's votes`, `empty name → "Anonymer Berliner"`.
- [ ] **Step 2: Failing tests (route):** `201 with editKey and comment`, `pending:true without comment when Payload returns pending`, `404 for a draft word`, `400 for a parent of another word`, `403 on failed captcha`, `400 on 1001 chars`, `GET 400 on sort=foo`, `responses are no-store`.
- [ ] **Step 3: Run** both → FAIL.
- [ ] **Step 4: Implement.** Use `node:crypto` `createHash("sha256")` and `randomBytes(32).toString("base64url")` for the key.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** `feat(word): add comment list and create api`

---

### Task 5: Edit + delete own comment

**Files:**
- Create: `website/src/pages/api/comments/[id].ts`
- Test: `website/src/tests/unit/pages/api/comment-own.test.ts`

**Interfaces:**
- Consumes: `commentEditSchema`, `EDIT_WINDOW_MS`, `toPublicComment` (Task 4).
- Produces: `PATCH /api/comments/:id` `{ editKey, text }` → `200 { comment, pending }`; `DELETE /api/comments/:id` `{ editKey }` → `200 { deleted: true }` (sets `status: "deleted"`). Any of: unknown id, wrong key, `now - createdAt > EDIT_WINDOW_MS`, status not `published|pending` → **403 with the same body** `{ error: "Dit jeht nich mehr." }`. Compare hashes with `timingSafeEqual`.

- [ ] **Step 1: Failing tests:** `edits within 5 min`, `403 at 5 min + 1 s` (fake timers), `403 wrong key`, `403 unknown id (same body as wrong key)`, `edit adding a link returns pending:true`, `delete sets status deleted`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement. Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(word): let authors edit or delete comments for 5 minutes`

---

### Task 6: Vote + report API

**Files:**
- Create: `website/src/pages/api/comment-votes.ts`, `website/src/pages/api/comment-reports.ts`
- Test: `website/src/tests/unit/pages/api/comment-votes.test.ts`, `.../comment-reports.test.ts`

**Interfaces:**
- Consumes: `voteSchema`, `reportSchema`, `visitorId`, `verifyTurnstile`, `rateLimited`, `clientIp` (Tasks 3–4).
- Produces:
  - `POST /api/comment-votes` `{ commentId, value }` → comment must be `published` (else 404); visitor via `visitorId(cookies, true)`; `0` deletes the visitor's vote, `±1` updates or creates it (a unique-violation race → re-read and update); returns `200 { upvotes, downvotes, myVote }` read back after the recount hook.
  - `POST /api/comment-reports` `{ commentId, reason, turnstileToken }` → Turnstile (503/403); comment must be `published`; per-IP dedup via `rateLimited(ip, { key: \`comment-report ${commentId}\`, max: 1, prefix: "", windowMs: 24*60*60_000 })` — when deduped, or when the visitor already reported (unique violation), answer `200 { reported: true }` without creating; else create and answer the same.

- [ ] **Step 1: Failing tests:** votes — `sets cookie on first vote`, `switch +1 → -1 updates the one row`, `0 removes`, `404 on pending/hidden/removed/deleted comment`; reports — `creates once`, `second report from same IP within 24 h answers 200 but does not create`, `same visitor twice answers 200 without throwing`, `403 failed captcha`, `404 on non-published`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement. Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(word): add comment votes and reports api`

---

### Task 7: TurnStile.vue for repeated actions

**Files:**
- Modify: `website/src/components/TurnStile.vue`
- Test: `website/src/tests/unit/components/TurnStile.test.ts`

**Interfaces:**
- Produces: new optional prop `appearance?: "always" | "interaction-only"` (default `"always"`, passed to `render`); `defineExpose({ reset })` where `reset()` calls `window.turnstile.reset(widgetId)` with the id `render` returned and emits `token ""`. `SuggestWordForm.vue` keeps working unchanged.

- [ ] **Step 1: Failing tests:** `passes appearance to render`, `reset() resets its own widget id and emits ""`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement (extend `TurnstileInstance` in `src/env.d.ts` if `reset`'s id param is missing). Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(word): let turnstile reset per action`

---

### Task 8: Comment UI

**Files:**
- Create: `website/src/composable/useComments.ts`, `website/src/components/comments/WordComments.vue`, `CommentForm.vue`, `CommentCard.vue`, `website/src/styles/components/_word-comments.scss`, `_comment-form.scss`, `_comment-card.scss`
- Modify: `website/src/pages/wort/[...wordSlug].astro` — `<WordComments client:visible wordId={word.id} />` right before `<WordPageFooter …>`, not rendered when `draft` is set.
- Test: `website/src/tests/unit/composable/useComments.test.ts`, `website/src/tests/unit/components/comments/*.test.ts`

**Interfaces:**
- Consumes: API routes (Tasks 4–6), `TurnStile` (Task 7), `PublicComment`, `COMMENT_MAX`, `EDIT_WINDOW_MS`.
- Produces: `useComments(wordId: number)` → `{ comments: Ref<PublicComment[]>, total, sort: Ref<"best"|"new">, hasMore, loading, loadMore(), post(input, token), edit(id, text), remove(id), vote(id, value), report(id, reason, token), canEdit(id): boolean }`. Edit keys in `useLocalStorage("bs-comment-keys", {} as Record<number, { key: string; createdAt: number }>)`, entries older than `EDIT_WINDOW_MS` pruned on load. Changing `sort` resets to page 1.

UI decisions (mockup `comment-layout-v2.html` in `.superpowers/brainstorm/…`):
- Heading „Wat sagste dazu?“ + `(total)`; right: segmented toggle „Beste / Neueste“ (`aria-pressed`).
- `CommentForm`: name (optional), textarea with counter `n / 1000`, privacy line „Mit dem Abschicken wird dein Kommentar öffentlich angezeigt. Was wir dabei speichern, steht in der Datenschutzerklärung.“ linking `/datenschutz#kommentare`, submit „Abschicken“. Same component for reply (prefilled `@Name `) and for edit. Pending answer → info toast „Dein Kommentar hat 'nen Link, den kieken wir uns erst an.“ 429 → warning toast „Ma langsam, Keule – versuch's gleich nochmal.“; input kept on any error.
- One shared `TurnStile` (`appearance="interaction-only"`) in `WordComments`, wrapped with the line „Kurz jucken, ob de 'n echter Berliner bist“ (only visible when the widget renders something); its token is used by the next post or report, then `reset()`.
- List: `WindowVirtualizer` from `virtua/vue` over top-level comments; each item a `CommentCard` with its replies. Load the next page when a sentinel after the list intersects (`useIntersectionObserver`) and `hasMore && !loading`. Cards keep their height stable while a reply/edit form opens (virtua re-measures; no fixed `itemSize`).
- `CommentCard`: name, relative time (`Intl.RelativeTimeFormat("de")`), „(bearbeitet)“, text with `white-space: pre-line` (never `v-html`), vote pill `▲ n ▼` (own vote orange, buttons disabled while pending), „Antworten“, „Melden“ (opens inline reason field + „Melden“ button; then „Danke, wir kieken drüber.“), „Bearbeiten“/„Löschen“ while `canEdit`. Placeholder states show „Kommentar entfernt“ / „Kommentar entfernt: <Grund>“ / „Wird geprüft“ without actions.
- Empty state: „Noch keen Senf dazu. Mach den Anfang!“
- `trackEvent("Comments", "Post" | "Reply" | "Vote" | "Report", String(wordId))`.

- [ ] **Step 1: Failing tests (composable, `fetch` mocked):** `loadMore appends page 2`, `sort change reloads from page 1`, `post stores the edit key and prepends the comment`, `pending post does not prepend`, `vote updates counts and myVote from the response`, `canEdit false after 5 min` (fake timers).
- [ ] **Step 2: Failing tests (components):** `CommentCard renders text as text (no HTML)`, `placeholder shows „Wird geprüft“ without vote buttons`, `CommentForm counter shows 1000 limit and blocks submit over it`, `reply prefills @Name`.
- [ ] **Step 3: Run → FAIL. Step 4: Implement. Step 5: Run → PASS.**
- [ ] **Step 6: Browser check** against a dev server started with `NO_DEV_TOOLBAR=1` (Payload DB seeded, Turnstile test keys): post, reply, vote, report, edit within 5 min, link → pending; light + dark, desktop + mobile; screenshot each.
- [ ] **Step 7: Commit** `feat(word): add comment section to word pages`

---

### Task 9: Final checks

- [ ] `pnpm lint`, `pnpm typechecking`, `pnpm test:unit`, `pnpm cms:test` all green.
- [ ] `pnpm build` succeeds (no DB needed).
- [ ] Hand-off note for the user (not code): add the `#kommentare` section to the `datenschutz` page in the CMS — stored data (optional name, text, time; no IP/e-mail), Turnstile/Cloudflare sees the IP, IP processed in memory ≤ 24 h for rate limits and report dedup, visitor cookie, edit key in the browser for 5 minutes, how to request deletion. The user writes or checks the legal wording.
- [ ] Commit any fixes `fix(word): …`
