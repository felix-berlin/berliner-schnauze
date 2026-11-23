# Wortseite v18: Reuse audit (2026-11-23)

Read-only audit of the components, composables and styles the v18 rebuild added against what the codebase already had. Plan: `2026-11-22-wortseite-v18.md`. Status of each refactor is tracked in the SDD ledger (`.superpowers/sdd/2026-11-22-wortseite-v18/progress.md`).

## Owner decisions

- `DropdownPopover` is used for the actions menu even where the browser cannot do CSS anchor positioning (Firefox): the component's own fallback applies.
- `vTooltip` / `c-tooltip` are extended (tap-to-toggle on touch, ink variant) and take over the styles of the handoff (SPEC §14); the two hand-built tooltips (`WordBadges`, `recordTooltip.ts`) are migrated.
- All other recommendations stand as written below.
- Scheduling: before the merge of `feat/word-v18` into `main`, but only after the running tasks (visual batches 3/4, R1) are finished. Baselines are regenerated once, after R2.

---

# Reuse audit: Wortseite v18 (branch `feat/word-v18-islands`, vs `origin/main`)

Read-only audit, 2026-11-23. Scope: every component, composable, store, lib helper and SCSS partial this branch added
or changed under `website/src` (58 added, 13 modified; tests, docs and Payload schema/migrations excluded; the
server routes were checked too and reuse `captchaGate`/`reply`/`requestIp`/`verifyTurnstile` correctly).
SPEC = `wortseite-v18/SPEC.md` from `wortseite-v18-handoff_new.zip` (§4.3 controls, §5.1 menu, §5.2 citing,
§14 tooltips, §15 states, §16 motion, §17 a11y). Line numbers are from the tree at audit time; the visual batches
are committing in parallel, so they can drift by a few lines.

Important background: since the route switch (Task 20), the whole v3 tree is unreferenced by any page:
`WordHero.astro`, `WordReactions.vue`, `WordOptionDropdown.vue` `variant="word"` (only `WordHero` uses it),
`WordFeedbackCard.vue` + `useWordFeedbackFlow.ts`, `WordSidebar`/`WordTabBar`, `WordComments`/`CommentCard`,
`TooltipPopover` (only `WordHero`), `ConfirmDialog` (no caller at all). Task 21 deletes them. Several findings
below are "the v18 component re-implements its own v3 predecessor": the code to take over must be moved **before**
Task 21 deletes it.

## Summary

