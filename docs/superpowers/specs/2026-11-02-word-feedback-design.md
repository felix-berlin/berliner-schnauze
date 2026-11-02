# Word feedback: "Sagste det noch?" and like/dislike

Branch `felix-berlin/user-feedback`. Mockups from the brainstorm: `.superpowers/brainstorm/335196-1793630504/content/` (`flow-v4.html`, `ostwest-v5.html` = the approved flow; git-ignored, local only).

## Why

Comments (`docs/superpowers/specs/2026-10-31-word-comments-design.md`) are free-form. The owner wants structured feedback per word that is cheap to give and adds up to data: how alive is a word today, where, among whom, and do newcomers ("Zujezogene") pick it up? Prior art: the *Atlas zur deutschen Alltagssprache* (citizen-science survey with fixed answers, mapped by region), Urban Dictionary (thumbs), DWDS (categorised error reports, not taken up here).

## Goal / done when

Every published word page has:

1. a **like/dislike** pair ("Jefällt ma" / "Nee", Lucide `thumbs-up` / `thumbs-down`, no emoji) above the fold, under the definition, with a hint link "Sagste det noch? Hier abstimmen ↓" that scrolls to the card;
2. a **"Sagste det noch?" card** further down that asks one required question and then, one step at a time, three optional ones;

and the editor sees the counts per word in the Payload admin.

## Non-goals

- Showing like/dislike numbers publicly. "Nee" simply means "I don't like it"; the numbers are collected and shown in the CMS only. Where they appear on the site is decided later.
- Error reports, spelling-variant votes, user example sentences, pronunciation recordings (discussed, deferred).
- Payload's form-builder plugin: it stores submissions as field/value pairs, creates a new submission per send and has no word relation. Aggregation per word, district and age needs typed columns, and the UI is custom anyway.
- Accounts, a public analysis/map page across all words, CSV export.

## Anti-goals

- A word page that becomes uncacheable or slower: all feedback state loads client-side from an API route; the HTML stays the same for everyone.
- Storing more personal data than needed: no stored IPs, no fingerprinting. Answers are coarse (district, age bracket) and tied only to the existing random visitor cookie.
- A long form. Only one step is ever visible; nothing beyond the first answer is required.
- A map that is unusable on a phone or with a keyboard.

## Behaviour

### Like/dislike (top)

- Two toggle buttons. Clicking the active one again removes the vote; clicking the other switches. No counts shown.
- Independent of the card: a visitor may like without answering the card and vice versa.

### "Sagste det noch?" card

Steps, shown one at a time; each answer is saved immediately (no submit button). From step 2 on every step has "überspringen". A small progress indicator (dots) shows the position.

1. **Sagste det noch?** (required to start the flow): *Sag ick selbst* / *Kenn ick* / *Nie jehört*. After answering, the card shows the result bars for this word (percent per answer + total votes) and moves to step 2.
2. **Wo wohnste?** Clickable SVG map of Berlin with real outlines: the 12 districts, but Mitte split into *Mitte* (east) and *Wedding/Tiergarten* (west: Moabit, Hansaviertel, Tiergarten, Wedding, Gesundbrunnen) and Friedrichshain-Kreuzberg into *Friedrichshain* (east) and *Kreuzberg* (west). That is 14 areas. Brandenburg is a clickable band around Berlin. Below the map a button *Woanders*.
3. **Uffjewachsen oder zujezogen?** *Hier uffjewachsen* / *Zujezogen, über 10 Jahre her* / *Zujezogen, unter 10 Jahren*.
   - **3b**, only after *Hier uffjewachsen*: **In welcher Hälfte?** *Ost* / *West* / *Beides / nach der Wende*.
4. **Wie alt biste?** *unter 20*, *20–29*, *30–39*, *40–49*, *50–59*, *60–69*, *70–79*, *80+*.
5. **Danke**: comparison bars for this word, e.g. "Sagen's selbst: Ost-Berliner / West-Berliner / Zujezogene / in deinem Bezirk".

Ost/West is asked (3b), not derived from the residence: residence-East mostly measures gentrification, upbringing is what matters for dialect.

