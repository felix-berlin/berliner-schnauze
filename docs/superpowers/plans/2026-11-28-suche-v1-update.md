# Suche v1 update: Tablet and Schnellsuche (SPEC Part B)

Source: handoff update of 2026-11-28, merged into `docs/design/suche-v1/` (SPEC §3.1, §18–§27, `SchnellsucheV1.dc.html`, `generator-schnellsuchev1.py`). Boards and state screenshots: `.superpowers/sdd/2026-11-27-suche-v1/boards-update/assets/`. Builds on `2026-11-27-suche-v1.md`; global constraints stay, except: **breakpoints are now mobile `< 808`, tablet `808–999`, desktop `>= 1000`**, and the KI button is no longer icon-only at tablet width (§3.1).

Route mapping: SPEC says `/suche?q=`, the app serves the search at `/wort` (`/suche` redirects). Every `/suche?q=` in Part B means `searchUrl({ ...EMPTY_STATE, q })`.

## Task 15: Tablet layout 808–999 (SPEC §3.1)

Search page only. Sort moves into the meta row right of the count (44px pill, no "Sortieren" text); filter chips 44px high in one row; popover 360px, options and checkbox rows 44px; active-filter pills 36px, reset 44px tap target; A–Z register scrolls horizontally with fields ≥ 44px; hit row padding `14px 16px 14px 20px`, gap 16, jesagt bar 48px, play 40px; field keeps "Nach Bedeutung" text on the KI button and drops the `/` hint; keyboard hints in the meta row go away; header/footer already follow the shared components. Compare with `assets/boards/SucheV1Tablet*.jpg`. Tests: unit for the layout switches that live in JS, E2E at 834 (chips in one row, sort in meta row, all tap targets ≥ 44px, register scrolls, no horizontal overflow), visual baselines at 834 light and dark.

## Task 16: Quick search core (SPEC §21–§24 logic)

Pure logic and composables, no dialog shell yet: `useSearchHistory()` (localStorage, try/catch, 3 shown, limit and rules per §26.1 → `TODO(schnellsuche):`, dedupe, delete one, clear), group builder for "Im Wort" (max 5, prefix before contains) and "In der Bedeutung" (max 4) over `runSearch`, actions (`Nach Bedeutung suchen`, `Alle {n} Treffer anzeigen` / singular text, nothing-found with Kalle + "Meinste" pills + actions), empty state (Zuletzt jesucht, Heute, Gerade beliebt: 3 from the trend list, §26.3 → `TODO(schnellsuche):`), flat option list model for ↑/↓ across groups with wrap, no preselected row in the empty state, first row preselected while typing, `aria-activedescendant` ids. Tests first.

## Task 17: Quick search dialog (SPEC §18–§20, §22–§25)

Replace the header modal with the dialog: layout and motion per §20/§25 (desktop/tablet dialog, mobile full screen from 390 down to 807), scrim, `inert` page, body scroll lock, focus trap, focus returns to the trigger, rows per §22, footer per §20/§23 (key hints only with `hover: hover`, platform key ⌘ vs Strg), keys per §23 (Enter, Ctrl/⌘+Enter to the search page, Shift+Enter for KI, Del removes history entry, Esc clears then closes, Tab cycle), open via header button, `/` (not in fields) and Ctrl/⌘+K, on the search page itself `/` focuses the page field and opens no dialog, live region per §24, 120ms debounce, skeleton after 300ms, field empty on reopen, Matomo tracking through the existing composable. Remove `SearchModal.vue`/modal wiring that becomes dead. Compare with `assets/schnellsuche/boards/*.jpg` and `zustaende/*.jpg`.

## Task 18: KI rows in the dialog (SPEC §21.2, §21.4)

Same `SemanticSearch` core as the search page in a row variant: suggestion row from 3 words, "Nach Bedeutung" group with up to 3 hits and reasons only if the page shows them (page decision: no "Warum" line; the dialog board shows a reason line, so keep it behind `TODO(schnellsuche):` and follow the page behaviour), running / download / error rows, Shift+Enter, stale answers dropped, nothing of it in the bundle or DOM without `LanguageModel`. Tests with the existing `LanguageModel` mock.

## Task 19: Acceptance

E2E (SPEC §27 tests, seed words only), axe on the dialog states, no text under 13px, visual baselines for the dialog (1280 dark/light, 390), docker smoke if the build shape changed. Then one scoped re-review `4323e3ca..HEAD`, rulings list, final report.
