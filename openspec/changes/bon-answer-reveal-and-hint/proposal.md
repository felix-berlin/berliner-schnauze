## Why

The BON game ("Berliner oder Nicht") reveals a word's meaning only when the player
answers **correctly** — on a wrong answer the player learns only that they were wrong
("War echtes Berlinerisch!" / "War erfunden!"), never what the word actually means.
That's the moment a player is most curious and most likely to learn, so withholding
the meaning there is a missed teaching opportunity. Separately, some real Berlinerisch
words aren't literally what a player expects — a word can be an abbreviation for or
derived from an idiom (Redewendung) — and nothing in the game currently sets that
expectation, so players can feel misled when a "weird" word turns out to be real.

## What Changes

- **Reveal the meaning on wrong answers too.** When a player answers incorrectly on a
  **real** word, surface the word's translation/meaning (the same content already
  shown on a correct answer), co-located with the wrong-answer feedback. For a word
  the player wrongly judged as real but which is invented (a fake), there is no
  meaning to show, so the feedback stays "War erfunden!".
- **Add one short, general instructional hint** on the game's idle/start screen
  explaining that some Berlinerisch words are abbreviations for idioms and not always
  literal. This is a single piece of instructional copy — general, not per-word.

## Non-goals

- **No per-word explanation/hint from the word database.** The richer WordPress fields
  (`infoText`, `learnMore`, `examples[].exampleExplanation`) are deliberately NOT wired
  into the game. That would require piping new fields through the client-side
  `/api/search/index.json` (which the game and search both download), and the user
  explicitly chose the lightweight general hint instead. The per-word approach can be
  revisited as a separate, larger change if desired.
- **No change to the word data model, the GraphQL fragment, or the search index.**
- **No change to scoring, lives, streaks, deck-building, or sharing.**
- **No redesign of the correct-answer reveal** (its translation toast stays as-is);
  this change only brings the wrong-answer path up to parity.

## Capabilities

### New Capabilities
- `bon-answer-feedback`: the BON game's post-answer feedback behavior — what is
  revealed to the player after answering a card (correct vs wrong, real vs fake),
  including the meaning reveal, plus the idle-screen instructional hint about
  non-literal words.

### Modified Capabilities
- (none — no pre-existing spec covers the BON game)

## Impact

- **Code**: `src/composable/useBon.ts` (add meaning reveal to the wrong-answer branch),
  `src/components/games/BonCard.vue` (overlay text / computeds to include the meaning),
  `src/components/games/BerlinerOderNicht.vue` (idle-screen hint copy; possibly the
  wrong-answer shake/pause timing if the reveal needs longer to read).
- **Dependencies**: none new.
- **Accessibility**: the wrong-answer overlay already uses `role="alert"` and the game
  has ARIA live regions; the added meaning text must be announced correctly and not
  break existing screen-reader flow.
- **Open design questions** (resolved in design.md): (1) reveal-on-wrong via card
  overlay vs toast; (2) whether the current 1200 ms shake window is long enough to
  read a translation, or whether to lengthen it / add a "tap to continue".
- **Testing**: existing Vitest coverage for `useBon`/BON components plus manual browser
  verification (Chrome DevTools MCP) of both the wrong-answer reveal and the idle hint.
