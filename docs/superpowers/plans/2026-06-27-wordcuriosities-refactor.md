# WordCuriosities — Loop Refactor & A11y Fix

**File:** `src/components/word/WordCuriosities.astro`  
**Related:** `src/styles/components/_word-curiosities.scss`

## Audit findings

### Dead SCSS
`_word-curiosities.scss` lines 17–67 define `&__stats`, `&__stat`, `&__stat-value`, `&__stat-label` — none are used in the HTML. The component already uses `c-section-card__stat-*` classes from `_section-card.scss`. These are pure dead code.

### A11y gaps
1. `<ul>` has `list-style: none` — VoiceOver/Safari strips list semantics; needs `role="list"`.
2. The `<h3>` heading is not programmatically linked to the `<ul>` it labels. Add `id` to `<h3>` and `aria-labelledby` to `<ul>`.
3. Stats row uses `<div>` pairs (value + label) — these are key/value data, semantically a `<dl>` with `<dt>`/`<dd>` pairs. The outer stat-row wrapper becomes `<dl>`, each stat-box stays as `<div>` wrapping `<dt>` + `<dd>` (valid HTML5 — a `<div>` inside `<dl>` grouping `<dt>/<dd>` is allowed).
4. **TooltipPopover is already accessible** — uses `aria-describedby` + `role="tooltip"` + WCAG 1.4.13 Escape dismiss. No changes needed there.

### Loop optimization
The 9 `<li>` items are structurally identical: icon → optional prefix text → optional tooltip → text. They can be driven by a typed data array rendered in a single `.map()`. Two complexities to resolve:
- **Palindrome dual state** (positive or negative) — handled by ternary when building the array
- **Tooltip HTML content** (palindrome, isogram, alternating) — use `set:html` on `<Fragment slot="tooltip">` since the content is static and author-controlled

---

## Phase 1 — Remove dead SCSS

**File:** `src/styles/components/_word-curiosities.scss`

Remove the following unused BEM members (lines 17–67):
```scss
// DELETE entire blocks:
&__stats { ... }   // display: flex container — never used
&__stat { ... }    // individual stat box — never used
&__stat-value { ... } // inside &__stat — never used
&__stat-label { ... } // inside &__stat — never used
```
The stat styling comes from `c-section-card__stat-*` in `_section-card.scss`.

**Verification:** `grep -rn "c-word-curiosities__stats\|c-word-curiosities__stat" src/` → zero results expected.

---

## Phase 2 — A11y markup fixes

**File:** `src/components/word/WordCuriosities.astro`

### 2a. Link heading to list
```astro
<!-- Before -->
<h3 class='c-word-curiosities__heading'>Wortkuriositäten</h3>
<ul class='c-word-curiosities__list'>

<!-- After -->
<h3 id='word-curiosities-heading' class='c-word-curiosities__heading'>Wortkuriositäten</h3>
<ul class='c-word-curiosities__list' role='list' aria-labelledby='word-curiosities-heading'>
```

### 2b. Stats: div → dl/dt/dd
Outer row: `<div class='c-section-card__stat-row'>` → `<dl class='c-section-card__stat-row'>`

Each box: The `stat-value` is the value (`<dd>`), the `stat-label` is the term (`<dt>`). Put `<dt>` before `<dd>` in DOM order (term first is correct semantics); CSS flex on the box already controls visual stacking so visual order is unchanged.

```astro
<!-- Before (one box example) -->
<div class='c-section-card__stat-box'>
  <div class='c-section-card__stat-value'>{facts.uniqueLetterCount}</div>
  <div class='c-section-card__stat-label'>Unikate</div>
</div>

<!-- After -->
<div class='c-section-card__stat-box'>
  <dt class='c-section-card__stat-label'>Unikate</dt>
  <dd class='c-section-card__stat-value'>{facts.uniqueLetterCount}</dd>
</div>
```

Apply the same `dt`/`dd` swap to all three stat boxes (Unikate, Vokalarten, Silben).

Note: `c-section-card__stat-box` uses `display: flex; flex-direction: column` — no visual change needed since `<dt>` and `<dd>` inherit from their parent's flex context.

**Verification:** Run `pnpm lint` (no HTML a11y errors). Visually confirm stat boxes still render value large / label small — the CSS targets class names, not element types.

---

## Phase 3 — Data-driven fact list

**File:** `src/components/word/WordCuriosities.astro`

### 3a. Define FactEntry type in the frontmatter

```ts
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

type FactVariant = 'positive' | 'negative' | 'neutral' | undefined;

type FactEntry = {
  icon: AstroComponentFactory;
  variant: FactVariant;
  prefix?: string;       // text rendered BEFORE the tooltip/term (e.g. "Kein ")
  text?: string;         // text rendered AFTER the tooltip or as standalone content
  tooltip?: {
    term: string;
    htmlContent: string; // safe, author-controlled HTML for the tooltip slot
  };
};
```

### 3b. Build the facts array (in frontmatter)

