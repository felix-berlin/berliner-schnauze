# Plan: Wortkuriositäten Redesign

**Branch:** `feature/more-word-details`
**Status:** Ready to implement

## Context

The "Wortkuriositäten" sub-section inside `WordSectionLinguistik` has three problems:
1. "Buchstaben" stat box is redundant — already shown directly above in the same section
2. "Einzigartig" label is unclear — means "unique letter count"
3. Fact list uses plain ✓/✗ characters instead of proper Lucide icons
4. Two computed fields (`startsWithConsonant`, `endsWithConsonant`) returned by `wordCuriosities()` are never rendered
5. No `hasUmlaut` field — relevant for Berlinerisch character
6. No tooltips explaining linguistic terms (Palindrom, Isogramm, etc.)

## Phase 0: Findings (done)

**`src/utils/wordHelper.ts`** — `wordCuriosities(word)` returns:
```ts
{
  isPalindrome: boolean;
  hasAllVowels: boolean;
  isIsogram: boolean;
  isAlternating: boolean;
  longestConsonantRun: { length: number; chars: string };
  longestVowelRun: { length: number; chars: string };
  doubleLetters: string[];
  uniqueLetterCount: number;
  totalLetterCount: number;        // REDUNDANT — same as word.length shown above
  distinctVowelCount: number;
  startsWithConsonant: boolean;    // computed but NEVER rendered
  endsWithConsonant: boolean;      // computed but NEVER rendered
}
```

**`src/components/word/WordCuriosities.astro`** — renders stat boxes + fact list
**`src/styles/components/_word-curiosities.scss`** — BEM styles for the component
**`src/components/word/WordSectionLinguistik.astro`** — parent, already shows Buchstaben/Vokale/Konsonanten stat boxes

Icons: load with `defineAsyncComponent` for Vue, or directly as `~icons/lucide/...` in Astro.

## Phase 1: Extend `wordCuriosities()` with `hasUmlaut`

**File:** `src/utils/wordHelper.ts`

Add `hasUmlaut: boolean` to the return value of `wordCuriosities()`.
Umlaut letters: `ä`, `ö`, `ü` (also uppercase: `Ä`, `Ö`, `Ü`).

```ts
const UMLAUTS = new Set(['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü']);
const hasUmlaut = [...word].some(c => UMLAUTS.has(c));
```

Add to return object: `hasUmlaut`.

