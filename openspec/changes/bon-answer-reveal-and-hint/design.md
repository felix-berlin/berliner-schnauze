## Context

Post-answer feedback in the BON game lives in three places:

- `src/composable/useBon.ts` `answer()` (~lines 188-231): the correct branch
  (~197-221) fires a success toast `„${card.word}" = ${card.translation}` — but only
  when `card.isReal && card.translation`. The wrong branch (~222-230) only resets the
  streak and decrements a life; it reveals nothing about the word.
- `src/components/games/BonCard.vue` (~lines 30-39, computeds ~111-117): on a wrong
  answer the card shows an overlay (`role="alert"`) reading "War echtes Berlinerisch!"
  or "War erfunden!" — driven by `showOverlay = isShaking && lastAnswerCorrect === false
  && isReal !== null` and `overlayText = isReal ? 'echtes Berlinerisch' : 'erfunden'`.
- `src/components/games/BerlinerOderNicht.vue` (`startShakeTimer` ~lines 215-220): the
  wrong-answer card stays visible ~1200 ms (the shake window) before the next card.

A `BonCard` carries only `{ word, isReal, slug?, translation? }` (useBon.ts:9-14).
`translation` is the only meaning-bearing field, and it exists only for real words
(fakes come from `src/data/fakeWords.ts` and have no meaning). There is no dedicated
per-card "reveal" flag; reveal is implicit from `isShaking` + `lastAnswerCorrect`.

The idle/start screen already shows a one-sentence rule explanation (per the game
design doc), which is the natural home for a general instructional hint.

## Goals / Non-Goals

**Goals:**
- On a wrong answer for a **real** word, reveal the same meaning (`translation`) the
  player would have seen on a correct answer, co-located with the existing
  wrong-answer feedback so it's actually seen.
- Add one short, general idle-screen hint that some Berlinerisch words are
  abbreviations for idioms and not always literal.
- Preserve all existing behavior: correct-answer toast, scoring, lives, streaks,
  animations, sharing, and screen-reader support.

**Non-Goals:**
- No per-word explanation sourced from `infoText`/`learnMore` (would require search-index
  plumbing — explicitly deferred).
- No change to the word data model, GraphQL, or `/api/search/index.json`.
- No redesign of the correct-answer path.

## Decisions

**Decision: Reveal the wrong-answer meaning in the card overlay, not a toast.**
On a wrong answer the card remains visible for the shake window, so extending the
existing overlay keeps the reveal exactly where the player is already looking. The
correct-answer path is inherently a toast because its card animates out immediately —
so the two paths use different mechanisms *by necessity*, not inconsistency. Reuse the
existing overlay element (already `role="alert"`) rather than adding a second channel.
- Overlay copy for a real word answered wrong: base verdict plus the meaning, e.g.
  `War echtes Berlinerisch! — „Aas" = fauler Mensch`.
- For a fake answered wrong (player guessed real): unchanged — `War erfunden!` (no
  meaning exists).
- For a real word with no `translation` present: show the verdict alone (graceful
  fallback), never an empty `= `.
- *Alternative considered*: fire the same success-style toast on wrong answers.
  Rejected — a toast during a shake/"you lost a life" moment competes with the card
  for attention and is easily missed; and mixing a "success"-styled toast into a wrong
  answer is semantically odd.

**Decision: Lengthen the wrong-answer reveal window when a meaning is shown.**
1200 ms is enough to register "you were wrong" but likely too short to read a
translation. When the overlay includes a meaning, extend the pause (target ~2500 ms —
a tunable knob, not a hard rule) so the reveal is readable; keep ~1200 ms when there's
only the bare verdict (fake). The exact duration is a UX calibration value to confirm
in-browser, not a fixed constant baked blindly.
- *Alternative considered*: a "tap/swipe to continue" gate instead of a timed pause.
  Rejected for the core change — it adds an interaction state and changes the game's
  rhythm; a longer timed pause is the smaller change. May be added later if the fixed
  pause feels wrong for fast players. Optionally allow an early advance
  (tap/next-key) to skip the remaining pause without requiring it.

**Decision: Ensure the reveal also shows on the life-losing (final) wrong answer.**
A wrong answer can drop lives to 0 and transition to the result screen. The reveal
must still be shown before that transition (or the transition delayed by the same
window), so the last mistake isn't the one time the player learns nothing. Confirm the
game-over path honors the reveal window; if it currently transitions immediately, gate
the transition on the same timer.

**Decision: Idle-screen hint is static instructional copy.**
Add one short line near the existing rules text in `BerlinerOderNicht.vue`'s idle
phase, e.g. "Tipp: Manche Berliner Wörter sind Abkürzungen für Redewendungen — nicht
immer wörtlich nehmen." No new state, store, or data. Follow the project's German
voice (cheeky/warm, per DESIGN.md) — final wording confirmed during implementation.

## Risks / Trade-offs

- [Risk] Lengthening the wrong-answer pause could feel sluggish to fast players.
  → Mitigation: keep the extension modest (~2500 ms) and only when a meaning is shown;
  optionally allow tap/key to advance early. Treat the duration as a tunable knob and
  verify the feel in-browser.
- [Risk] The overlay text grows from ~2 words to a short sentence, which could overflow
  or wrap awkwardly on small cards.
  → Mitigation: verify layout at mobile widths; allow the overlay to wrap; keep the
  meaning to the single `translation` string (already short).
- [Risk] Screen-reader double-announcement or truncation if the overlay text and any
  existing live region both change.
  → Mitigation: reuse the single `role="alert"` overlay as the announcement source;
  verify with the existing ARIA live-region setup that the meaning is read once.
- [Trade-off] Correct and wrong reveals use different UI channels (toast vs overlay).
  Accepted: it's dictated by whether the card stays on screen, and each is the right
  fit for its moment.

## Migration Plan

1. `useBon.ts`: in the wrong-answer branch, make the card's `translation` available to
   the UI reveal (e.g. via existing shake/last-answer state the card already reads), so
   the overlay can render it. No data-model change.
2. `BonCard.vue`: extend `overlayText` (or add a companion computed) to append the
   meaning for a real word answered wrong; keep the bare verdict for fakes / missing
   translation.
3. `BerlinerOderNicht.vue`: adjust the wrong-answer pause to the reveal window (and
   ensure game-over honors it); add the idle-screen hint copy.
4. Verify in-browser (Chrome DevTools MCP): wrong-on-real shows meaning; wrong-on-fake
   shows "erfunden"; correct path unchanged; idle hint present; mobile layout ok;
   screen-reader announcement correct.
5. Run/adjust existing `useBon`/BON component tests; add a test asserting the
   wrong-answer reveal content for a real vs fake card.
6. Rollback: revert the three files — fully isolated, no shared/foundational changes.

## Open Questions

- Exact wrong-answer pause duration (~2500 ms starting point) — confirm by feel
  in-browser; possibly expose as a named constant next to the existing shake timing.
- Whether to also let the player advance early (tap/key) during the reveal — nice-to-
  have, decide during implementation based on how the fixed pause feels.