**Remembered profile**: answers to steps 2–4 (incl. 3b) are kept in the browser. On the next word only step 1 is asked; the stored profile is attached to that vote automatically and the card jumps to the Danke state. A skipped step counts as answered "no answer" and is not asked again on later words (the visitor said no once; "Angaben ändern" is the way back). The stored profile is also attached to a like/dislike-only row. A small "Angaben ändern" link restarts steps 2–4. Changing the profile updates only future votes (and the current word's vote), not past ones.

Returning to a word already answered shows the result state with the visitor's choice highlighted; they can change their step-1 answer.

### Admin

- Each word shows read-only counts in the sidebar: likes, dislikes, and the three step-1 answers. They are counted live from `word-feedback` by a Payload `ui` field (server component) on `words`, not stored on the word (see Data).
- The raw votes collection is browsable and filterable (by word, answer, area, origin, age) for anything deeper.

## Data

New collection `word-feedback` (login-only access via `authenticatedOnly`, like `comment-votes`), one row per visitor and word (unique index on `word` + `visitor`):

| field | type |
|---|---|
| `word` | relationship → words, required |
| `visitor` | text, required (the existing visitor cookie id) |
| `reaction` | select `like` / `dislike`, nullable |
| `usage` | select `say` / `know` / `never`, nullable |
| `area` | select: the 14 area keys + `brandenburg` + `elsewhere`, nullable |
| `origin` | select `grewUp` / `movedOver10` / `movedUnder10`, nullable |
| `half` | select `east` / `west` / `both`, nullable (only with `origin = grewUp`) |
| `age` | select of the 8 brackets, nullable |

**No counts are stored on `words`.** Words have `versions: { drafts: true }`, so the `commentCounts.ts` pattern (update the parent per vote) would write a word version per click, run the word hooks (`mcpDraftOnly`, derived fields, `contentModifiedAt`), risk publishing over a pending draft, and an editor saving an open word would reset the counts. Instead both the admin sidebar and the public GET count rows in `word-feedback` (indexed on `word`; a few `payload.count` / one grouped SQL query per request). If that ever gets slow, cache it with `ttl()` per word; no denormalised counters.

Comparisons and step-1 totals count only rows with `usage` set; like/dislike counts only rows with `reaction` set.

Schema change → generate types → migration (expand only: one new table, nothing changes on `words`).

## API

Same shape as `website/src/pages/api/comment-votes.ts`: visitor cookie via `visitorId()`, in-memory rate limits per IP (`rateLimitedBy`), no Turnstile (one click must stay one click; that matches the comment votes).

- `GET /api/word-feedback?word=<id>`: the visitor's own row (if any) + public step-1 totals + the comparison numbers for the Danke state.
- `PATCH /api/word-feedback`: `{ word, ...any subset of the fields }`, upserts the visitor's row (unique-violation race handled like comment votes). Sending `reaction: null` removes the reaction. Validated with a zod schema (enums, `half` only with `origin = grewUp`). Returns the same body as GET.
- Only published words accept feedback.

**Comparison numbers** (Danke state): share of `usage = say` among votes with `half = east`, `half = west`, `origin` in the two "moved" values, and the visitor's own `area`. A group is shown only with at least 10 votes in it (builder's call on the exact threshold), so early results aren't single votes, and no group small enough to identify a person is shown.

## Map

- Source: Berlin district and Ortsteil boundaries from the Technologiestiftung open-data bucket (`tsb-opendata…/bezirksgrenzen/bezirksgrenzen.geojson`, `…/ortsteile/lor_ortsteile.geojson`), originally Geoportal Berlin. Check and credit the licence (expected: Datenlizenz Deutschland, zero or attribution).
- A one-off script converts them to simplified SVG paths (Douglas–Peucker, about 10–15 KB for all areas) and commits the result as a static data file or component. The spike scripts and their output live in `.superpowers/brainstorm/335196-1793630504/map-spike/` (`split.py` → `areas.json`, git-ignored) and can be reused. It is not run at build time.
- Each area is a real focusable control (`role="radio"` group or buttons) with its name as accessible label; labels on the map may be abbreviated (F'hain, X'berg …) but must stay ≥ 11 px and not overlap. Smallest areas (Friedrichshain, Kreuzberg, Mitte) must remain tappable on a 360 px wide phone. If they don't, the builder adds a list fallback below the map.
- Brandenburg: a band/rounded frame around the city, also a control.

## Design

Follows `DESIGN.md`: dashed-line texture for the answer buttons and map strokes, currywurst orange for selection and bars, Paper Lift card (`mx.paper-card`), Berlin-dialect copy. Text on orange must meet contrast (the mockups don't). Verified in light and dark mode, desktop and mobile width.

## Privacy

The visitor cookie already exists for comments. The privacy page gets a short paragraph on what is stored with a vote (answers + random visitor id, no IP).

## Left to the builder

Component split, exact copy beyond the labels above, animation between steps, where in the page the card sits (after the examples section is the expectation), map file format, threshold value, test layout.

## Calls made by Claude (not discussed with the owner)

- One row per visitor and word holding both reaction and card answers.
- Profile copied onto each vote (not a separate profile table), only future votes change when the profile changes.
- Counts computed live (admin `ui` field + API), never stored on the versioned word document; no aggregation page.
- A skipped step is not asked again; the profile also goes onto like/dislike-only rows.
- No Turnstile, rate limits only (same as comment votes).
- Minimum group size for comparison bars.
