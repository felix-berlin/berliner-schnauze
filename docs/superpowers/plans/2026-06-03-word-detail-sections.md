# Word Detail Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new linguistic detail sections to the word detail page, all computed at build time from existing data — no new WordPress fields, no client-side JS.

**Architecture:** New utility functions in `wordHelper.ts` (one per feature), each consumed by a dedicated Astro component under `src/components/word/`. All components are imported and wired into `src/pages/wort/[...wordSlug].astro`. Compound word decomposition uses `an-array-of-german-words` npm package, imported only in the Astro page script so it never reaches the browser bundle.

**Tech Stack:** Astro (SSG), TypeScript, Vitest, `natural` (Jaro-Winkler, already installed), `an-array-of-german-words` (new), SCSS BEM.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Install | — | `an-array-of-german-words` npm package |
| Modify | `src/utils/wordHelper.ts` | 6 new utility functions |
| Create | `src/tests/unit/utils/decomposeCompoundWord.test.ts` | Tests |
| Create | `src/tests/unit/utils/letterFrequency.test.ts` | Tests |
| Create | `src/tests/unit/utils/wordCuriosities.test.ts` | Tests |
| Create | `src/tests/unit/utils/findAnagrams.test.ts` | Tests |
| Create | `src/tests/unit/utils/alphabeticNeighbors.test.ts` | Tests |
| Modify | `src/styles/components/_single-word.scss` | Letter bar styles |
| Create | `src/components/word/WordLetterFrequency.astro` | Bar chart component |
| Create | `src/components/word/WordCuriosities.astro` | Fun facts component |
| Create | `src/components/word/WordDecomposition.astro` | Compound decomposition |
| Create | `src/components/word/WordSimilarSpelling.astro` | Jaro-Winkler similar words |
| Create | `src/components/word/WordAnagrams.astro` | Anagram finder |
| Create | `src/components/word/WordAlphabetNav.astro` | Alphabetical navigation |
| Modify | `src/pages/wort/[...wordSlug].astro` | Wire all components into page |

---

## Task 1: Install German Wordlist Package

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the package**

```bash
pnpm add an-array-of-german-words
```

- [ ] **Step 2: Verify the import works**

```bash
node -e "const w = require('an-array-of-german-words'); console.log(w.length, w[0], w.includes('bier'))"
```

Expected output: something like `640061 aa true`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add an-array-of-german-words for compound word decomposition"
```

---

## Task 2: `decomposeCompoundWord` Utility

**Files:**
- Modify: `src/utils/wordHelper.ts`
- Create: `src/tests/unit/utils/decomposeCompoundWord.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/utils/decomposeCompoundWord.test.ts`:

```typescript
import { decomposeCompoundWord } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

const dict = new Set(["bier", "pinsel", "hoden", "kobold", "schnauze", "berlin"]);

