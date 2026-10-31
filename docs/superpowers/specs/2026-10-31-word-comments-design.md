# Word comments

Branch `felix-berlin/word-comments`.

## Why

Visitors know things about Berlin words that the entries don't: what their grandmother meant by it, how it's used in Spandau vs. Neukölln, that a definition is off. Today there is nowhere to put that. A comment section under each word page collects it, and lets visitors answer each other.

Payload is the backend; no external comment service.

## Goal / done when

Every published word page has a comment section where anonymous visitors can write, reply, vote and report; the editor manages everything in the Payload admin and is mailed about new, held and reported comments.

## Non-goals

- User accounts (may come later; nothing here should block adding them, but nothing is built for them now).
- Formatting (Markdown, links rendered as links, emoji pickers), images.
- Comments on anything other than words (magazine posts, themes).
- Search indexing / SEO of comment text.

## Anti-goals (would make it a failure even if it works)

- Spam links published on the site.
- Storing more personal data than needed (no stored IP addresses, no e-mail addresses, no fingerprinting; the only IP use is transient, in memory, see Reporting).
- A comment section that makes word pages slow or uncacheable.
- Deep nested threads that are unreadable on a phone.

## Behaviour

### Posting

- Form fields: name (optional; shown as „Anonymer Berliner“ when empty) and text (plain text, max **1000 characters**, with a remaining-characters counter). *(1000 is Claude's call; the user agreed to "a limit".)*
- Turnstile protects posting. Reuse `TurnStile.vue` and `verifyTurnstile()` (fails closed, like `api/suggest-word.ts`). The widget is configured to appear **only when Cloudflare needs an interaction** (`appearance: "interaction-only"`); when it does appear, a line in the site's voice sits next to it (e.g. „Kurz jucken, ob de 'n echter Berliner bist“). The word "Turnstile" never shows up in UI text.
- No consent checkbox. Above the submit button: „Mit dem Abschicken wird dein Kommentar öffentlich angezeigt. Was wir dabei speichern, steht in der Datenschutzerklärung.“ linking to `/datenschutz#kommentare`. *(Decided by the user after Claude's assessment; legal wording must be checked by the user — not legal advice.)*
- A comment is **published immediately**, unless its text contains a link: then it is stored as **pending** and not shown until the editor approves it. Link detection must catch `http(s)://…`, `www.…` and bare domains like `xyz.de` / `foo.com/bar`. The poster sees „Dein Kommentar hat 'nen Link, den kieken wir uns erst an.“
- After a successful post, the new comment appears at the top of the list immediately, client-side (the page itself is cached for 5 minutes, so comments are not part of the server-rendered HTML; see Loading).
- **Flood protection** (user's request: nobody should hammer post/vote/report). Per IP, in memory, via new rules in the existing `src/utils/rateLimit.ts` (`clientIp()`, fixed windows). Starting values, tunable in that one list:
  - post: 5 per 10 min (like suggest-word)
  - edit/delete own: 10 per 5 min
  - vote: 30 per minute
  - report: 10 per hour
  - list (GET): generous, e.g. 120 per minute, only against scrapers
- Over the limit the route answers 429; the UI shows a toast in the site's voice („Ma langsam, Keule …“) and keeps the visitor's input.
- Client side: vote/report buttons are disabled while their request runs, so double clicks don't fire twice. Re-voting the same comment only changes the visitor's one row, so vote flipping can't inflate a score, only cost requests, which the limit caps.

### Threads

- **One reply level.** A top-level comment has replies; replies have no replies of their own. Pressing „Antworten“ on a reply adds a reply to the same top-level comment, pre-filled with `@Name `. *(Claude's recommendation, accepted.)*
- Replies are shown indented with the dashed left border, always **chronological**, under their top-level comment.

### Sorting and loading

- Toggle „Beste / Neueste“ above the list; default **Beste**.
  - Beste: score (upvotes − downvotes) descending, ties broken by newest first.
  - Neueste: newest first.
- Only top-level comments are sorted/paged; each top-level comment comes with all its replies.
- The list is rendered with **virtua** (already a dependency, used by the word list) and loads further pages of top-level comments from the server when scrolling near the end (page size: builder's call, ~20). The user explicitly wants virtua from the start, not a „mehr laden“ button. Variable item heights (long comments, opened reply forms) must not make the list jump.
- Comments are fetched client-side from an API route; word pages stay cacheable as today.

### Votes

- Up/down vote on every comment (top-level and replies), shown as a small pill `▲ 12 ▼` under the text (style from mockup B). The visitor's own vote is highlighted in currywurst orange; clicking it again removes it; clicking the other arrow switches it.
- **One vote per visitor per comment**, enforced softly: on the first vote/report the server sets an anonymous visitor cookie (random ID, httpOnly, long-lived). The database holds at most one vote per (comment, visitor ID) — unique constraint. Clearing cookies allows voting again; the user accepted this until accounts exist.
- Downvotes alone never hide anything.

### Editing and deleting own comments

- On a successful post the server returns a random **edit key**; the browser keeps it in `localStorage`, the database stores only its hash.
- For **5 minutes** after posting, the author's own comment shows „Bearbeiten“ and „Löschen“ (same browser only). The server checks key and time window; after that the key is useless.
- An edited comment shows „(bearbeitet)“. If the edit adds a link, the comment goes to pending like a new one.
- Self-deleted comment: same display rules as a removed one (below).

### Reporting and auto-hide

- „Melden“ on every comment, with an optional reason. One report per visitor per comment (same visitor cookie).
- Because the cookie alone would let one person hide any comment (clear cookies 2–3 times), reports are additionally protected — decided by the user:
  - **Turnstile on the report route** (interaction-only, like posting). Each report needs a fresh single-use token; `TurnStile.vue` currently renders once on mount with no reset/execute, so it has to support getting a new token per action.
  - **In-memory per-IP dedup**: at most one counted report per IP per comment within 24 h, kept in process memory like `rateLimit.ts` (same `clientIp()`), never persisted. Known limits: one web container only (as the rate limiter), and people behind one IP (office, shared flat, mobile CGNAT) count as one report. A deduped report is answered like a successful one (no feedback to the abuser).
- Each report mails the editor with a link to the comment in the admin; the admin shows the report count per comment.
- **Auto-hide** when `reports >= max(2, 3 + floor(score / 10))`. Examples: score −5 → 2 reports, 0–9 → 3, 25 → 5, 50 → 8. The constants 2, 3, 10 live in one place.
  - An auto-hidden comment shows „Wird geprüft“ in place of its text; the editor gets a mail.
  - When the editor releases it, it is marked **reviewed**: further reports only send a mail and never auto-hide it again.

### Removal by the editor

- In Payload the editor can hide a comment and optionally enter a reason. On the site it shows „Kommentar entfernt“, or „Kommentar entfernt: <Grund>“ with a reason.
- A removed/hidden top-level comment that has visible replies keeps its slot with that placeholder so the replies stay readable; without replies it disappears entirely. (Same for „Wird geprüft“.)
- The editor can also edit or hard-delete comments in the admin.

### Notifications (Payload mail, like `Suggestions.ts`)

Mail the editor (`SUGGEST_MAIL_TO`, or a new variable — builder's call) on: every new comment (with „wartet auf Freigabe“ when pending), every report, every auto-hide. Each mail links straight to the comment in the admin. A failed mail never loses the comment/report (same pattern as suggestions).

## Payload

- New collection(s) for comments, votes and reports, related to `words`. Exact schema is the builder's, within these constraints:
  - status covering at least: published, pending (link), hidden by reports, removed by editor (+ optional reason), deleted by author; plus a `reviewed` flag.
  - score and report counts readable without counting rows on every request (denormalized or computed in SQL — builder's call), because Beste-sorting pages over them.
  - unique (comment, visitor) for votes and for reports.
  - only the edit-key hash is stored; no IP, no e-mail.
- Comments are only accepted for **published** words.
- Admin access: `authenticated` from `payload/src/access.ts` + a Forbidden test in `tests/access.test.ts` (project rule for new collections). The public site goes through its own API routes using the Local API, never public REST.
- Schema change ⇒ `generate:types` + `pnpm cms:migrate:create <name>`, committed.
- Admin list view of comments: word, author name, text excerpt, status, score, reports, created — filterable by status so pending and auto-hidden ones are easy to find.

## Site

- Astro API routes under `src/pages/api/` (list, create, edit, delete, vote, report), `Cache-Control: no-store` like `suggest-word.ts`; validation with a zod schema like `suggestWordSchema.ts`.
- Vue island on `src/pages/wort/[...wordSlug].astro`, loaded lazily (`client:visible`), BEMIT classes, own SCSS file, VueUse where it fits, Lucide icons, `trackEvent` for post/vote/report.
- Layout (from the brainstorm mockups, `.superpowers/brainstorm/…/comment-layout-v2.html`): heading with count („Wat sagste dazu?“-style, final copy in the site's voice) and the Beste/Neueste toggle on the right; form below; then comment cards (paper card style); vote pill + „Antworten“ + „Melden“ under each text. Final styling follows `DESIGN.md`; checked in light and dark mode, desktop and mobile.
- Empty state for words without comments, in the site's voice.

## Privacy policy

The `datenschutz` page (CMS-edited) needs a `#kommentare` section: stored data (name optional, text, time; no IP/e-mail), Cloudflare Turnstile sees the IP, the IP is processed briefly in memory (max. 24 h, never stored) for rate limits and to stop repeated reports, visitor cookie for votes/reports, edit key in the browser for 5 minutes, how to request deletion. **The user writes or checks this text** — Claude may draft it, but it is not legal advice.

## Left to the builder

Collection/field names and schema shape, API route shape, page size, how score/report counts are kept, link-detection regex (within the cases listed), visitor-cookie name/lifetime, rate-limit numbers, mail wording, component split, exact copy (in the site's cheeky Berlin voice).
