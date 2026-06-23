# Plan: Expand Fake Word Pool (10×)

## Goal

Grow the single flat `fakeWords` array from ~80 words to ~800 words.  
The existing game logic already picks randomly on-the-fly via `fisherYates` in
`_makeQueuedDeck` — no structural changes needed anywhere. More words = automatic
variety per game.

---

## Context

- **Data file**: `src/data/fakeWords.ts` — one flat `FakeWord[]` (50 invented + 30 hochdeutsch)
- **Consumer**: `src/components/games/BerlinerOderNicht.vue:77,140` — imports `fakeWords`, passes to `init()`
- **Composable**: `src/composable/useGame.ts:118–125` — `_makeQueuedDeck()` calls `fisherYates` on the full pool; more entries = more unique decks automatically
- **Type**: `FakeWord = { word: string; category: 'invented' | 'hochdeutsch' }`

**No changes needed** to `useGame.ts`, `BerlinerOderNicht.vue`, or any test.  
Only `fakeWords.ts` changes.

---

## Target sizes

| Category      | Current | Target   |
|---------------|---------|----------|
| `invented`    | 50      | ~500     |
| `hochdeutsch` | 30      | ~300     |
| **Total**     | **80**  | **~800** |

---

## Phase 1 — Expand `src/data/fakeWords.ts`

### 1a — Invented words (~450 new entries)

Keep all 50 existing entries. Add ~450 more invented words that plausibly sound
berlinerisch but don't exist. Guidelines:

- Mix phonetic patterns: `-ke`, `-tz`, `-el`, `-ling`, `-er`, `Kn-`, `Wr-`, `Pf-`, `Schn-`, `Qu-`
- Vary length: 6–14 characters
- Capitalize first letter (German noun style)
- No duplicates across all sets

```ts
{ category: 'invented', word: 'Schnübbel' },
{ category: 'invented', word: 'Knaffel' },
// ... ~450 more
```

### 1b — Hochdeutsch words (~270 new entries, generated directly)

Keep all 30 existing entries. Write ~270 more common everyday German nouns from
language knowledge — no external source needed.

Curation rules:

- Prefer compound nouns (≥ 8 chars) — harder to guess
- No words already in the `invented` or existing `hochdeutsch` list
- No Berlin dialect words (don't overlap with real Berliner Schnauze vocabulary)
- Single-word entries only — no spaces, no hyphens
- Capitalize first letter

```ts
{ category: 'hochdeutsch', word: 'Schuhbürste' },
{ category: 'hochdeutsch', word: 'Tischdecke' },
// ... ~270 more
```

### 1c — File structure (unchanged exports)

The file stays a plain array export — no helper functions, no pools:

```ts
export interface FakeWord {
  word: string
  category: 'invented' | 'hochdeutsch'
}

export const fakeWords: FakeWord[] = [
  // ~500 invented entries
  { category: 'invented', word: '...' },
  // ~300 hochdeutsch entries
  { category: 'hochdeutsch', word: '...' },
]
```

**Verification after Phase 1**:

- `fakeWords.filter(f => f.category === 'invented').length >= 500`
- `fakeWords.filter(f => f.category === 'hochdeutsch').length >= 300`
- No duplicate `.word` values: `new Set(fakeWords.map(f => f.word)).size === fakeWords.length`
- `pnpm test:unit` — all passing (no import changes needed)

---

## Phase 2 — Final Verification

1. `pnpm test:unit` — all green
2. `pnpm lint` — no errors
3. Duplicate check: `new Set(fakeWords.map(f => f.word)).size === fakeWords.length`
4. Spot-check: no real Berliner Schnauze words accidentally appear in hochdeutsch list
5. Spot-check invented words: none should be real German words (quick gut-check)

---

## Anti-Patterns

- Do NOT split into multiple arrays or add helper functions — the flat array is the interface
- Do NOT change `FakeWord` interface
- Do NOT change `useGame.ts` or `BerlinerOderNicht.vue`
- Do NOT add words shorter than 5 characters (too obvious as fake)
- Do NOT use Wiktionary `action=parse` — returns HTML, not word lists
