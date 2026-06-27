# Game Share Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After game over in "Berliner oder nicht?", generate a shareable URL that encodes results in the URL itself — no server storage required — and displays them to anyone who opens it.

**Architecture:** Encode result payload as base64url JSON prepended with a `crypto.randomUUID()` token in the URL hash (e.g. `/games/berliner-oder-nicht/share#<uuid>.<b64>`). The share page decodes the hash client-side and renders the results. The UUID makes the URL unguessable even if someone knows the score. All data is self-contained — no backend, no KV, no Workers needed.

**Tech Stack:** Astro 5 SSG, Vue 3 `<script setup>`, `client:only="vue"`, VueUse `useShare`, `crypto.randomUUID()` (built-in browser API), `btoa`/`atob` with URL-safe encoding.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/utils/gameShare.ts` | encode/decode share payload; generate share URL |
| Create | `src/pages/games/berliner-oder-nicht/share.astro` | Astro wrapper for the share display page |
| Create | `src/components/games/GameShareView.vue` | Vue component that decodes hash and shows results |
| Modify | `src/components/games/GameResult.vue` | replace hardcoded URL in `useShare` with generated share URL |

---

### Task 1: URL encode/decode utility

**Files:**
- Create: `src/utils/gameShare.ts`

**Payload shape:**
```ts
export interface SharePayload {
  score: number
  bestStreak: number
  totalAnswered: number
  correctAnswers: number
  date: string // ISO 8601
}
```

**Encoding strategy:** `<uuid>.<base64url(JSON)>`
- UUID prefix makes URL unguessable even with known score
- base64url avoids `+/=` which break URL fragments without encoding

- [ ] **Step 1: Write failing tests**

Create `src/tests/unit/utils/gameShare.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decodeShareHash, encodeShareHash } from '@utils/gameShare'
import type { SharePayload } from '@utils/gameShare'

const payload: SharePayload = {
  score: 150,
  bestStreak: 7,
  totalAnswered: 18,
  correctAnswers: 14,
  date: '2026-06-11T00:00:00.000Z',
}