| #   | Finding                                                                                                                                                | Existing candidate                                                                                                     | Fit                                                 | Recommendation                                                                                                                                                      | Effort | Risk | Collides with V3/V4                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- | ----------------------------------------------------------- |
| 1   | `WordActions` ⋮ menu hand-built (open state, outside click, Esc, JS shift against clipping)                                                            | `DropdownPopover.vue` (`placement="top-end"`, `theme="bare"`) + keyboard code of `WordOptionDropdown` `variant="word"` | needs small extension                               | Extend `DropdownPopover` (expose `open/close`, optional entry animation), migrate                                                                                   | M      | M    | yes (`_word-actions.scss`, `WordActions.vue`)               |
| 2   | Share/copy in `WordActions` lost the word pulse `share` and the Matomo events                                                                          | `WordOptionDropdown.vue:237-279` (`reportWord`, `trackEvent`)                                                          | exact                                               | Reuse the calls (behaviour regression)                                                                                                                              | S      | L    | `WordActions.vue` script only                               |
| 3   | Reaction state in `WordActions` copies `WordReactions.vue` line for line                                                                               | `WordReactions.vue` (+ `utils/wordReaction.ts`)                                                                        | exact for logic                                     | Extract `useWordReaction(wordId)` before Task 21 deletes `WordReactions`                                                                                            | S      | L    | `WordActions.vue`                                           |
| 4   | Reaction pill styled twice (`_word-actions .pill`, `_word-stories .react`)                                                                             | `c-reaction` (`_reaction.scss`)                                                                                        | partial (different look)                            | Add `data-variant="pill"` to `c-reaction`, use in both                                                                                                              | S      | M    | yes (both partials)                                         |
| 5   | SPEC "Outline" button written 4×, "Pille" 1× + dashed pill 1×                                                                                          | `c-button` (no outline/pill variant yet)                                                                               | needs small extension                               | Add `c-button` `outline` + `pill` variants, migrate                                                                                                                 | M      | M    | yes (section-card, fehler, poll, stories, beispiele)        |
| 6   | Two sibling tooltip implementations (`WordBadges`, `recordTooltip.ts`) with two different colour pairs                                                 | `vTooltip` directive / `TooltipPopover` + `c-tooltip`; `home/SoonButton.vue` = same "Kommt bald … Einsprechen" button  | partial                                             | Unify on `vTooltip` with a touch-toggle option and an `ink` variant; at least merge the two siblings                                                                | M      | M    | yes (`_word-beispiele`, `_word-badges`, `WordExamplesCard`) |
| 7   | `ContributeForm` `.chip` re-implements an `aria-pressed` choice                                                                                        | `c-choice` (`_choice.scss`, already used by `WordPoll`)                                                                | needs small extension                               | Add `c-choice` `data-variant="chip"` (SPEC §4.3 chip), migrate                                                                                                      | S      | L    | yes (`_choice.scss` is being edited)                        |
| 8   | `ContributeForm` `.strip` (error / calm)                                                                                                               | `c-state` `data-variant="error"` (`CommentCard`, `WordPoll`)                                                           | exact (calm = default variant)                      | Reuse `c-state`                                                                                                                                                     | S      | L    | maybe (`_contribute-form.scss`)                             |
| 9   | "Live region clipped while empty" written 4×                                                                                                           | `u-sr-only` (`utilities/index.scss:6`)                                                                                 | exact for `WordActions`, partial for the rest       | `u-sr-only` in `WordActions`; one `u-sr-only-empty` utility for the other three                                                                                     | S      | L    | yes (actions, poll, stories)                                |
| 10  | `WordPoll` re-implements the PATCH rules (half/locality coupling), retry/ready and the step sequence of `useWordFeedbackFlow`; deletes via raw `fetch` | `useWordFeedbackFlow.ts:174-195`, `stores/wordFeedback.ts:230` `deleteAllFeedback`                                     | partial (view model differs)                        | Extract a pure `profilePatch()` into `utils/wordFeedbackView.ts`; add a per-word silent `deleteFeedback()` to the store; do not move `WordPoll` onto the composable | S-M    | M    | `WordPoll.vue` script only                                  |
| 11  | `WordPoll` `.confirm` inline alertdialog box                                                                                                           | `c-state` (CommentCard delete confirm), `mx.side-stripe`                                                               | partial (accent stripe)                             | Optional: `c-state` variant `confirm`                                                                                                                               | S      | L    | yes (`_word-poll.scss`)                                     |
| 12  | `WordStories` hand-rolled `matchMedia` + listener                                                                                                      | VueUse `useMediaQuery` (`FooterFarewell.vue:60`, same `50.5rem`)                                                       | exact                                               | Reuse                                                                                                                                                               | S      | L    | no                                                          |
| 13  | `lib/story.ts` `agoLabel`                                                                                                                              | `utils/relativeTime.ts` `relativeTime`                                                                                 | partial (weeks, flooring, min 1 minute)             | Optional: one `relativeTime` option; else keep                                                                                                                      | S      | L    | no                                                          |
| 14  | `WordStories` POSTs `/api/comment-votes` itself                                                                                                        | `useComments.ts:221` `vote`                                                                                            | partial (bound to the comment list)                 | Optional: shared `voteComment()` fetch helper (plan said "vote calls reused")                                                                                       | S      | L    | no                                                          |
| 15  | `lib/ownSubmissions.ts` hand-rolled JSON `localStorage`, writes into `bs-comment-keys`                                                                 | `useLocalStorage` (`useComments.ts:87`), `@nanostores/persistent` + `jsonCodec`                                        | partial (used from non-Vue `contributeTriggers.ts`) | Keep; but `rememberEditKey` loses its only reader when Task 21 deletes `useComments`                                                                                | –      | M    | no                                                          |
| 16  | Book link: `BookShelf` URL guard, host label, CMS disclaimers and click tracking not carried over                                                      | `BookShelf.astro:16-43,115` (`isWebUrl`, `isAmazonLink`, `trackEvent('Affiliate', …)`)                                 | exact                                               | Move the helpers to `lib/wordBook.ts`, apply in `wordPage.ts`, restore tracking                                                                                     | S      | L    | no                                                          |
| 17  | `FooterCalloutBook` + `_footer-callout-book.scss` re-implement the footer callout band                                                                 | `c-footer-callout` (`_footer-callout.scss`, Anki/App callouts)                                                         | needs small extension                               | `c-footer-callout` `data-variant="book"` (cover column, label)                                                                                                      | S-M    | L    | maybe (V4 "chrome")                                         |
| 18  | `c-word-label`                                                                                                                                         | `mx.eyebrow` (`mixins/_typo.scss`)                                                                                     | partial (SPEC 13px / 1.5px vs 2xs / 0.06em)         | Keep (SPEC-exact); optionally build on the mixin                                                                                                                    | –      | –    | –                                                           |
| 19  | Citing tabs: third copy of the APG tabs key handler                                                                                                    | `ResultsBand.vue:154`, `FreshLists.vue:130` (not shared either)                                                        | partial                                             | Optional `useRovingTabs`; else keep                                                                                                                                 | S      | L    | `WordActions.vue`                                           |
| 20  | `WordActions` `.close` (44px icon close)                                                                                                               | `c-icon-button` (`_icon-button.scss`, public colour props)                                                             | needs small extension (hover look)                  | Reuse `c-icon-button` with `--icon-button-color`                                                                                                                    | S      | L    | yes (`_word-actions.scss`)                                  |
| 21  | `WordActions` uses raw `navigator.clipboard` / `navigator.share` despite the VueUse rule                                                               | `useClipboard` / `useShare`                                                                                            | not a fit                                           | Keep: `useClipboard().copy` swallows errors, so SPEC §15 "Markiert. Mit Strg+C kopieren." is impossible with it; add a one-line comment                             | –      | –    | –                                                           |
| 22  | `WordLinks` picks the random word on the server                                                                                                        | `RandomWordButton.vue` (client pick, used by `NextLinks`)                                                              | partial                                             | Owner decision: the server pick is cached with the page (5 min proxy), so every visitor in that window gets the same "random" word                                  | S      | L    | no                                                          |
| 23  | `lib/bezirkNames.ts`                                                                                                                                   | `data/berlinAreas.ts` names                                                                                            | exact data, different weight                        | Keep (keeps map geometry out of the form bundle; a sync test exists)                                                                                                | –      | –    | –                                                           |
| 24  | `WordToc` + `lib/wordToc.ts`                                                                                                                           | `WordSidebar`/`WordTabBar` + `utils/wordSections.ts`                                                                   | reuses `initScrollSpy`                              | Keep; old ones go in Task 21                                                                                                                                        | –      | –    | –                                                           |
| 25  | `mobileBar.ts` (vanilla wrapper)                                                                                                                       | `VoiceButtons.vue` island                                                                                              | not a fit (one button, no hydration wanted)         | Keep; it already reuses `useVoicePlayer`                                                                                                                            | –      | –    | –                                                           |