describe("decomposeCompoundWord", () => {
  it("splits a compound word at the correct boundary", () => {
    expect(decomposeCompoundWord("Bierpinsel", dict)).toEqual(["bier", "pinsel"]);
  });

  it("handles Fugen-s (Hodenkobold → hoden + kobold)", () => {
    // "hodenkobold" splits as hoden + kobold (no fugen-s needed here)
    expect(decomposeCompoundWord("Hodenkobold", dict)).toEqual(["hoden", "kobold"]);
  });

  it("returns null for a word that is itself in the dictionary", () => {
    expect(decomposeCompoundWord("Berlin", dict)).toBeNull();
  });

  it("returns null for words shorter than 5 characters", () => {
    expect(decomposeCompoundWord("Bier", dict)).toBeNull();
  });

  it("returns null when no valid split is found", () => {
    const smallDict = new Set(["abc"]);
    expect(decomposeCompoundWord("Schnauze", smallDict)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(decomposeCompoundWord("BIERPINSEL", dict)).toEqual(["bier", "pinsel"]);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm vitest run src/tests/unit/utils/decomposeCompoundWord.test.ts
```

Expected: FAIL — `decomposeCompoundWord is not a function`

- [ ] **Step 3: Implement the function**

Add to `src/utils/wordHelper.ts`:

```typescript
export const decomposeCompoundWord = (
  word: string,
  germanWords: Set<string>,
): string[] | null => {
  const lower = word.toLowerCase();
  if (lower.length < 5) return null;
  if (germanWords.has(lower)) return null;

  for (let i = 3; i <= lower.length - 3; i++) {
    const left = lower.slice(0, i);
    const right = lower.slice(i);

    if (germanWords.has(left) && germanWords.has(right)) {
      return [left, right];
    }

    // Fugen-s: "tageslicht" → "tages" (tag+s) + "licht"
    if (right.startsWith("s") && right.length >= 3 && germanWords.has(right.slice(1))) {
      if (germanWords.has(left)) return [left, right.slice(1)];
    }
  }

  return null;
};
```

- [ ] **Step 4: Run test to confirm pass**

```bash
pnpm vitest run src/tests/unit/utils/decomposeCompoundWord.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/wordHelper.ts src/tests/unit/utils/decomposeCompoundWord.test.ts
git commit -m "feat(wordHelper): add decomposeCompoundWord utility"
```

---

## Task 3: `letterFrequency` Utility

**Files:**
- Modify: `src/utils/wordHelper.ts`
- Create: `src/tests/unit/utils/letterFrequency.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/utils/letterFrequency.test.ts`:

```typescript
import { letterFrequency } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

describe("letterFrequency", () => {
  it("returns one entry per unique letter in the word", () => {
    const result = letterFrequency("aal");
    // a, l — 'a' appears twice but only one entry
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.char)).toEqual(expect.arrayContaining(["a", "l"]));
  });

  it("marks vowels correctly", () => {
    const result = letterFrequency("Bier");
    const b = result.find((r) => r.char === "b");
    const i = result.find((r) => r.char === "i");
    expect(b?.isVowel).toBe(false);
    expect(i?.isVowel).toBe(true);
  });

  it("assigns a frequency label", () => {
    const result = letterFrequency("e");
    expect(result[0]?.label).toBe("sehr häufig"); // e = 17.40%
  });

  it("assigns 'sehr selten' label for rare letters", () => {
    const result = letterFrequency("x");
    expect(result[0]?.label).toBe("sehr selten"); // x = 0.03%
  });

  it("skips unknown characters (numbers, spaces)", () => {
    const result = letterFrequency("abc 1");
    expect(result.every((r) => r.char !== " " && r.char !== "1")).toBe(true);
  });

  it("returns empty array for empty string", () => {
    expect(letterFrequency("")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm vitest run src/tests/unit/utils/letterFrequency.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement the function**

Add to `src/utils/wordHelper.ts`:

```typescript
const GERMAN_LETTER_FREQ: Record<string, number> = {
  e: 17.40, n: 9.78, i: 7.55, s: 7.27, r: 7.00,
  a: 6.51,  t: 6.15, d: 4.81, h: 4.76, u: 4.35,
  l: 3.44,  c: 3.06, g: 3.01, m: 2.53, o: 2.51,
  b: 1.96,  w: 1.89, f: 1.66, k: 1.21, z: 1.13,
  p: 0.97,  v: 0.67, ü: 0.65, ä: 0.54, ö: 0.30,
  ß: 0.31,  j: 0.27, y: 0.04, x: 0.03, q: 0.02,
};

const frequencyLabel = (pct: number): string => {
  if (pct > 10) return "sehr häufig";
  if (pct > 5)  return "häufig";
  if (pct > 2)  return "gelegentlich";
  if (pct > 1)  return "selten";
  return "sehr selten";
};

export const letterFrequency = (
  word: string,
): Array<{ char: string; percent: number; label: string; isVowel: boolean }> => {
  const seen = new Set<string>();
  return word
    .toLowerCase()
    .split("")
    .filter((c) => {
      if (seen.has(c) || !(c in GERMAN_LETTER_FREQ)) return false;
      seen.add(c);
      return true;
    })
    .map((char) => ({
      char,
      percent: GERMAN_LETTER_FREQ[char]!,
      label: frequencyLabel(GERMAN_LETTER_FREQ[char]!),
      isVowel: "aeiouäöü".includes(char),
    }));
};
```

- [ ] **Step 4: Run test to confirm pass**

```bash
pnpm vitest run src/tests/unit/utils/letterFrequency.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/wordHelper.ts src/tests/unit/utils/letterFrequency.test.ts
git commit -m "feat(wordHelper): add letterFrequency utility"
```

---

## Task 4: `wordCuriosities` Utility

**Files:**
- Modify: `src/utils/wordHelper.ts`
- Create: `src/tests/unit/utils/wordCuriosities.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/utils/wordCuriosities.test.ts`:

```typescript
import { wordCuriosities } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

describe("wordCuriosities", () => {
  it("detects a palindrome", () => {
    expect(wordCuriosities("anna").isPalindrome).toBe(true);
  });

  it("detects a non-palindrome", () => {
    expect(wordCuriosities("Bierpinsel").isPalindrome).toBe(false);
  });

  it("detects when all German vowels are present", () => {
    // needs a, e, i, o, u, ä, ö, ü
    expect(wordCuriosities("aeiouäöü").hasAllVowels).toBe(true);
  });

  it("detects when not all German vowels are present", () => {
    expect(wordCuriosities("Bierpinsel").hasAllVowels).toBe(false);
  });

  it("finds the longest consonant run", () => {
    const result = wordCuriosities("Bierpinsel");
    // "nsl" is the longest consonant run
    expect(result.longestConsonantRun.chars).toBe("nsl");
    expect(result.longestConsonantRun.length).toBe(3);
  });

  it("detects start/end consonant correctly", () => {
    const result = wordCuriosities("Bierpinsel");
    expect(result.startsWithConsonant).toBe(true);  // B
    expect(result.endsWithConsonant).toBe(true);    // l
  });

  it("detects start/end vowel correctly", () => {
    const result = wordCuriosities("aasen");
    expect(result.startsWithConsonant).toBe(false); // a
    expect(result.endsWithConsonant).toBe(false);   // n — wait, n is consonant
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm vitest run src/tests/unit/utils/wordCuriosities.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement the function**

Add to `src/utils/wordHelper.ts`:

```typescript
const VOWELS_SET = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü"]);
const ALL_GERMAN_VOWELS = ["a", "e", "i", "o", "u", "ä", "ö", "ü"];

const isVowelChar = (c: string): boolean => VOWELS_SET.has(c);
const isConsonantChar = (c: string): boolean =>
  /[a-zäöüß]/i.test(c) && !isVowelChar(c);

export const wordCuriosities = (
  word: string,
): {
  isPalindrome: boolean;
  hasAllVowels: boolean;
  longestConsonantRun: { length: number; chars: string };
  startsWithConsonant: boolean;
  endsWithConsonant: boolean;
} => {
  const lower = word.toLowerCase();

  const isPalindrome = lower === lower.split("").reverse().join("");
  const hasAllVowels = ALL_GERMAN_VOWELS.every((v) => lower.includes(v));

  let longestRun = { length: 0, chars: "" };
  let currentRun = "";
  for (const c of lower) {
    if (isConsonantChar(c)) {
      currentRun += c;
      if (currentRun.length > longestRun.length) {
        longestRun = { length: currentRun.length, chars: currentRun };
      }
    } else {
      currentRun = "";
    }
  }

  return {
    isPalindrome,
    hasAllVowels,
    longestConsonantRun: longestRun,
    startsWithConsonant: isConsonantChar(lower[0] ?? ""),
    endsWithConsonant: isConsonantChar(lower[lower.length - 1] ?? ""),
  };
};
```

- [ ] **Step 4: Fix the flawed test case (step 1 has a mistake)**

The last test case in step 1 is wrong — "n" is a consonant. Fix:

```typescript
it("detects start/end vowel correctly", () => {
  const result = wordCuriosities("aasen");
  expect(result.startsWithConsonant).toBe(false); // a = vowel
  expect(result.endsWithConsonant).toBe(true);    // n = consonant
});
```

Edit the test file to replace that last `it` block with the corrected version.

- [ ] **Step 5: Run test to confirm pass**

```bash
pnpm vitest run src/tests/unit/utils/wordCuriosities.test.ts
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/wordHelper.ts src/tests/unit/utils/wordCuriosities.test.ts
git commit -m "feat(wordHelper): add wordCuriosities utility"
```

---

## Task 5: `findAnagrams` Utility

**Files:**
- Modify: `src/utils/wordHelper.ts`
- Create: `src/tests/unit/utils/findAnagrams.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/utils/findAnagrams.test.ts`:

```typescript
import { findAnagrams } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";
import type { BerlinerWord } from "@/gql/entity-types";

const makeWord = (berlinerisch: string, id: string): BerlinerWord =>
  ({
    id,
    slug: berlinerisch.toLowerCase(),
    wordProperties: { berlinerisch },
  }) as unknown as BerlinerWord;

describe("findAnagrams", () => {
  it("finds an anagram in the word list", () => {
    const allWords = [makeWord("Bier", "1"), makeWord("Reib", "2"), makeWord("Pinsel", "3")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(1);
    expect(result[0]?.wordProperties?.berlinerisch).toBe("Reib");
  });

  it("excludes the word itself from results", () => {
    const allWords = [makeWord("Bier", "1"), makeWord("Bier", "2")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no anagrams found", () => {
    const allWords = [makeWord("Pinsel", "1"), makeWord("Schnauze", "2")];
    const result = findAnagrams("Bier", allWords);
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const allWords = [makeWord("REIB", "1")];
    const result = findAnagrams("bier", allWords);
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm vitest run src/tests/unit/utils/findAnagrams.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement the function**

Add to `src/utils/wordHelper.ts`:

```typescript
const sortedChars = (word: string): string =>
  word.toLowerCase().split("").sort().join("");

export const findAnagrams = (
  word: string,
  allWords: BerlinerWord[],
): BerlinerWord[] => {
  const target = sortedChars(word);
  return allWords.filter((w) => {
    const berlinerisch = w.wordProperties?.berlinerisch ?? "";
    return (
      berlinerisch.toLowerCase() !== word.toLowerCase() &&
      sortedChars(berlinerisch) === target
    );
  });
};
```

- [ ] **Step 4: Run test to confirm pass**

```bash
pnpm vitest run src/tests/unit/utils/findAnagrams.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/wordHelper.ts src/tests/unit/utils/findAnagrams.test.ts
git commit -m "feat(wordHelper): add findAnagrams utility"
```

---

## Task 6: `alphabeticNeighbors` Utility

**Files:**
- Modify: `src/utils/wordHelper.ts`
- Create: `src/tests/unit/utils/alphabeticNeighbors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/utils/alphabeticNeighbors.test.ts`:

```typescript
import { alphabeticNeighbors } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";
import type { BerlinerWord } from "@/gql/entity-types";

const makeWord = (berlinerisch: string, id: string): BerlinerWord =>
  ({
    id,
    slug: berlinerisch.toLowerCase(),
    wordProperties: { berlinerisch },
  }) as unknown as BerlinerWord;

describe("alphabeticNeighbors", () => {
  const allWords = [
    makeWord("Anton", "1"),
    makeWord("Berta", "2"),
    makeWord("Caesar", "3"),
    makeWord("Dora", "4"),
    makeWord("Emil", "5"),
  ];

  it("returns correct neighbors for a middle word", () => {
    const current = allWords[2]!; // Caesar
    const { before, after } = alphabeticNeighbors(allWords, current, 2);
    expect(before.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Berta", "Anton"]);
    expect(after.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Dora", "Emil"]);
  });

  it("returns fewer results at the start of the list", () => {
    const current = allWords[0]!; // Anton
    const { before, after } = alphabeticNeighbors(allWords, current, 3);
    expect(before).toHaveLength(0);
    expect(after.map((w) => w.wordProperties?.berlinerisch)).toEqual([
      "Berta",
      "Caesar",
      "Dora",
    ]);
  });

  it("returns fewer results at the end of the list", () => {
    const current = allWords[4]!; // Emil
    const { before, after } = alphabeticNeighbors(allWords, current, 3);
    expect(before.map((w) => w.wordProperties?.berlinerisch)).toEqual([
      "Dora",
      "Caesar",
      "Berta",
    ]);
    expect(after).toHaveLength(0);
  });

  it("returns empty for unknown word", () => {
    const unknown = makeWord("Zorro", "99");
    const { before, after } = alphabeticNeighbors(allWords, unknown, 3);
    expect(before).toHaveLength(0);
    expect(after).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm vitest run src/tests/unit/utils/alphabeticNeighbors.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement the function**

Add to `src/utils/wordHelper.ts`:

```typescript
export const alphabeticNeighbors = (
  allWords: BerlinerWord[],
  currentWord: BerlinerWord,
  n: number = 3,
): { before: BerlinerWord[]; after: BerlinerWord[] } => {
  const sorted = [...allWords].sort((a, b) =>
    (a.wordProperties?.berlinerisch ?? "")
      .toLowerCase()
      .localeCompare((b.wordProperties?.berlinerisch ?? "").toLowerCase(), "de"),
  );

  const idx = sorted.findIndex((w) => w.id === currentWord.id);
  if (idx === -1) return { before: [], after: [] };

  return {
    before: sorted.slice(Math.max(0, idx - n), idx).reverse(),
    after: sorted.slice(idx + 1, idx + 1 + n),
  };
};
```

- [ ] **Step 4: Run test to confirm pass**

```bash
pnpm vitest run src/tests/unit/utils/alphabeticNeighbors.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
pnpm test:unit
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/wordHelper.ts src/tests/unit/utils/alphabeticNeighbors.test.ts
git commit -m "feat(wordHelper): add alphabeticNeighbors utility"
```

---

## Task 7: SCSS — Letter Bar Styles

**Files:**
- Modify: `src/styles/components/_single-word.scss`

- [ ] **Step 1: Add letter bar styles**

In `src/styles/components/_single-word.scss`, inside the `.c-single-word { }` block, add after the `&__consonants-vowels` block:

```scss
&__letter-bar {
  display: flex;
  flex-direction: column;
  gap: vars.$spacer * 0.5;

  &-row {
    display: flex;
    align-items: center;
    gap: vars.$spacer * 0.5;
  }

  &-char {
    width: 1.25rem;
    font-family: monospace;
    font-weight: bold;
    font-size: 1rem;
    flex-shrink: 0;
  }

  &-track {
    flex: 1;
    height: 8px;
    background: rgb(0 0 0 / 20%);
    border-radius: 4px;
    overflow: hidden;
  }

  &-fill {
    height: 100%;
    background: var(--orange-600);
    border-radius: 4px;

    @include butler-mx.dark-mode-class {
      background: var(--orange-300);
    }

    &--vowel {
      background: #435e6b;

      @include butler-mx.dark-mode-class {
        background: #cfc536;
      }
    }
  }

  &-label {
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--blue) 70%, white);
    width: 9rem;
    flex-shrink: 0;

    @include butler-mx.dark-mode-class {
      color: color-mix(in srgb, var(--blue) 30%, white);
    }
  }
}

&__alpha-nav {
  display: flex;
  gap: vars.$spacer * 2;
  flex-wrap: wrap;
}

&__alpha-col {
  flex: 1;
  min-width: 120px;
}

&__alpha-label {
  font-size: 0.8rem;
  color: color-mix(in srgb, var(--blue) 70%, white);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: vars.$spacer * 0.5;

  @include butler-mx.dark-mode-class {
    color: color-mix(in srgb, var(--blue) 30%, white);
  }
}

&__word-parts {
  display: flex;
  align-items: center;
  gap: vars.$spacer * 0.5;
  flex-wrap: wrap;
}

&__word-part {
  font-size: 1.15rem;
  font-weight: bold;
  padding: 3px 12px;
  border: 1px solid var(--grey-100);
  background: transparent;
  border-radius: 2px;
}

&__word-parts-plus {
  color: var(--grey-100);
  font-size: 1.2rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components/_single-word.scss
git commit -m "feat(styles): add letter-bar, alpha-nav, word-parts styles to single-word"
```

---

## Task 8: `WordLetterFrequency.astro` Component

**Files:**
- Create: `src/components/word/WordLetterFrequency.astro`

- [ ] **Step 1: Create the component**

Create `src/components/word/WordLetterFrequency.astro`:

```astro
---
import { letterFrequency } from "@utils/wordHelper";

interface Props {
  word: string;
}

const { word } = Astro.props;
const letters = letterFrequency(word);
const maxPercent = letters.length > 0 ? Math.max(...letters.map((l) => l.percent)) : 1;
---

{
  letters.length > 0 && (
    <div>
      <h3>Buchstabenhäufigkeit</h3>
      <div class="c-single-word__letter-bar">
        {letters.map(({ char, percent, label, isVowel }) => (
          <div class="c-single-word__letter-bar-row">
            <span
              class={`c-single-word__letter-bar-char ${isVowel ? "is-vowel" : "is-consonant"}`}
            >
              {char}
            </span>
            <div class="c-single-word__letter-bar-track">
              <div
                class={`c-single-word__letter-bar-fill${isVowel ? " c-single-word__letter-bar-fill--vowel" : ""}`}
                style={`width: ${((percent / maxPercent) * 100).toFixed(1)}%`}
              />
            </div>
            <span class="c-single-word__letter-bar-label">
              {percent.toFixed(2).replace(".", ",")}% · {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word/WordLetterFrequency.astro
git commit -m "feat(component): add WordLetterFrequency Astro component"
```

---

## Task 9: `WordCuriosities.astro` Component

**Files:**
- Create: `src/components/word/WordCuriosities.astro`

- [ ] **Step 1: Create the component**

Create `src/components/word/WordCuriosities.astro`:

```astro
---
import { wordCuriosities } from "@utils/wordHelper";

interface Props {
  word: string;
}

const { word } = Astro.props;
const facts = word.length >= 5 ? wordCuriosities(word) : null;
---

{
  facts && (
    <div>
      <h3>Wortkuriositäten</h3>
      <ul>
        <li>
          <span class={facts.isPalindrome ? "is-fact-yes" : undefined}>
            {facts.isPalindrome ? "✓ Palindrom" : "✗ Kein Palindrom"}
          </span>
        </li>
        <li>
          {facts.hasAllVowels
            ? "✓ Enthält alle deutschen Vokale"
            : "✗ Enthält nicht alle deutschen Vokale (a, e, i, o, u, ä, ö, ü)"}
        </li>
        {facts.longestConsonantRun.length >= 3 && (
          <li>
            ✓ Längste Konsonantenfolge:{" "}
            <strong>{facts.longestConsonantRun.chars}</strong> (
            {facts.longestConsonantRun.length} Zeichen)
          </li>
        )}
        <li>
          {facts.startsWithConsonant ? "Beginnt mit Konsonant" : "Beginnt mit Vokal"},{" "}
          {facts.endsWithConsonant ? "endet mit Konsonant" : "endet mit Vokal"}
        </li>
      </ul>
    </div>
  )
}

<style>
  .is-fact-yes {
    color: var(--success, #35a672);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word/WordCuriosities.astro
git commit -m "feat(component): add WordCuriosities Astro component"
```

---

## Task 10: `WordDecomposition.astro` Component

**Files:**
- Create: `src/components/word/WordDecomposition.astro`

- [ ] **Step 1: Create the component**

Create `src/components/word/WordDecomposition.astro`:

```astro
---
import { decomposeCompoundWord } from "@utils/wordHelper";
import { routeToWord } from "@utils/helpers";
import type { BerlinerWord } from "@/gql/entity-types";

interface Props {
  word: string;
  allWords: BerlinerWord[];
  germanWords: Set<string>;
}

const { word, allWords, germanWords } = Astro.props;
const parts = word.length >= 5 ? decomposeCompoundWord(word, germanWords) : null;

const wordMap = new Map(
  allWords.map((w) => [w.wordProperties?.berlinerisch?.toLowerCase() ?? "", w]),
);
---

{
  parts && parts.length >= 2 && (
    <div>
      <h3>Wortzerlegung</h3>
      <div class="c-single-word__word-parts">
        {parts.map((part, i) => {
          const linked = wordMap.get(part);
          return (
            <>
              {i > 0 && (
                <span class="c-single-word__word-parts-plus">+</span>
              )}
              {linked ? (
                <a
                  class="c-single-word__word-part"
                  href={routeToWord(linked.slug ?? undefined)}
                >
                  {part}
                </a>
              ) : (
                <span class="c-single-word__word-part">{part}</span>
              )}
            </>
          );
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word/WordDecomposition.astro
git commit -m "feat(component): add WordDecomposition Astro component"
```

---

## Task 11: `WordSimilarSpelling.astro` Component

**Files:**
- Create: `src/components/word/WordSimilarSpelling.astro`

The `similarWords()` function in `wordHelper.ts` already returns `{ isSimilar: number; word: BerlinerWord }[]` — just filter and slice in the component.

- [ ] **Step 1: Create the component**

Create `src/components/word/WordSimilarSpelling.astro`:

```astro
---
import { similarWords } from "@utils/wordHelper";
import { routeToWord } from "@utils/helpers";
import type { BerlinerWord } from "@/gql/entity-types";

interface Props {
  allWords: BerlinerWord[];
  currentWord: BerlinerWord;
}

const { allWords, currentWord } = Astro.props;

const MIN_SCORE = 0.85;
const MAX_RESULTS = 5;

const similar = similarWords(allWords, currentWord)
  .filter((r) => r.isSimilar >= MIN_SCORE)
  .sort((a, b) => b.isSimilar - a.isSimilar)
  .slice(0, MAX_RESULTS);
---

{
  similar.length > 0 && (
    <div>
      <h3>Ähnliche Schreibweise</h3>
      <ul>
        {similar.map((r) => (
          <li>
            <a href={routeToWord(r.word?.slug ?? undefined)}>
              {r.word?.wordProperties?.berlinerisch}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word/WordSimilarSpelling.astro
git commit -m "feat(component): add WordSimilarSpelling Astro component"
```

---

## Task 12: `WordAnagrams.astro` Component

**Files:**
- Create: `src/components/word/WordAnagrams.astro`

- [ ] **Step 1: Create the component**

Create `src/components/word/WordAnagrams.astro`:

```astro
---
import { findAnagrams } from "@utils/wordHelper";
import { routeToWord } from "@utils/helpers";
import type { BerlinerWord } from "@/gql/entity-types";

interface Props {
  word: string;
  allWords: BerlinerWord[];
}

const { word, allWords } = Astro.props;
const anagrams = findAnagrams(word, allWords);
---

{
  anagrams.length > 0 && (
    <section>
      <h2>Buchstabenspiele</h2>
      <div>
        <h3>Anagramme</h3>
        <ul>
          {anagrams.map((w) => (
            <li>
              <a href={routeToWord(w.slug ?? undefined)}>
                {w.wordProperties?.berlinerisch}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word/WordAnagrams.astro
git commit -m "feat(component): add WordAnagrams Astro component"
```

---

## Task 13: `WordAlphabetNav.astro` Component

**Files:**
- Create: `src/components/word/WordAlphabetNav.astro`

- [ ] **Step 1: Create the component**

Create `src/components/word/WordAlphabetNav.astro`:

```astro
---
import { alphabeticNeighbors } from "@utils/wordHelper";
import { routeToWord } from "@utils/helpers";
import type { BerlinerWord } from "@/gql/entity-types";

interface Props {
  allWords: BerlinerWord[];
  currentWord: BerlinerWord;
}

const { allWords, currentWord } = Astro.props;
const { before, after } = alphabeticNeighbors(allWords, currentWord, 3);
---

<section>
  <h2>Alphabetisch blättern</h2>
  <div class="c-single-word__alpha-nav">
    <div class="c-single-word__alpha-col">
      <p class="c-single-word__alpha-label">← Wörter davor</p>
      {
        before.length > 0 ? (
          <ul>
            {before.map((w) => (
              <li>
                <a href={routeToWord(w.slug ?? undefined)}>
                  {w.wordProperties?.berlinerisch}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>—</p>
        )
      }
    </div>
    <div class="c-single-word__alpha-col">
      <p class="c-single-word__alpha-label">Wörter danach →</p>
      {
        after.length > 0 ? (
          <ul>
            {after.map((w) => (
              <li>
                <a href={routeToWord(w.slug ?? undefined)}>
                  {w.wordProperties?.berlinerisch}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>—</p>
        )
      }
    </div>
  </div>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/word/WordAlphabetNav.astro
git commit -m "feat(component): add WordAlphabetNav Astro component"
```

---

## Task 14: Integration in Page Template

**Files:**
- Modify: `src/pages/wort/[...wordSlug].astro`

- [ ] **Step 1: Add imports**

In `src/pages/wort/[...wordSlug].astro`, add to the imports at the top of the frontmatter:

```typescript
import WordDecomposition from "@components/word/WordDecomposition.astro";
import WordLetterFrequency from "@components/word/WordLetterFrequency.astro";
import WordCuriosities from "@components/word/WordCuriosities.astro";
import WordSimilarSpelling from "@components/word/WordSimilarSpelling.astro";
import WordAnagrams from "@components/word/WordAnagrams.astro";
import WordAlphabetNav from "@components/word/WordAlphabetNav.astro";
```

- [ ] **Step 2: Load the German wordlist**

In the frontmatter script, after the existing imports, add:

```typescript
import germanWordsArray from "an-array-of-german-words";
const germanWords = new Set<string>(germanWordsArray as string[]);
```

- [ ] **Step 3: Wire WordDecomposition into the Etymologie section**

Find the closing `</section>` of the Etymologie block (the one containing the `translations` block, around line 197). Add `WordDecomposition` immediately before it:

```astro
<section>
  <h2>Etymologie</h2>
  {/* ...existing alternativeWords and translations blocks... */}
  <WordDecomposition
    word={wordProps?.berlinerisch ?? ""}
    allWords={allWords}
    germanWords={germanWords}
  />
</section>
```

- [ ] **Step 4: Wire WordLetterFrequency and WordCuriosities into Quantitative Linguistik**

Find the closing `</section>` of the Quantitative Linguistik block (contains the `__consonants-vowels` and letter count divs). Add both components before the closing tag:

```astro
<section>
  <h2>Quantitative Linguistik</h2>
  {/* ...existing consonants/vowels and letter count divs... */}
  <WordLetterFrequency word={wordProps?.berlinerisch ?? ""} />
  <WordCuriosities word={wordProps?.berlinerisch ?? ""} />
</section>
```

- [ ] **Step 5: Wire WordSimilarSpelling into the Phonologie section**

Find the Phonologie section (contains `ähnlich klingende Wörter`). Add `WordSimilarSpelling` after the existing similar-sounding words list:

```astro
{
  similarSoundingWords(allWords, word).find((word) => word.isSimilar) && (
    <section>
      <h2>Phonologie</h2>
      <h3>Ähnlich klingende Wörter</h3>
      {/* ...existing SoundEx list... */}
      <WordSimilarSpelling allWords={allWords} currentWord={word} />
    </section>
  )
}
```

Note: If the Phonologie section is currently hidden when no SoundEx matches exist, extract `WordSimilarSpelling` to its own block outside the conditional so it can appear independently:

```astro
{/* After the Phonologie conditional block: */}
<WordSimilarSpelling allWords={allWords} currentWord={word} />
```

- [ ] **Step 6: Add WordAnagrams and WordAlphabetNav**

After the `relatedWords` block and before the gallery section, add:

```astro
<WordAnagrams word={wordProps?.berlinerisch ?? ""} allWords={allWords} />
<WordAlphabetNav allWords={allWords} currentWord={word} />
```

- [ ] **Step 7: Run the full test suite**

```bash
pnpm test:unit
```

Expected: All tests PASS

- [ ] **Step 8: Type-check**

```bash
pnpm typechecking
```

Fix any type errors before continuing.

- [ ] **Step 9: Build to verify no build errors**

```bash
pnpm build
```

Expected: Build succeeds with no errors. Check that the output bundle does not include the German wordlist in client JS (`dist/_astro/` — grep for "hodenkobold" or check bundle sizes).

- [ ] **Step 10: Commit**

```bash
git add src/pages/wort/\[...wordSlug\].astro
git commit -m "feat(page): integrate new word detail section components"
```

---

## Self-Review

**Spec coverage:**
- ✅ `WordDecomposition` — Task 2 (utility) + Task 10 (component) + Task 14 step 3
- ✅ `WordLetterFrequency` — Task 3 (utility) + Task 8 (component) + Task 14 step 4
- ✅ `WordCuriosities` — Task 4 (utility) + Task 9 (component) + Task 14 step 4
- ✅ `WordSimilarSpelling` — Task 11 (component, reuses existing `similarWords()`) + Task 14 step 5
- ✅ `WordAnagrams` — Task 5 (utility) + Task 12 (component) + Task 14 step 6
- ✅ `WordAlphabetNav` — Task 6 (utility) + Task 13 (component) + Task 14 step 6
- ✅ German wordlist — Task 1 (install) + Task 14 step 2
- ✅ SCSS — Task 7
- ✅ No client JS — enforced by Astro SSG + build check in Task 14 step 9

**Type consistency:** `BerlinerWord` used consistently across all tasks. `Set<string>` for `germanWords` matches between Task 2 signature and Task 14 step 2. `routeToWord(slug: string | undefined)` signature matches usage in all components.

**No placeholders:** All code blocks contain complete implementations.