describe('encodeShareHash', () => {
  it('returns a non-empty string', () => {
    expect(encodeShareHash(payload)).toBeTruthy()
  })

  it('contains a UUID prefix (8-4-4-4-12 hex)', () => {
    const hash = encodeShareHash(payload)
    const [uuid] = hash.split('.')
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('two calls produce different UUIDs', () => {
    expect(encodeShareHash(payload)).not.toBe(encodeShareHash(payload))
  })
})

describe('decodeShareHash', () => {
  it('round-trips payload', () => {
    const hash = encodeShareHash(payload)
    expect(decodeShareHash(hash)).toEqual(payload)
  })

  it('returns null for empty string', () => {
    expect(decodeShareHash('')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(decodeShareHash('notvalid')).toBeNull()
  })

  it('returns null for base64 that decodes to non-JSON', () => {
    expect(decodeShareHash('uuid.bm90anNvbg==')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/tests/unit/utils/gameShare.test.ts
```
Expected: `Cannot find module '@utils/gameShare'`

- [ ] **Step 3: Implement `src/utils/gameShare.ts`**

```ts
export interface SharePayload {
  score: number
  bestStreak: number
  totalAnswered: number
  correctAnswers: number
  date: string
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length + 2) % 4 || 4)
  return atob(padded)
}

export function encodeShareHash(payload: SharePayload): string {
  const uuid = crypto.randomUUID()
  const b64 = toBase64Url(JSON.stringify(payload))
  return `${uuid}.${b64}`
}

export function decodeShareHash(hash: string): SharePayload | null {
  const dotIndex = hash.indexOf('.')
  if (dotIndex === -1) return null
  const b64 = hash.slice(dotIndex + 1)
  if (!b64) return null
  try {
    return JSON.parse(fromBase64Url(b64)) as SharePayload
  } catch {
    return null
  }
}

export function buildShareUrl(payload: SharePayload): string {
  return `/games/berliner-oder-nicht/share#${encodeShareHash(payload)}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/tests/unit/utils/gameShare.test.ts
```
Expected: all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/gameShare.ts src/tests/unit/utils/gameShare.test.ts
git commit -m "feat(game): add share URL encode/decode utility"
```

---

### Task 2: Share page — Astro wrapper + Vue decode component

**Files:**
- Create: `src/pages/games/berliner-oder-nicht/share.astro`
- Create: `src/components/games/GameShareView.vue`

The Astro page is a thin wrapper with `client:only="vue"`. The Vue component reads `window.location.hash`, decodes it, and renders the result — or shows an error state if the hash is missing/invalid.

- [ ] **Step 1: Create `src/pages/games/berliner-oder-nicht/share.astro`**

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro'
import GameShareView from '@components/games/GameShareView.vue'
---

<BaseLayout title="Spielergebnis — Berliner oder nicht?">
  <GameShareView client:only="vue" />
</BaseLayout>
```

> Check what the existing `berliner-oder-nicht.astro` imports for `BaseLayout` — use the same layout path.

- [ ] **Step 2: Verify the layout path**

```bash
head -5 src/pages/games/berliner-oder-nicht.astro
```

Use the exact same `---` import block pattern (same layout, same title convention).

- [ ] **Step 3: Create `src/components/games/GameShareView.vue`**

```vue
<template>
  <div class="c-game-share-view">
    <template v-if="payload">
      <p class="c-game-share-view__title">Spielergebnis</p>

      <div class="c-game-share-view__stats">
        <div class="c-game-share-view__stat">
          <span class="c-game-share-view__stat-value">{{ payload.score }}</span>
          <span class="c-game-share-view__stat-label">Score</span>
        </div>
        <div class="c-game-share-view__stat">
          <span class="c-game-share-view__stat-value">{{ payload.bestStreak }}</span>
          <span class="c-game-share-view__stat-label">Best Streak</span>
        </div>
        <div class="c-game-share-view__stat">
          <span class="c-game-share-view__stat-value">{{ accuracyPercent }}%</span>
          <span class="c-game-share-view__stat-label">Genauigkeit</span>
        </div>
        <div class="c-game-share-view__stat">
          <span class="c-game-share-view__stat-value">{{ payload.totalAnswered }}</span>
          <span class="c-game-share-view__stat-label">Antworten</span>
        </div>
      </div>

      <p class="c-game-share-view__date">{{ formattedDate }}</p>

      <a href="/games/berliner-oder-nicht" class="c-game-share-view__cta">
        Selbst spielen →
      </a>
    </template>

    <template v-else>
      <p class="c-game-share-view__error">Kein gültiges Ergebnis gefunden.</p>
      <a href="/games/berliner-oder-nicht" class="c-game-share-view__cta">
        Zum Spiel →
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { decodeShareHash } from '@utils/gameShare'
import type { SharePayload } from '@utils/gameShare'

const payload = ref<SharePayload | null>(null)

onMounted(() => {
  const hash = window.location.hash.slice(1) // strip leading #
  payload.value = decodeShareHash(hash)
})

const accuracyPercent = computed(() =>
  payload.value && payload.value.totalAnswered > 0
    ? Math.round((payload.value.correctAnswers / payload.value.totalAnswered) * 100)
    : 0,
)

const formattedDate = computed(() => {
  if (!payload.value?.date) return ''
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(
    new Date(payload.value.date),
  )
})
</script>

<style lang="scss">
@use '@styles/components/game-share-view';
</style>
```

- [ ] **Step 4: Create `src/styles/components/_game-share-view.scss`**

```scss
@use "@styles/variables" as vars;
@use "@sass-butler/mixins" as butler-mx;

.c-game-share-view {
  --c-gsv-surface: #fff;
  --c-gsv-border: rgb(0 0 0 / 12%);
  --c-gsv-text-muted: #999;

  @include butler-mx.dark-mode-class {
    --c-gsv-surface: var(--new-blue-400);
    --c-gsv-border: rgb(255 255 255 / 12%);
    --c-gsv-text-muted: rgb(255 255 255 / 45%);
  }

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem 1rem;
  max-width: 420px;
  margin: 0 auto;
  text-align: center;

  &__title {
    font-size: 1.75rem;
    font-weight: 900;
  }

  &__stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    width: 100%;
  }

  &__stat {
    background: var(--c-gsv-surface);
    border: 1px solid var(--c-gsv-border);
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
  }

  &__stat-value {
    display: block;
    font-size: 1.375rem;
    font-weight: 900;
    line-height: 1.2;
  }

  &__stat-label {
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-gsv-text-muted);
  }

  &__date {
    font-size: 0.875rem;
    color: var(--c-gsv-text-muted);
  }

  &__error {
    color: var(--c-gsv-text-muted);
    font-size: 1rem;
  }

  &__cta {
    display: inline-block;
    padding: 0.875rem 2.5rem;
    background: var(--accent);
    color: #111;
    font-weight: 700;
    font-size: 1.125rem;
    border-radius: 50px;
    text-decoration: none;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.88;
    }
  }
}
```

- [ ] **Step 5: Run lint check**

```bash
pnpm lint
```

Fix any issues before committing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/games/berliner-oder-nicht/share.astro \
        src/components/games/GameShareView.vue \
        src/styles/components/_game-share-view.scss
git commit -m "feat(game): add share results page /games/berliner-oder-nicht/share"
```

---

### Task 3: Wire share URL into GameResult.vue

**Files:**
- Modify: `src/components/games/GameResult.vue`

Currently `share()` sends `url: 'https://berliner-schnauze.de/games/berliner-oder-nicht'` — replace with the generated share URL. Add `date` (today's ISO string) to the payload.

GameResult already receives all needed props: `score`, `bestStreak`, `totalAnswered`, `correctAnswers`.

- [ ] **Step 1: Update `GameResult.vue`**

In `<script setup>`, import `buildShareUrl` and update `share()`:

```ts
import { buildShareUrl } from '@utils/gameShare'
```

Replace the `share()` function body:

```ts
function share() {
  const url = buildShareUrl({
    score: props.score,
    bestStreak: props.bestStreak,
    totalAnswered: props.totalAnswered,
    correctAnswers: props.correctAnswers,
    date: new Date().toISOString(),
  })
  _share({
    text: `Ich hab ${props.score} Punkte bei „Berliner oder nicht?" 🐻`,
    title: 'Berliner oder nicht?',
    url: `https://berliner-schnauze.de${url}`,
  })
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

- [ ] **Step 3: Run unit tests**

```bash
pnpm test:unit
```

All existing tests must still pass (GameResult has no unit tests currently, but gameShare tests from Task 1 run).

- [ ] **Step 4: Commit**

```bash
git add src/components/games/GameResult.vue
git commit -m "feat(game): share generated results URL after game over"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Play a game to completion**

Navigate to `http://localhost:4321/games/berliner-oder-nicht`, play until game over.

- [ ] **Step 3: Tap "Teilen"**

On a desktop browser without native share sheet, `useShare` falls back gracefully (check `canShare` computed — if `false`, button is hidden). On mobile or Chrome 89+, the native share sheet appears with the generated URL.

To test the URL directly without share sheet: open DevTools console, run:

```js
// copy from GameResult.vue logic
import('/src/utils/gameShare.ts').then(m => {
  const url = m.buildShareUrl({ score: 120, bestStreak: 5, totalAnswered: 14, correctAnswers: 11, date: new Date().toISOString() })
  console.log(url)
})
```

Or: manually build a test URL by running `buildShareUrl` in the Vitest REPL.

- [ ] **Step 4: Open share URL in browser**

Navigate to `http://localhost:4321/games/berliner-oder-nicht/share#<generated-hash>`. Should render the 4 stat tiles + formatted date + "Selbst spielen →" link.

- [ ] **Step 5: Test invalid hash**

Navigate to `http://localhost:4321/games/berliner-oder-nicht/share#garbage`. Should show "Kein gültiges Ergebnis gefunden." and the CTA link.

- [ ] **Step 6: Test dark mode**

Toggle dark mode, verify stat tiles and muted text render correctly.