```ts
const factEntries: FactEntry[] = facts ? [
  // Palindrome — always shown, flips positive/negative
  facts.isPalindrome
    ? {
        icon: Check,
        variant: 'positive',
        tooltip: {
          term: 'Palindrom',
          htmlContent: 'Ein Wort, das vorwärts wie rückwärts gleich gelesen wird.<br />Beispiel: <strong>Ehe</strong>, <strong>Legel</strong>',
        },
        text: ' – vorwärts wie rückwärts lesbar',
      }
    : {
        icon: X,
        variant: 'negative',
        prefix: 'Kein ',
        tooltip: {
          term: 'Palindrom',
          htmlContent: 'Ein Palindrom ist ein Wort, das vorwärts wie rückwärts gleich gelesen wird.<br />Beispiel: <strong>Ehe</strong>, <strong>Legel</strong>',
        },
      },

  // Isogram — conditional positive
  facts.isIsogram && {
    icon: Fingerprint,
    variant: 'positive' as FactVariant,
    tooltip: {
      term: 'Isogramm',
      htmlContent: 'Jeder Buchstabe kommt genau einmal vor – kein Buchstabe wiederholt sich.',
    },
    text: ' – kein Buchstabe wiederholt sich',
  },

  // Alternating vowel/consonant
  facts.isAlternating && {
    icon: Shuffle,
    variant: 'positive' as FactVariant,
    tooltip: {
      term: 'Vokal-Konsonant-Wechsel',
      htmlContent: 'Vokal und Konsonant wechseln sich an jeder Position perfekt ab.',
    },
  },

  // Has all vowels
  facts.hasAllVowels && {
    icon: Star,
    variant: 'positive' as FactVariant,
    text: 'Enthält alle 8 deutschen Vokale (a, e, i, o, u, ä, ö, ü)',
  },

  // Has umlaut
  facts.hasUmlaut && {
    icon: BadgeCheck,
    variant: 'positive' as FactVariant,
    text: 'Enthält Umlaut (ä, ö oder ü)',
  },

  // Double letters
  facts.doubleLetters.length > 0 && {
    icon: Copy,
    variant: undefined,
    text: `Doppelbuchstabe${facts.doubleLetters.length > 1 ? 'n' : ''}: ${facts.doubleLetters.map((l) => l + l).join(', ')}`,
  },

  // Longest consonant run
  facts.longestConsonantRun.length >= 3 && {
    icon: AlignJustify,
    variant: undefined,
    text: `Längste Konsonantenfolge: „${facts.longestConsonantRun.chars}" (${facts.longestConsonantRun.length} Buchstaben)`,
  },

  // Longest vowel run
  facts.longestVowelRun.length >= 2 && {
    icon: Mic,
    variant: undefined,
    text: `Längste Vokalkette: „${facts.longestVowelRun.chars}" (${facts.longestVowelRun.length} Buchstaben)`,
  },

  // Starts with
  {
    icon: ArrowRight,
    variant: 'neutral',
    text: `Beginnt mit ${facts.startsWithConsonant ? 'Konsonant' : 'Vokal'}`,
  },

  // Ends with
  {
    icon: ArrowLeft,
    variant: 'neutral',
    text: `Endet mit ${facts.endsWithConsonant ? 'Konsonant' : 'Vokal'}`,
  },
].filter(Boolean) as FactEntry[] : [];
```

### 3c. Replace the `<ul>` body with a single map

```astro
<ul class='c-word-curiosities__list' role='list' aria-labelledby='word-curiosities-heading'>
  {factEntries.map((fact) => (
    <li class:list={[
      'c-word-curiosities__fact',
      fact.variant && `c-word-curiosities__fact--${fact.variant}`,
    ]}>
      <span class='c-word-curiosities__fact-icon'>
        <fact.icon width='14' height='14' aria-hidden='true' />
      </span>
      {fact.prefix}
      {fact.tooltip ? (
        <TooltipPopover client:only='vue'>
          <span class='c-word-curiosities__term'>{fact.tooltip.term}</span>
          <Fragment slot='tooltip' set:html={fact.tooltip.htmlContent} />
        </TooltipPopover>
      ) : null}
      {fact.text}
    </li>
  ))}
</ul>
```

**Note on `class:list`:** Astro's built-in directive — pass an array, falsy values are ignored. Replaces manual string concatenation.

### 3d. Clean up icon imports
Remove the direct icon component imports that are no longer needed as top-level identifiers (they become array values):
- All 10 icon imports remain — they are now referenced inside the `factEntries` array, not directly in the template. No import changes needed.

**Verification:**
- `pnpm vitest run src/tests/unit/components/word/WordCuriosities.test.ts` → all tests pass
- `pnpm lint` → no errors
- Visual: all facts render with correct icons, colors, and tooltips

---

## Execution order

1. Phase 1 (SCSS dead code) — isolated, no logic change, safe to do first  
2. Phase 2 (a11y markup) — structural change, verify visually after  
3. Phase 3 (loop refactor) — logic change, run tests after  

Each phase is a separate commit using `refactor(word):` prefix.