**Update TypeScript interface** (if there's a return type annotation on `wordCuriosities`).

**Verification:** `wordCuriosities('Nüsse').hasUmlaut === true`, `wordCuriosities('ball').hasUmlaut === false`

## Phase 2: Fix stat boxes in `WordCuriosities.astro`

**File:** `src/components/word/WordCuriosities.astro`

**Remove** the "Buchstaben" stat box (`facts.totalLetterCount`) — it duplicates the value shown in the parent section above.

**Rename** the "Einzigartig" stat box to a clear label: `Einmalige Buchstaben` (or just `Unikate`).

**Result:** 2 stat boxes remain:
- `facts.uniqueLetterCount` → label: `Unikate`
- `facts.distinctVowelCount` → label: `Vokalarten` (unchanged)

Or optionally 3 boxes if a new meaningful stat is added (e.g. a syllable count via `hypher` — but that requires importing hypher, so skip for now).

## Phase 3: Add proper Lucide icons to fact list

**File:** `src/components/word/WordCuriosities.astro`

Replace ✓/✗ text characters with async-loaded Lucide icon components.
Use direct import syntax (`~icons/lucide/...`) — this is a static `.astro` file.

Icon mapping:
| Fact type | Positive icon | Negative icon |
|-----------|--------------|---------------|
| Palindrom | `~icons/lucide/refresh-cw` | `~icons/lucide/x` |
| Isogramm | `~icons/lucide/fingerprint` | — (only shown when true) |
| Alternating | `~icons/lucide/shuffle` | — (only shown when true) |
| All vowels | `~icons/lucide/star` | — |
| Doppelbuchstabe | `~icons/lucide/copy` | — |
| Konsonantenfolge | `~icons/lucide/align-justify` | — |
| Vokalkette | `~icons/lucide/mic` | — |
| Umlaut | `~icons/lucide/badge-check` | — |
| Starts/ends with | `~icons/lucide/arrow-right` | — |

Each list item: `<span class="c-word-curiosities__fact-icon">{Icon}</span> <span>text</span>`

## Phase 4: Render unused fields + new facts

**File:** `src/components/word/WordCuriosities.astro`

Add to the fact list:

```astro
{/* Starts/ends */}
<li class="c-word-curiosities__fact c-word-curiosities__fact--neutral">
  <ArrowRight /> Beginnt mit {facts.startsWithConsonant ? 'Konsonant' : 'Vokal'}
</li>
<li class="c-word-curiosities__fact c-word-curiosities__fact--neutral">
  <ArrowLeft /> Endet mit {facts.endsWithConsonant ? 'Konsonant' : 'Vokal'}
</li>

{/* Umlaut (only show if true — it's a positive Berlinerisch trait) */}
{facts.hasUmlaut && (
  <li class="c-word-curiosities__fact c-word-curiosities__fact--positive">
    <BadgeCheck /> Enthält Umlaut (ä, ö oder ü)
  </li>
)}
```

## Phase 5: Add tooltips for linguistic jargon

**File:** `src/components/word/WordCuriosities.astro`

Use `<TooltipPopover client:only="vue">` (already used in `WordHero.astro`) to add explanatory tooltips for terms the reader might not know.

Import: `import TooltipPopover from '@components/TooltipPopover.vue';`

Terms that need tooltips:
- **Palindrom** — "Ein Wort, das vorwärts wie rückwärts gelesen gleich bleibt. z.B. „Ehe" oder „Legel""
- **Isogramm** — "Ein Wort, in dem jeder Buchstabe genau einmal vorkommt."
- **Vokal–Konsonant-Wechsel** — "Jede Stelle wechselt zwischen Vokal und Konsonant ab."

Wrap the term label (not the whole `<li>`) in `<TooltipPopover>`.

Example pattern (copy from `WordHero.astro:32-44`):
```astro
<TooltipPopover client:only='vue'>
  <span class="c-word-curiosities__term">Palindrom</span>
  <Fragment slot='tooltip'>
    Ein Wort, das vorwärts wie rückwärts gleich klingt.
    Beispiel: <strong>Ehe</strong>, <strong>Legel</strong>
  </Fragment>
</TooltipPopover>
```

## Phase 6: Update styles

**File:** `src/styles/components/_word-curiosities.scss`

- Remove 3-column grid for stat boxes (now 2 boxes) — adjust `grid-template-columns` or use `auto-fit`
- Add `.c-word-curiosities__fact-icon` — `inline-flex`, `align-items: center`, icon size ~14px
- Add `.c-word-curiosities__fact--neutral` — uses `var(--grey-100)` or blue for icon color (not green/red)
- Add `.c-word-curiosities__term` — `text-decoration: underline dotted`, `cursor: help` to hint at tooltip

## Phase 7: Update tests

**File:** `src/tests/unit/components/word/WordCuriosities.test.ts` (if exists)

- Add test: `wordCuriosities('Nüsse').hasUmlaut === true`
- Add test: `wordCuriosities('ball').hasUmlaut === false`
- Update any snapshot or selector tests if `.c-word-curiosities__stat` count changed

Check for test files:
```bash
find src/tests -name "*Curiosit*" -o -name "*wordHelper*"
```

## Verification Checklist

- [ ] "Buchstaben" stat box no longer appears in Wortkuriositäten
- [ ] "Einzigartig" label replaced with clear German label
- [ ] Lucide icons visible in fact list (not ✓/✗ characters)
- [ ] `startsWithConsonant`/`endsWithConsonant` displayed
- [ ] `hasUmlaut` shown for words with ä/ö/ü
- [ ] Palindrom/Isogramm/etc. have tooltip on hover
- [ ] Dark mode looks correct
- [ ] `pnpm test:unit` passes
- [ ] `pnpm lint` passes
