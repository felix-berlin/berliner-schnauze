## 1. Reveal meaning on wrong answers

- [x] 1.1 **Simpler than planned — `useBon.ts` untouched.** The parent `BerlinerOderNicht.vue` already keeps the answered card as `currentCard` during the shake window (`nextCard()` only runs after the timer), so it passes `:translation="currentCard.translation"` straight to `BonCard`. No composable / data-model change needed.
- [x] 1.2 `src/components/games/BonCard.vue`: added a `translation?: string | null` prop and a `revealMeaning` computed (`isReal && translation ? translation : null`); the overlay now renders `<span class="c-bon-card__overlay-verdict">War {{ overlayText }}!</span>` plus `<span class="c-bon-card__overlay-meaning">„{{ word }}" = {{ revealMeaning }}</span>` only when a meaning exists. Fakes → verdict only; real without translation → verdict only (no empty `= `).
- [x] 1.3 Meaning lives inside the same single `role="alert" aria-atomic="true"` overlay element, so verdict + meaning are announced once.

## 2. Reveal timing

- [x] 2.1 `src/components/games/BerlinerOderNicht.vue`: replaced the fixed 1200 ms shake with a `computed` duration passed to `useTimeoutFn` (VueUse accepts a getter) — `WRONG_REVEAL_MS = 2500` when the wrong card is real with a translation, else `WRONG_SHAKE_MS = 1200`. Named constants, no magic numbers.
- [x] 2.2 **Handled via the result screen instead of gating the transition.** A life-losing wrong answer sets `phase='result'` synchronously in `useBon`, so the card is gone before any shake. `BonResult.vue` already receives `:last-card`; added a `„word" = translation` meaning line there (for real last cards), so the player still learns the meaning of the fatal word. Lower-risk than delaying the endgame transition.
- [x] 2.3 Skipped the optional early-advance gate — the fixed 2500 ms pause felt fine in-browser; not worth the extra interaction state.

## 3. Idle-screen hint

- [x] 3.1 `BerlinerOderNicht.vue` idle phase: added `<p class="c-berliner-oder-nicht__idle-hint">` — "Tipp: Manche Wörter sind keen echtet Wort, sondern 'ne Abkürzung für 'ne Redewendung — nich imma wörtlich nehmen." (Berlinerisch voice per DESIGN.md). No new state/store/data.
- [x] 3.2 Added `&__idle-hint` SCSS (muted, italic, 0.875rem, `text-wrap: balance`, max-width) matching the component's existing local conventions. Verified present in-browser.

## 4. Verification

- [x] 4.1 Live browser check (Chrome DevTools MCP, dev server): caught a real wrong-on-real answer — overlay showed `War echtes Berlinerisch!` + `„ausmähren" = Eine Tätigkeit langsam ausführen`. Wrong-on-fake verdict-only + correct-toast path unchanged (covered by unit tests).
- [x] 4.2 Overlay is flex-column with padding + `text-wrap: balance` so the meaning wraps cleanly; reveal window is 2500 ms when a meaning is shown.
- [x] 4.3 Idle hint confirmed present in-browser; uses `--c-bon-text-muted` token so it follows light/dark like the sibling description.
- [x] 4.4 Verdict + meaning share one `role="alert" aria-atomic` element → announced once.

## 5. Tests & final checks

- [x] 5.1 Extended `src/tests/unit/components/games/BonCard.test.ts`: real+translation → meaning shown (contains word + translation); real without translation → verdict only, no meaning; fake → verdict only, no meaning.
- [x] 5.2 `pnpm test:unit` — 163 files / 1816 tests pass.
- [x] 5.3 `pnpm lint` clean. `pnpm typechecking` — 1 pre-existing error in `codegen.ts` (GraphQL-codegen config Schema typing), NOT touched by this change (confirmed via `git diff --name-only`); zero errors in the 5 changed BON files.
- [x] 5.4 `pnpm build:local` — succeeded, 1375 pages built.