Count: **14 reuse/extend-and-migrate** (1-10, 12, 16, 17, 20; #2 and #16 also restore lost behaviour),
**5 optional** (11, 13, 14, 19, 22), **6 keep** (15, 18, 21, 23, 24, 25).

Good reuse already in place (no finding): `WordPoll` (`c-choice` tiles, `c-state`, `BerlinAreaMap`, `USAGE_OPTIONS`,
`wordFeedbackView`, the `$feedback` store), `ContributeForm` (`TurnStile`, `captchaWaitToast`, `c-input`/`c-textarea`/
`c-select`), `WordHead` (`WordSeal`, `WordImages`, `Lightbox`), `useOnline` (re-exports VueUse), `wordSuggest`
(Orama index of the search), all API routes (`captchaGate`, `reply`, `requestIp`, `logRouteError`), every viewport
query goes through `mx.breakpoint` in `objects/_word-v18.scss`, components use container queries only.

## Details

### 1. ⋮ menu → `DropdownPopover` (the owner's example)

- New: `website/src/components/word/WordActions.vue:35-108` (markup), `:309-403` (menu state, keys, `place()` shift,
  outside-click and Esc listeners); `website/src/styles/components/_word-actions.scss:84-175` (`.more`, `.menu`, `.item`).
- Existing: `website/src/components/DropdownPopover.vue:1-135` + `_dropdown-popover.scss` (placements incl.
  `top-end` = `position-area: block-start span-inline-start`, `:103-109`; `position-try-fallbacks` flip;
  theme `bare` drops sheet and arrow; fade with `@starting-style`). Its v3 user `WordOptionDropdown.vue:1-63,166-183`
  (`variant="word"`, slot with `role="menu"`, ↑/↓/Home/End, Tab closes, `aria-haspopup="menu"`, live region, check
  icon 2 s) is the predecessor of exactly this menu; `_word-menu.scss` its sheet. Also `CommentCard.vue:87`
  (`theme="menu"`).
- What `DropdownPopover` gives for free (checked in source and `DropdownPopover.test.ts`):
  native `popover="auto"` → outside click and Esc (light dismiss), top layer (the header's `overflow: clip` can no
  longer cut it, so `place()`/`shift` and the resize listener in `WordActions.vue:358-383` go away), focus back to
  the trigger when focus was inside (`onToggle`, `:115-129`), `aria-expanded`/`aria-controls`/`popovertarget` via
  `triggerProps`, CSS anchor positioning (no JS positioning), menu stays open while copying (SPEC §5.1 "Menü bleibt
  offen").
- What it lacks / gaps against SPEC §5.1/§15/§16/§17:
  - `role="menu"`/`menuitem`, ↑/↓/Home/End, Tab-closes: not in `DropdownPopover`, lives in the slot (copy from
    `WordOptionDropdown.vue:166-183`; `WordActions` has the same code). APG extras that `WordActions` has and
    `WordOptionDropdown` lacks: Enter/Space on the trigger moves focus to the first item (`event.detail === 0`),
    ↑ on the trigger opens on the last item. Keep these in the slot or move a `menu` keyboard mode into
    `DropdownPopover` (then `CommentCard` gains it too).
  - No programmatic open: `close` exists but is not exposed; the share fallback (`WordActions.vue:301-306`) opens the
    menu to select the link text → add `defineExpose({ open, close })` (`showPopover()`), and wait for `hasContent`
    (content renders only while open, `v-if="hasContent"`).
  - Motion: SPEC §16 wants opacity + `translateY(-6px)` 180 ms; `DropdownPopover` fades only (the `nav` theme has a
    drop). Small variant or keep the animation on the slot's sheet.
  - `aria-haspopup`: `triggerProps` sets `true`; override with `"menu"` on the button (as `WordOptionDropdown` does).
  - Browsers without CSS anchor positioning get the panel centred in the viewport (`_dropdown-popover.scss`
    `@supports not (position-area…)`): there the SPEC "opens upward, right aligned" is not met. Check the
    Firefox >= 146 floor for `position-area` support before migrating; today `WordActions` (absolute positioning) works
    everywhere.
  - `name` must be unique across islands: use `word-actions-${slug}`.
  - The Esc handler of `WordActions` still has to close the citing panel (§5.2) — only the menu half goes away.
- Tests: `WordActions.test.ts` (39 tests, about half touch the menu) need the popover mocks used in
  `DropdownPopover.test.ts:27-43` (`showPopover`/`hidePopover` + `ToggleEvent`). E2E `word-v18.spec.ts:141-180,
  342-370, 404-410` select by role/name and `.c-word-actions [role=menu]`; the popover stays in that DOM subtree, so
  they survive.
- Recommendation: **extend `DropdownPopover` (expose open/close, optional drop animation for `bare`) and migrate**;
  take the role/keyboard slot code from `WordOptionDropdown`; Task 21 then deletes its `word` branch and
  `_word-menu.scss`. Do it after V3 (same files).

### 2. Lost telemetry on share and copy

- New: `WordActions.vue:287-307` (`copyLink`, `copyWord`, `share`) — no `reportWord(wordId, "share")`, no
  `trackEvent`.
- Existing: `WordOptionDropdown.vue:237` (`reportWord(wordId, "share")`, feeds `/api/word-pulse` and so the trending
  lists), `:240`, `:264`, `:279` (Matomo "Word Share", "Word Copy Link", "Word Copy"). `website/CLAUDE.md` lists
  `WordOptionDropdown` as a pulse hook.
- Recommendation: **reuse the calls** (skip for drafts: `wordId === undefined`). Script-only, S, no SCSS collision.

### 3. Reaction logic duplicated from `WordReactions.vue`

- New: `WordActions.vue:461-495` (`stored`, `optimistic`, `current`, `count`, `react`).
- Existing: `WordReactions.vue:36-70` — same store, same optimistic rollback, same count arithmetic. Differences:
  `WordActions` adds the offline lock and clamps at 0.
- Recommendation: **extract `useWordReaction(wordId)`** (offline lock + clamp included) before Task 21 deletes
  `WordReactions.vue`; `WordActions` keeps its markup. S.

### 4. Reaction pill styled twice

- New: `_word-actions.scss:34-79` (`.pill`, reactions + Teilen + ⋮), `_word-stories.scss:127-170` (`.react`,
  "Jenau!"/"Kenn ick anders"). Same 36px look / 44px hit band via `--word-control-block`, same border, same pressed
  state, small differences (hover colour, font size).
- Existing: `c-reaction` (`_reaction.scss`), SPEC §4.3 "Reaktion" covers both rows. Its current look (borderless,
  4px radius) is the v3 one, so it is not drop-in.
- Recommendation: **add `data-variant="pill"` to `c-reaction`** (SPEC §4.3 Reaktion) and use it for both; `Teilen`
  and `⋮` can take the same class. Collides with V3.

### 5. Outline / Pille buttons (SPEC §4.3 "nur diese Stile")

- New, identical declarations (44px, `0 16px`, 4px radius, `1.5px solid var(--color-accent-active)`, chip hover):
  `_section-card.scss:179` `.cta`, `_word-fehler.scss:39` `.report`, `_word-poll.scss:176` `.res`,
  `_word-stories.scss:42` `.ask`. Pille: `_section-card.scss:124` `.add`; dashed pill: `_word-beispiele.scss:59`
  `.record-button`.
- Existing: `c-button` with variants (`primary`, `secondary`, `lg`, …) and public knobs; no outline/pill variant.
  The primary "Absenden"/"Kopieren" already use `c-button data-variant="primary"`.
- Recommendation: **add `c-button` variants `outline` and `pill`** (SPEC names them as the only allowed styles, so
  one definition each is the point), migrate the 6 call sites. Collides with V3/V4; visual baseline changes.

### 6. Tooltips

- New: `WordBadges.vue:13-30,55-108` + `_word-badges.scss:65-95` (trend tooltip: hover/focus via CSS, tap-to-show
  then follow, Esc dismiss, outside click, JS `shift` against the header clip); `recordTooltip.ts:1-49` +
  `_word-beispiele.scss:94` + `WordExamplesCard.astro:43-48` ("Einsprechen": same behaviour, document-level
  listeners). The two use **different colours** (`text-strong`/`surface-sheet` vs `surface-inverse`/`text-on-active`)
  for one SPEC §14 style.
- Existing: `directives/tooltip.ts` (`vTooltip`, registered globally in `pages/_app.ts`): `popover="manual"`, top
  layer, anchor positioning with flip fallbacks, `role="tooltip"`, sets `aria-describedby`, Esc hides (WCAG 1.4.13),
  hoverable (panel cancels the hide), placements incl. `top` and `bottom-start`. `TooltipPopover.vue` (component form,
  client-only id). `home/SoonButton.vue` is the same aria-disabled "Kommt bald … Einsprechen" button with `v-tooltip`.
- Gaps: no touch toggle (on touch `pointerleave` follows the tap, the tooltip hides after 200 ms; SPEC §14 "auf Touch
  per Tap"); the trend link's "first tap shows, second follows" rule; `c-tooltip` look (floating surface, arrow,
  100 ms) differs from SPEC §14 (ink ground, 13px, 150 ms + 4px, no arrow) → new `data-variant`; works only after
  hydration (WordBadges is an island already; "Einsprechen" sits in an Astro card and would need a tiny island per
  example, or join the `VoiceButtons` island); same anchor-positioning fallback caveat as #1.
- Recommendation: **unify**. Preferred: extend `vTooltip` (`touch: "toggle"`, `variant: "ink"`), use it in
  `WordBadges` and a `SoonButton`-style record button. Minimum: one tooltip style and one behaviour helper for both
  siblings. M; collides V3/V4.

### 7. Chips in `ContributeForm` → `c-choice`

- New: `ContributeForm.vue:25-38`, `_contribute-form.scss:71-95` (`.chip`, `aria-pressed`, 36px pill, pressed = ink
  rim on card3).
- Existing: `c-choice` (`_choice.scss`), "one answer out of several, state via aria-pressed", variants tile/pill/segment;
  `WordPoll` uses it. SPEC §4.3 "Chip (Auswahl)" pressed look (ink rim, card3) is not the default orange fill →
  needs a `chip` variant. Open owner question (progress.md, Task 16) on `aria-pressed` vs `radiogroup` is unaffected.
- Recommendation: **add `c-choice` `data-variant="chip"`, migrate**. `_choice.scss` is being edited by V3 right
  now → after V3.

### 8. Error/calm strip → `c-state`

- New: `ContributeForm.vue:151-167`, `_contribute-form.scss:180-205` (`.strip`, `data-variant="calm"`).
- Existing: `c-state` (`_state.scss`): stripe + icon + `.body`/`.detail`, variants `error`, `offline`, `done`;
  the default variant is the calm muted stripe. `WordPoll.vue:35-60` and `CommentCard.vue:158-190` use it for the
  same SPEC §15 strings.
- Recommendation: **reuse `c-state`** (exact). S.

### 9. Empty live regions

- New: `_word-actions.scss:184` `.live` (always hidden = `u-sr-only`), `_contribute-form.scss:171` `.live:empty`,
  `_word-stories.scss:196` `.note:empty`, `_word-poll.scss:27` `.notice:not(:has(> *))`.
- Existing: `u-sr-only` (`styles/utilities/index.scss:6`), used by `WordOptionDropdown`/`CommentCard` for the same
  "Link kopiert" region.
- Recommendation: `WordActions` → **`u-sr-only`** (exact); the other three → **one utility** (e.g. `u-sr-only-empty`
  with the `:not(:has(> *))` form, which also covers `v-if` comment nodes). S; collides with V3 partials.

### 10. `WordPoll` vs `useWordFeedbackFlow`

- New: `WordPoll.vue` `answer` (PATCH builder with half/locality/area coupling), `vote`/`retry` ("failed GET → load
  first"), `sequence`/`steps`, `remove` (raw `fetch(DELETE ?word=)` plus `$profile`/`setRemember` reset).
- Existing: `useWordFeedbackFlow.ts` `answerProfile` (same patch object, same comments), `ready`/`retry`, `steps`;
  `stores/wordFeedback.ts:230` `deleteAllFeedback` (deletes **all** words of the cookie and toasts — different
  semantics, so not drop-in).
- Fit: the v18 view model (A/B/C, explicit result, no history stack, "ändern" restarts) differs; moving `WordPoll`
  onto the composable would mean rewriting both. The duplicated **rules** are the risk (the API rejects a half
  without origin `grewUp` etc.).
- Recommendation: **extract a pure `profilePatch(key, value, ctx)`** into `utils/wordFeedbackView.ts` (already shared)
  with a unit test, use it in `WordPoll`; **add `deleteFeedback(wordId, { silent })`** to the store next to
  `deleteAllFeedback`; delete the composable in Task 21. S-M; script only.

### 11-25 (short)

- 11 `WordPoll` `.confirm` (`_word-poll.scss:369`): `c-state` already hosts an inline `alertdialog` in
  `CommentCard.vue:158`; a `confirm` variant with the accent stripe would drop ~30 lines. `ConfirmDialog` (modal
  store) is **not** a fit: SPEC §7.4 wants inline, non-blocking. Optional.
- 12 `WordStories.vue:146-179`: `useMediaQuery("(width < 50.5rem)")` replaces the `matchMedia` + add/remove listener
  pair (same SSR behaviour: false until mounted). Exact, S.
- 13 `lib/story.ts` `agoLabel` vs `utils/relativeTime.ts`: different rounding and units; only merge if the owner
  wants one German relative-time style site-wide. Optional.
- 14 `WordStories.vue:213` vs `useComments.ts:221`: same POST and count update; a shared `voteComment()` helper would
  keep one copy once `useComments` is deleted. Optional.
- 15 `lib/ownSubmissions.ts`: keep (non-Vue caller), but `rememberEditKey` writes `bs-comment-keys` "so the existing
  edit flow finds it" — that flow (`useComments`) is deleted in Task 21, after which the key is write-only. Decide
  in Task 21: drop `rememberEditKey` or build the v18 edit flow.
- 16 Book link (`services/payload/wordPage.ts:105-114`, `WordFactsCard.astro:38-46`, `FooterCalloutBook.astro`): the
  CMS `href` goes into `<a href>` unchecked (BookShelf filtered to http(s) with a host, "no javascript: URLs"); the
  disclosure is hard-coded "Amazon" regardless of host and ignores the CMS `disclaimers`; the
  `trackEvent('Affiliate', 'Book clicked')` is gone. Move `hostOf`/`isWebUrl`/`isAmazonLink` into
  `lib/wordBook.ts`, filter in `pickBook`, restore the tracking. Editor-controlled input, so low severity, but it is a
  guard that existed.
- 17 `_footer-callout-book.scss:5-30` repeats `c-footer-callout` (page ground, rule above, 88px padding, condensed
  uppercase 56px title, focus colour, container breakpoints); add `data-variant="book"` (cover column, small label).
- 18 `c-word-label`: SPEC §4.2 values differ from `mx.eyebrow`; keep.
- 19 Citing tabs key handler: third copy (`ResultsBand.vue:154`, `FreshLists.vue:130`); a `useRovingTabs` would serve
  all three. The visual segment is not `c-choice` `segment` (SPEC: raised pill segment). Optional.
- 20 `_word-actions.scss:221` `.close` → `c-icon-button` with `--icon-button-color: var(--color-text-muted)`; SPEC
  §5.2 only says "Schließen-X (44px)". S.
- 21 Raw clipboard/share in `WordActions`: keep; the `Markiert` fallback needs the rejection that `useClipboard`
  hides (`WordOptionDropdown.vue` documents this). Add a one-line why-comment near `copy()`.
- 22 `WordLinks.astro:15-18`: the server-side random pick is cached with the page; `RandomWordButton` picks on the
  client. The comment says the child's `c-*` styles were the blocker; `NextLinks` passes a class to it. Owner call.
- 23-25 keep (see table).

## Suggested order

V3 (controls) and V4 (chrome/details, baselines) are editing `_word-actions.scss`, `_word-poll.scss`,
`_choice.scss`, `_word-beispiele.scss`, `_word-stories.scss`, voice buttons, the TOC, `WordExamplesCard.astro` and
`objects/_word-v18.scss` right now.

1. **Now, no collision (script/server only):** #2 telemetry, #16 book guard + tracking, #10 `profilePatch` +
   per-word delete (touches `WordPoll.vue` script only; if V3 edits `WordPoll.vue` markup, rebase is trivial), #12
   `useMediaQuery`, #3 `useWordReaction` extraction (script of `WordActions.vue`; wait if V3 edits that file).
2. **After V3 lands, before the V4 baseline commit** (they change pixels, so the baselines should be taken once,
   after them): #7 `c-choice` chip, #5 `c-button` outline/pill, #4 `c-reaction` pill, #9 sr-only utility, #8
   `c-state` strip, #20 close button, #11 (optional), then #1 menu → `DropdownPopover` (largest; needs the
   `DropdownPopover` extension and the popover mocks in `WordActions.test.ts`).
3. **After V4:** #6 tooltips (V4 touches badges/examples details), #17 footer callout variant (if V4 touches the
   footer).
4. **Before Task 21** (it deletes the sources): take over what #1 needs from `WordOptionDropdown` `word`, #3 from
   `WordReactions`, #10 from `useWordFeedbackFlow`, #14 from `useComments`; decide #15.
5. Optional items (#13, #14, #19, #22) whenever convenient.

If step 2 cannot wait for V3/V4, the alternative is to accept a second baseline regeneration after the refactors.
