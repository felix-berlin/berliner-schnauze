# Single Word Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `src/pages/wort/[...wordSlug].astro` with editorial visual direction, sticky sidebar navigation, section-card hierarchy, and modern CSS (container queries, logical properties, clamp).

**Architecture:** Create three new SCSS component files, rewrite the layout section of `_single-word.scss`, update `WordAnagrams.astro` to use section-card BEM, and fully restructure the Astro page template. No new data fetching, no Vue component changes.

**Tech Stack:** Astro SSG, SCSS (`@use`, `@sass-butler/mixins`), CSS container queries, BEM with `c-` prefix, `position: sticky`.

---

## File Structure

| Action | File |
|---|---|
| Create | `src/styles/components/_word-sidebar.scss` |
| Create | `src/styles/components/_word-hero.scss` |
| Create | `src/styles/components/_section-card.scss` |
| Modify | `src/styles/components/_single-word.scss` |
| Modify | `src/components/word/WordAnagrams.astro` |
| Modify | `src/pages/wort/[...wordSlug].astro` |

---

## Task 1: Create `_word-sidebar.scss`

**Files:**
- Create: `src/styles/components/_word-sidebar.scss`

The sidebar is a **single element** that switches between vertical (desktop) and horizontal scroll nav (mobile) via `@container word-page`. `.c-word-page` is the container (established in Task 4). `position: sticky` works in both modes: mobile sticks at `top: var(--topbar-height)` as a horizontal bar; desktop sticks in its grid column. Active link class `.is-active` is toggled by IntersectionObserver added in Task 6.

- [ ] **Step 1: Create the file**

Create `src/styles/components/_word-sidebar.scss`:

```scss
@use "@styles/variables" as vars;
@use "@sass-butler/mixins" as butler-mx;

.c-word-sidebar {
  display: flex;
  flex-direction: column;
  background-color: var(--new-blue-400);
  border-radius: 4px;
  overflow: hidden;
  position: sticky;
  top: var(--topbar-height, 52px);
  z-index: 10;

  @include butler-mx.dark-mode-class {
    background-color: color-mix(in srgb, var(--new-blue-400) 85%, black);
  }

  @container word-page (inline-size >= 48rem) {
    position: sticky;
    top: calc(var(--topbar-height, 52px) + vars.$spacer);
    align-self: start;
    overflow: visible;
    z-index: auto;
    border-radius: 4px;
  }

  @container word-page (inline-size < 48rem) {
    flex-direction: row;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
    border-radius: 0;

    .c-word-sidebar__word,
    .c-word-sidebar__group-label,
    .c-word-sidebar__divider {
      display: none;
    }

    .c-word-sidebar__nav {
      flex-direction: row;
      padding-block: 0;
    }
  }

  &::-webkit-scrollbar {
    display: none;
  }

  &__word {
    padding-inline: vars.$spacer * 0.75;
    padding-block: vars.$spacer * 0.75;
    border-block-end: 1px dashed color-mix(in srgb, var(--orange-300) 40%, transparent);
  }

  &__word-title {
    font-family: vars.$berlin;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--orange-300);
    margin: 0;
    line-height: 1.1;
  }

  &__word-subtitle {
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--orange-200) 70%, transparent);
    margin: 0;
    margin-block-start: 0.2rem;
  }

  &__group-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--orange-200) 60%, transparent);
    padding-inline: vars.$spacer * 0.75;
    margin-block: vars.$spacer * 0.5 0.2rem;
  }

  &__divider {
    height: 1px;
    background: color-mix(in srgb, var(--orange-300) 20%, transparent);
    margin-inline: vars.$spacer * 0.75;
    margin-block: vars.$spacer * 0.25;
  }

  &__nav {
    display: flex;
    flex-direction: column;
    padding-block: vars.$spacer * 0.5;
  }

  &__link {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--orange-100) 80%, transparent);
    padding-block: 0.35rem;
    padding-inline: vars.$spacer * 0.75;
    border-inline-start: 3px solid transparent;
    text-decoration: none;

    @container word-page (inline-size < 48rem) {
      padding-block: 0.75rem;
      border-inline-start: none;
      border-block-end: 2px solid transparent;
      white-space: nowrap;
    }

    @include butler-mx.hover {
      color: var(--orange-200);
      background-color: color-mix(in srgb, var(--orange-600) 15%, transparent);
    }

    &.is-active {
      color: var(--orange-200);
      background-color: color-mix(in srgb, var(--orange-600) 20%, transparent);
      border-inline-start-color: var(--orange-600);

      @container word-page (inline-size < 48rem) {
        border-inline-start-color: transparent;
        border-block-end-color: var(--orange-600);
      }
    }
  }
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/_word-sidebar.scss
git commit -m "feat(styles): add word sidebar component styles"
```

---

## Task 2: Create `_word-hero.scss`

**Files:**
- Create: `src/styles/components/_word-hero.scss`

Replaces `<header class="c-single-word__header">`. Uses `clamp()` with `cqi` units (container query inline) for fluid title sizing. The `word-hero` container enables badge-wrap threshold at `32rem`.

- [ ] **Step 1: Create the file**

Create `src/styles/components/_word-hero.scss`:

```scss
@use "@styles/variables" as vars;
@use "@sass-butler/mixins" as butler-mx;

.c-word-hero {
  container-type: inline-size;
  container-name: word-hero;

  background-color: var(--color-background, color-mix(in srgb, var(--orange-100) 30%, white));
  border: 1px dashed var(--grey-100);
  border-radius: 4px;
  padding: vars.$spacer * 1.25 vars.$spacer * 1.5;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: vars.$spacer;
  box-shadow:
    0 0.5px 0.6px rgb(0 0 0 / 8%),
    0 4px 5px rgb(0 0 0 / 16%);

  @include butler-mx.dark-mode-class {
    --color-background: var(--new-blue-400);
  }

  &__left {
    display: flex;
    flex-direction: column;
    gap: vars.$spacer * 0.5;
    flex: 1;
    min-width: 200px;
  }

  &__right {
    display: flex;
    align-items: flex-start;
    gap: vars.$spacer * 0.5;
    flex-shrink: 0;
  }

  &__title {
    font-family: vars.$berlin;
    font-size: clamp(2rem, 5cqi, 3.75rem);
    font-weight: 700;
    color: var(--new-blue-400);
    margin: 0;
    line-height: 1.1;
    text-decoration: underline;
    text-decoration-style: dashed;
    text-decoration-color: var(--orange-300);
    text-decoration-thickness: from-font;
    text-underline-position: from-font;

    @include butler-mx.dark-mode-class {
      color: var(--orange-300);
    }
  }

  &__word-article {
    font-weight: 400;
    color: var(--grey-100);
    font-size: clamp(1.2rem, 3cqi, 2.25rem);

    @include butler-mx.dark-mode-class {
      color: color-mix(in srgb, var(--orange-200) 70%, transparent);
    }
  }

  &__badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: vars.$spacer * 0.5;

    @container word-hero (inline-size >= 32rem) {
      flex-wrap: nowrap;
    }
  }

  &__wortart-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--orange-200) 60%, white);
    border: 1px solid var(--orange-300);
    color: var(--new-blue-400);

    @include butler-mx.dark-mode-class {
      background: color-mix(in srgb, var(--new-blue-400) 80%, black);
      color: var(--orange-200);
      border-color: var(--orange-600);
    }
  }
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/_word-hero.scss
git commit -m "feat(styles): add word hero card component styles"
```

---

## Task 3: Create `_section-card.scss`

**Files:**
- Create: `src/styles/components/_section-card.scss`

Each content section becomes a `.c-section-card`. `scroll-margin-top` clears the sticky topbar on anchor navigation. Includes subclasses for the infotext block, stat boxes (Linguistik), CV legend, and grammar tags.

- [ ] **Step 1: Create the file**

Create `src/styles/components/_section-card.scss`:

```scss
@use "@styles/variables" as vars;
@use "@sass-butler/mixins" as butler-mx;

.c-section-card {
  background: white;
  border: 1px dashed var(--grey-100);
  border-radius: 4px;
  box-shadow:
    0 0.5px 0.6px rgb(0 0 0 / 8%),
    0 4px 5px rgb(0 0 0 / 16%);
  scroll-margin-top: calc(var(--topbar-height, 52px) + 1rem);

  @include butler-mx.dark-mode-class {
    background: var(--new-blue-400);
  }

  &__header {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    padding-inline: 1.25rem;
    padding-block: 0.75rem;
    border-block-end: 1px dashed var(--orange-200);
  }

  &__num {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--orange-300);
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  &__title {
    font-family: vars.$berlin;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--new-blue-400);
    margin: 0;

    @include butler-mx.dark-mode-class {
      color: var(--orange-300);
    }
  }

  &__body {
    padding-inline: 1.25rem;
    padding-block: 1rem;

    * {
      overflow-wrap: break-word;
    }

    :where(p, a, li) {
      font-size: 1.15rem;
    }

    :where(li) {
      line-height: 1.5;
    }

    h3 {
      font-family: vars.$berlin;
      font-size: 1rem;
      font-weight: 700;
      margin-block: 1.25em 0.75em;
      color: var(--new-blue-400);

      @include butler-mx.dark-mode-class {
        color: var(--orange-300);
      }
    }
  }

  &__infotext {
    border-inline-start: 3px solid var(--orange-300);
    background: color-mix(in srgb, var(--orange-100) 60%, white);
    padding: 0.75rem 1rem;
    margin-block-end: vars.$spacer;
    border-radius: 0 4px 4px 0;

    @include butler-mx.dark-mode-class {
      background: color-mix(in srgb, var(--new-blue-400) 80%, black);
    }
  }

  &__stat-row {
    display: flex;
    gap: vars.$spacer * 0.75;
    flex-wrap: wrap;
    margin-block-end: vars.$spacer;
  }

  &__stat-box {
    background: color-mix(in srgb, var(--orange-600) 10%, white);
    border: 1px dashed var(--orange-200);
    border-radius: 4px;
    padding: 0.625rem 0.875rem;
    flex: 1;
    min-width: 80px;

    @include butler-mx.dark-mode-class {
      background: color-mix(in srgb, var(--new-blue-400) 80%, black);
    }
  }

  &__stat-label {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--blue) 70%, white);

    @include butler-mx.dark-mode-class {
      color: color-mix(in srgb, var(--blue) 30%, white);
    }
  }

  &__stat-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--new-blue-400);

    @include butler-mx.dark-mode-class {
      color: var(--orange-300);
    }

    &--vowels {
      color: #435e6b;

      @include butler-mx.dark-mode-class {
        color: #cfc536;
      }
    }

    &--consonants {
      color: var(--orange-600);

      @include butler-mx.dark-mode-class {
        color: var(--orange-300);
      }
    }
  }

  &__cv-legend {
    display: flex;
    gap: vars.$spacer;
    margin-block-start: 0.5rem;
    font-size: 0.8rem;
  }

  &__cv-legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;

    &::before {
      content: "●";
      font-size: 0.6rem;
    }

    &--vowel {
      color: #435e6b;

      @include butler-mx.dark-mode-class {
        color: #cfc536;
      }
    }

    &--consonant {
      color: var(--orange-600);

      @include butler-mx.dark-mode-class {
        color: var(--orange-300);
      }
    }
  }

  &__grammar-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--blue) 70%, white);
    margin-block-end: vars.$spacer * 0.75;

    @include butler-mx.dark-mode-class {
      color: color-mix(in srgb, var(--blue) 30%, white);
    }
  }

  &__grammar-entry {
    margin-block-end: 0.875rem;
  }

  &__grammar-word {
    font-weight: 700;
    font-size: 1.1rem;
    padding-block-end: 0.25rem;
    border-block-end: 1px dashed var(--orange-200);
    margin-block-end: 0.5rem;
  }

  &__grammar-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem vars.$spacer * 0.5;
  }

  &__grammar-tag {
    background: color-mix(in srgb, var(--orange-100) 80%, white);
    border: 1px solid var(--orange-200);
    border-radius: 4px;
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;

    @include butler-mx.dark-mode-class {
      background: color-mix(in srgb, var(--new-blue-400) 70%, black);
      border-color: var(--orange-600);
    }
  }
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/_section-card.scss
git commit -m "feat(styles): add section card component styles"
```

---

## Task 4: Rewrite `_single-word.scss`

**Files:**
- Modify: `src/styles/components/_single-word.scss`

**What changes:**
- **Add** at top: `--topbar-height: 52px` on `:root`, plus `.c-page-topbar`, `.c-word-page`, `.c-word-main`, `.c-word-gallery-col` layout rules
- **Remove** from `.c-single-word` root: `display: grid`, `gap`, `grid-template-areas`, `grid-template-columns`, `background-color`, `border`, `box-shadow`, `padding`
- **Remove**: `.c-single-word:has(.c-single-word__gallery-wrap)` block
- **Remove**: `&__header`, `&__main`, `&__crown` blocks (now in hero)
- **Remove**: `&__word`, `&__word-article` (now in `_word-hero.scss`)
- **Remove**: `&__gallery-wrap` (replaced by `.c-word-gallery-col`)
- **Remove**: `.c-options-dropdown { margin-left: auto; }` inside `.c-single-word`
- **Remove**: `grid-area: learn-more` and `grid-area: footer` properties
- **Move**: `.c-image-gallery` styles from inside `.c-single-word` to inside `.c-word-gallery-col`
- **Keep**: all other `__*` element styles (used by child components without change)

**Container query note:** `.c-word-main--with-gallery` uses `@container word-page (inline-size >= 60rem)` — not `word-main` — because a container cannot query its own inline size. `60rem` accounts for: 200px sidebar + 2rem gap + content area + 280px gallery.

- [ ] **Step 1: Overwrite the file with the new version**

Write `src/styles/components/_single-word.scss`:

```scss
@use "@styles/variables" as vars;
@use "@styles/mixins" as mx;
@use "@sass-butler/mixins" as butler-mx;
@use "@sass-butler/functions" as butler-fn;

// ── Global token ──────────────────────────────────────────────────────────────

:root {
  --topbar-height: 52px;
}

// ── Page layout containers ────────────────────────────────────────────────────

.c-page-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: white;
  border-block-end: 1px dashed var(--grey-100);
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
  padding-inline: vars.$spacer * 1.5;
  padding-block: vars.$spacer * 0.75;
  display: flex;
  align-items: center;

  @include butler-mx.dark-mode-class {
    background: var(--new-blue-400);
    border-block-end-color: color-mix(in srgb, var(--orange-300) 30%, transparent);
  }
}

.c-word-page {
  container-type: inline-size;
  container-name: word-page;
  display: flex;
  flex-direction: column;
  gap: vars.$spacer;

  @container word-page (inline-size >= 48rem) {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 2rem;
    align-items: start;
  }
}

.c-word-main {
  container-type: inline-size;
  container-name: word-main;
  display: flex;
  flex-direction: column;
  gap: vars.$spacer;

  &__content {
    display: flex;
    flex-direction: column;
    gap: vars.$spacer;
  }

  // Gallery layout uses word-page container (self-query of word-main is not possible).
  // 60rem = ~200px sidebar + 2rem gap + 1fr content + 280px gallery column.
  &--with-gallery {
    @container word-page (inline-size >= 60rem) {
      display: grid;
      grid-template-columns: 1fr 280px;
      grid-template-areas:
        "hero hero"
        "content gallery";
      gap: vars.$spacer;
      align-items: start;

      .c-word-hero { grid-area: hero; }
      .c-word-main__content { grid-area: content; }
    }
  }
}

.c-word-gallery-col {
  grid-area: gallery;
  position: sticky;
  top: calc(var(--topbar-height, 52px) + vars.$spacer);
  align-self: start;

  &__label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: color-mix(in srgb, var(--blue) 70%, white);
    padding-block-end: 0.5rem;
    border-block-end: 1px dashed var(--orange-200);
    margin-block-end: vars.$spacer * 0.75;

    @include butler-mx.dark-mode-class {
      color: color-mix(in srgb, var(--blue) 30%, white);
    }
  }

  .c-image-gallery {
    display: grid;
    gap: vars.$spacer * 1.5;

    @include mx.breakpoint("xxs") {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .c-image-gallery__item {
      margin: 0;
      padding: var(--spacing-inner, 10px);
      background: #fff;
      width: fit-content;
      box-shadow: 0 3px 3px
        color-mix(in srgb, var(--color-box-shadow, var(--orange-900)) 16%, transparent);
      height: fit-content;

      @include butler-mx.dark-mode-class {
        --color-border: var(--new-blue-200);
      }
    }

    .c-image-gallery__link {
      cursor: zoom-in;
    }

    .c-image-gallery__caption {
      color: var(--blue-400);
      margin-top: 0.5rem;
      font-size: 0.8rem;
    }
  }
}

// ── Preserved element styles (used by child components) ───────────────────────

.c-single-word {
  --size-quote-icon: 32px;

  * {
    overflow-wrap: break-word;
  }

  h2 {
    margin: var(--spacing-outer, 0 0 vars.$spacer * 0.25 0);
    font-size: 2rem;
  }

  h3 {
    font-size: 1.5rem;
  }

  h4 {
    font-size: 1.25rem;
  }

  h3,
  h4,
  h5,
  h6 {
    font-family: vars.$berlin;
    font-weight: 700;
    margin-block: 1.5em 1em;
  }

  :where(p, a, li) {
    font-size: 1.15rem;
  }

  :where(li) {
    line-height: 1.5;
  }

  &__syllables {
    .is-divider {
      font-weight: 700;
    }
  }

  &__word-type-wrapper {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;

    .c-single-word__sub-headline {
      --spacing-outer: 0;
    }
  }

  &__word-type {
    font-size: 1.5rem;
    margin: 0;
  }

  &__consonants-vowels {
    &-word {
      letter-spacing: 3px;
    }

    .is-consonant {
      color: var(--orange-600);

      @include butler-mx.dark-mode-class {
        color: var(--orange-300);
      }
    }

    .is-vowel {
      color: #435e6b;

      @include butler-mx.dark-mode-class {
        color: #cfc536;
      }
    }
  }

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
    border-radius: 2px;
  }

  &__word-parts-plus {
    color: var(--grey-100);
    font-size: 1.2rem;
  }

  &__translation {
    display: flex;
    flex-direction: column;
    row-gap: vars.$spacer * 1;
  }

  &__quote-icon {
    width: var(--size-quote-icon);
    height: var(--size-quote-icon);
    fill: var(--grey-200);
    flex: 0 0 auto;

    @include mx.breakpoint("md") {
      --size-quote-icon: 48px;
    }
  }

  &__examples {
    padding-left: vars.$spacer;
    display: flex;
    flex-direction: column;
    row-gap: vars.$spacer;

    @include mx.breakpoint("md") {
      --size-font: 1.8rem;
    }

    &-item {
      font-style: italic;
    }
  }

  &__examples,
  &__example {
    font-size: var(--size-font, 1.7rem);
    flex-basis: 100%;
    margin: calc(var(--size-quote-icon) + #{vars.$spacer * 0.5}) 0 0 0;
    overflow-wrap: break-word;

    &-explanation {
      font-size: 1rem;
      margin-top: vars.$spacer * 0.5;
    }
  }

  &__example {
    font-style: italic;

    @include mx.breakpoint("md") {
      --size-font: 2.2rem;
    }

    &-wrapper {
      --padding-y: #{vars.$spacer};
      --padding-x: 0;

      display: flex;
      padding: var(--padding-y) var(--padding-x);
      gap: var(--gap, #{vars.$spacer * 0.5});

      @include mx.breakpoint("sm") {
        --gap: #{vars.$spacer};
        --padding-y: #{vars.$spacer * 1.5};
        --padding-x: 5%;
      }
      @include mx.breakpoint("md") {
        --padding-y: #{vars.$spacer * 2.5};
        --padding-x: 7%;
      }
    }
  }

  &__learn-more {
    &-link {
      display: flex;
      gap: vars.$spacer * 0.2;
      font-size: var(--size-font, 0.9rem);
      margin-top: 2.5rem;

      @include butler-mx.hover {
        --decoration-text: underline dashed;
      }
      @include mx.breakpoint("xxs") {
        --size-font: 1rem;
      }

      &-icon {
        display: inline-flex;
      }
    }
  }

  &__related-words-list {
    display: flex;
    flex-wrap: wrap;
    gap: vars.$spacer * 0.5 vars.$spacer * 2;
  }

  &__footer {
    display: flex;
    flex-direction: var(--direction-flex, column);
    gap: var(--spacing, #{vars.$spacer * 0.5});
    border-top: 1px dashed var(--new-blue-200);
    padding-top: vars.$spacer * 1.5;

    @include mx.breakpoint("xs") {
      --spacing: #{vars.$spacer * 2};
      --direction-flex: row;
      justify-content: flex-end;
    }
  }

  &__created,
  &__modified {
    margin: 0;
    font-size: 0.8rem;
    color: color-mix(in srgb, var(--blue) 70%, white);

    @include butler-mx.dark-mode-class {
      color: color-mix(in srgb, var(--blue) 30%, white);
    }
  }
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/_single-word.scss
git commit -m "refactor(styles): restructure single-word scss — add layout containers, remove superseded grid rules"
```

---

## Task 5: Update `WordAnagrams.astro` to use section-card BEM

**Files:**
- Modify: `src/components/word/WordAnagrams.astro`

The anagrams section must use `.c-section-card` classes when anagrams exist. `id="anagramme"` enables sidebar anchor navigation. The section number is `—` (non-sequential, only appears conditionally).

- [ ] **Step 1: Overwrite the file**

Write `src/components/word/WordAnagrams.astro`:

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
    <section class="c-section-card" id="anagramme">
      <div class="c-section-card__header">
        <span class="c-section-card__num">—</span>
        <h2 class="c-section-card__title">Buchstabenspiele</h2>
      </div>
      <div class="c-section-card__body">
        <h3>Anagramme</h3>
        <ul class="c-single-word__related-words-list">
          {anagrams.map((w) => (
            <li>
              <a href={routeToWord(w.slug ?? undefined)}>{w.wordProperties?.berlinerisch}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/word/WordAnagrams.astro
git commit -m "feat(WordAnagrams): use section-card BEM for redesigned layout"
```

---

## Task 6: Restructure `[...wordSlug].astro`

**Files:**
- Modify: `src/pages/wort/[...wordSlug].astro`

**Key changes:**
1. Import three new SCSS files after `_single-word.scss`
2. Remove `createWikimediaFileList` import (unused)
3. Add `hasImages` and `wortartLabel` computed variables
4. Wrap `<Breadcrumbs>` in `<nav class="c-page-topbar">`
5. Replace `<article class="c-single-word">` with `<div class="c-word-page">`
6. Add `<aside class="c-word-sidebar">` as first child of `.c-word-page`
7. Replace `<header>` with `<div class="c-word-hero">`; move `<IsWordOfTheDay>` into `__right`
8. Replace `<main class="c-single-word__main">` with `<div class="c-word-main">` + `<div class="c-word-main__content">`
9. Wrap every section in `.c-section-card` with `__header`/`__num`/`__title`/`__body` structure
10. Add stat boxes + CV legend in Linguistik section
11. Replace raw Grammatik `<ul>/<p>` with `__grammar-entry`/`__grammar-tags`/`__grammar-tag` chips
12. Move gallery + learn-more into `<aside class="c-word-gallery-col">` (conditional on `hasImages`)
13. Move `<footer>` outside `.c-word-page` as sibling
14. Add inline `<script>` for IntersectionObserver active-link detection

**Section IDs and numbers:**

| # | ID | When |
|---|---|---|
| 01 | `#etymologie` | always |
| 02 | `#beispiele` | `wordProps.examples` |
| 03 | `#orthographie` | always |
| 04 | `#linguistik` | always |
| 05 | `#grammatik` | `wordTags.length > 0` |
| 06 | `#phonologie` | always |
| — | `#anagramme` | rendered by `<WordAnagrams>` |
| 07 | `#navigation` | always |

- [ ] **Step 1: Overwrite the Astro page**

Write `src/pages/wort/[...wordSlug].astro`:

```astro
---
// Styles
import "@styles/objects/_word.scss";
import "@styles/components/_single-word.scss";
import "@styles/components/_word-sidebar.scss";
import "@styles/components/_word-hero.scss";
import "@styles/components/_section-card.scss";
import "@styles/plugins/astro-breadcrumbs.scss";

// Types
import type { GetStaticPaths, InferGetStaticParamsType, InferGetStaticPropsType } from "astro";

import AudioPlayerList from "@components/AudioPlayerList.vue";
import BadgeTag from "@components/BadgeTag.vue";
import ImageGallery from "@components/ImageGallery.astro";
import RandomWordButton from "@components/RandomWordButton.vue";
import RelatedWords from "@components/RelatedWords.vue";
import ToolTip from "@components/ToolTip.vue";
import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import WordExamples from "@components/word/WordExamples.astro";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";
import WordAlphabetNav from "@components/word/WordAlphabetNav.astro";
import WordAnagrams from "@components/word/WordAnagrams.astro";
import WordCuriosities from "@components/word/WordCuriosities.astro";
import WordDecomposition from "@components/word/WordDecomposition.astro";
import WordLetterFrequency from "@components/word/WordLetterFrequency.astro";
import WordSimilarSpelling from "@components/word/WordSimilarSpelling.astro";
import Layout from "@layouts/Layout.astro";
import { fetchAllWords } from "@services/api.ts";
import { formattedDate, removeFileExtension, routeToWord, seoData } from "@utils/helpers.ts";
import {
  capitalizeFirstLetter,
  coloredConsonantsAndVowels,
  countLetters,
  getWordType,
  similarSoundingWords,
  translateNlpTags,
} from "@utils/wordHelper.ts";
import { Breadcrumbs } from "astro-breadcrumbs";
import german from "hyphenation.de";
import Hypher from "hypher";
import ChevronRight from "~icons/lucide/chevron-right";
import ExternalLink from "~icons/lucide/external-link";
import germanWordsArray from "an-array-of-german-words";

import type { BerlinerWord } from "@/gql/entity-types";

export const getStaticPaths = (async () => {
  const allWords = await fetchAllWords();

  return allWords.map(({ node }) => {
    return {
      params: {
        wordSlug: node.slug ?? undefined,
      },
      props: {
        allWords: allWords.map((word) => word.node),
        word: node,
      },
    };
  });
}) satisfies GetStaticPaths;

type Params = InferGetStaticParamsType<typeof getStaticPaths>;
type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { wordSlug } = Astro.params as Params;
const { allWords, word } = Astro.props;

const wordProps: BerlinerWord["wordProperties"] = word.wordProperties;

const alternativeWords = wordProps?.alternativeWords?.map((word, index) => {
  return (
    word?.alternativeWord +
    (wordProps?.alternativeWords && index !== wordProps?.alternativeWords?.length - 1 ? ", " : "")
  );
});

let galleryWidths = [316, 457, 658, 429, 525];
let gallerySizes =
  "(max-width: 80rem) 525px, (max-width: 64rem) 429px, (max-width: 48rem) 658px, (max-width: 35.49rem) 457px, (max-width: 26.6rem) 316px";
const lightboxWidths = [425, 567, 768, 896];
const lightboxSizes =
  "(max-width: 26.6rem) 425px, (max-width: 35.49rem) 567px, (max-width: 48rem) 768px, (max-width: 64rem) 896px";

if (wordProps?.images && wordProps?.images?.nodes.length > 1) {
  galleryWidths = [503, 435, 307];
  gallerySizes =
    "(max-width: 70rem) 503px, (max-width: 64rem) 435px, (max-width: 48rem) 307px, (max-width: 35.5rem) 435px, (max-width: 27.2rem) 307px";
}

const hypher = new Hypher(german);

const wordTags = translateNlpTags(getWordType(word.wordProperties?.berlinerisch ?? ''));
const germanWords = new Set<string>(germanWordsArray as string[]);
const hasImages = Boolean(wordProps?.images && wordProps.images.nodes.length > 0);
const wortartLabel: string | undefined =
  wordTags.length > 0 ? Object.values(wordTags[0])[0]?.[0] : undefined;

const schemaJson = () =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    alternateName: (wordProps?.alternativeWords ?? []).map((w) => w?.alternativeWord).join(", "),
    description: (wordProps?.translations ?? []).map((t) => t?.translation).join("; "),
    identifier: word.id,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Berliner Schnauze Wörterbuch",
      url: `${Astro.url.origin}/wort`,
    },
    name: wordProps?.berlinerisch,
    sameAs: wordProps?.learnMore || undefined,
    url: removeFileExtension(Astro.url.href),
  });
---

<Layout content={seoData({ seo: word.seo ?? undefined, title: word.title ?? '' })} contentClasses="o-word">
  <Fragment slot="head">
    <script set:html={schemaJson()} type="application/ld+json" />
  </Fragment>

  <nav class="c-page-topbar">
    <Breadcrumbs indexText="Start" linkTextFormat="capitalized" truncated={true}>
      <ChevronRight height="20" slot="separator" width="20" />
    </Breadcrumbs>
  </nav>

  <div class="c-word-page">

    <aside class="c-word-sidebar">
      <div class="c-word-sidebar__word">
        <p class="c-word-sidebar__word-title">{wordProps?.berlinerisch}</p>
        {wordProps?.article && (
          <p class="c-word-sidebar__word-subtitle">{wordProps.article}</p>
        )}
      </div>
      <nav class="c-word-sidebar__nav" aria-label="Seitennavigation">
        <p class="c-word-sidebar__group-label">Inhalt</p>
        <a class="c-word-sidebar__link" href="#etymologie">Bedeutung</a>
        {wordProps?.examples && (
          <a class="c-word-sidebar__link" href="#beispiele">Beispiele</a>
        )}
        <div class="c-word-sidebar__divider" role="separator" />
        <p class="c-word-sidebar__group-label">Sprache</p>
        <a class="c-word-sidebar__link" href="#orthographie">Orthographie</a>
        <a class="c-word-sidebar__link" href="#linguistik">Linguistik</a>
        {wordTags.length > 0 && (
          <a class="c-word-sidebar__link" href="#grammatik">Grammatik</a>
        )}
        <a class="c-word-sidebar__link" href="#phonologie">Phonologie</a>
        <div class="c-word-sidebar__divider" role="separator" />
        <p class="c-word-sidebar__group-label">Entdecken</p>
        <a class="c-word-sidebar__link" href="#anagramme">Anagramme</a>
        <a class="c-word-sidebar__link" href="#navigation">Nachbarn</a>
      </nav>
    </aside>

    <div class:list={["c-word-main", hasImages && "c-word-main--with-gallery"]}>

      <div class="c-word-hero">
        <div class="c-word-hero__left">
          <h1 class="c-word-hero__title">
            {wordProps?.berlinerisch}
            {wordProps?.article && (
              <span class="c-word-hero__word-article">, {wordProps.article}</span>
            )}
          </h1>
          <div class="c-word-hero__badges">
            {wordProps?.berolinismus && (
              <ToolTip client:only="vue">
                <BadgeTag> Berolinismus </BadgeTag>
                <Fragment slot="content">
                  {wordProps?.berlinerisch} gehört zu den Berlinismen.
                  <br /><br />
                  <strong>Berolinismus</strong> sind humorvolle Spitznamen und Eigenheiten,
                  die bestimmte Orte und Gebäude in Berlin charakterisieren und das lokale
                  Flair der Stadt prägen.
                </Fragment>
              </ToolTip>
            )}
            {wortartLabel && (
              <span class="c-word-hero__wortart-badge">{wortartLabel}</span>
            )}
            {word.wordProperties?.berlinerischAudio && (
              <AudioPlayerList
                audio={word.wordProperties?.berlinerischAudio}
                client:only="vue"
                isType="berlinerisch"
              />
            )}
          </div>
        </div>
        <div class="c-word-hero__right">
          <IsWordOfTheDay
            client:only="vue"
            iconSize={50}
            tooltipPlacement="top"
            word={wordProps?.berlinerisch ?? null}
            wordId={word.berlinerWordId}
          />
          <WordOptionDropdown
            berlinerisch={word.wordProperties?.berlinerisch ?? null}
            client:only="vue"
            slug={word.slug}
          />
        </div>
      </div>

      <div class="c-word-main__content">

        <section class="c-section-card" id="etymologie">
          <div class="c-section-card__header">
            <span class="c-section-card__num">01</span>
            <h2 class="c-section-card__title">Etymologie</h2>
          </div>
          <div class="c-section-card__body">
            {wordProps?.infoText && (
              <div class="c-section-card__infotext" set:html={wordProps.infoText} />
            )}
            {wordProps?.alternativeWords && (
              <div>
                <h3>Selbe Bedeutung wie:</h3>
                <p class="c-single-word__alternative-word">{alternativeWords}</p>
              </div>
            )}
            {wordProps?.translations && (
              <div class="c-single-word__translation-wrapper">
                <h3 class="c-single-word__sub-headline">Bedeutung:</h3>
                <ul class="c-single-word__translation">
                  {wordProps?.translations?.map((translation) => (
                    <li class="c-single-word__translation-item">{translation?.translation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {wordProps?.examples && (
          <section class="c-section-card" id="beispiele">
            <div class="c-section-card__header">
              <span class="c-section-card__num">02</span>
              <h2 class="c-section-card__title">Beispiele</h2>
            </div>
            <div class="c-section-card__body">
              <WordExamples examples={wordProps.examples} rootBemClass="c-single-word" />
            </div>
          </section>
        )}

        <section class="c-section-card" id="orthographie">
          <div class="c-section-card__header">
            <span class="c-section-card__num">03</span>
            <h2 class="c-section-card__title">Orthographie</h2>
          </div>
          <div class="c-section-card__body">
            <div class="c-single-word__syllables">
              <h3>Silbentrennung:</h3>
              <p
                set:html={hypher
                  .hyphenate(word.wordProperties?.berlinerisch)
                  .join(" <span class='is-divider'>|</span> ")}
              />
              <h3>Anzahl der Silben:</h3>
              <p>{hypher.hyphenate(word.wordProperties?.berlinerisch).length}</p>
            </div>
            <WordDecomposition
              allWords={allWords}
              germanWords={germanWords}
              word={word.wordProperties?.berlinerisch ?? ""}
            />
          </div>
        </section>

        <section class="c-section-card" id="linguistik">
          <div class="c-section-card__header">
            <span class="c-section-card__num">04</span>
            <h2 class="c-section-card__title">Quantitative Linguistik</h2>
          </div>
          <div class="c-section-card__body">
            <div class="c-section-card__stat-row">
              <div class="c-section-card__stat-box">
                <div class="c-section-card__stat-label">Buchstaben</div>
                <div class="c-section-card__stat-value">
                  {word.wordProperties?.berlinerisch?.length}
                </div>
              </div>
              <div class="c-section-card__stat-box">
                <div class="c-section-card__stat-label">Vokale</div>
                <div class="c-section-card__stat-value c-section-card__stat-value--vowels">
                  {countLetters(word.wordProperties?.berlinerisch ?? '').vowels}
                </div>
              </div>
              <div class="c-section-card__stat-box">
                <div class="c-section-card__stat-label">Konsonanten</div>
                <div class="c-section-card__stat-value c-section-card__stat-value--consonants">
                  {countLetters(word.wordProperties?.berlinerisch ?? '').consonants}
                </div>
              </div>
            </div>
            <div class="c-single-word__consonants-vowels">
              <h3>Konsonanten und Vokale</h3>
              <p
                class="c-single-word__consonants-vowels-word"
                set:html={coloredConsonantsAndVowels(word.wordProperties?.berlinerisch ?? '')}
              />
              <div class="c-section-card__cv-legend">
                <span class="c-section-card__cv-legend-item c-section-card__cv-legend-item--consonant">Konsonant</span>
                <span class="c-section-card__cv-legend-item c-section-card__cv-legend-item--vowel">Vokal</span>
              </div>
            </div>
            <WordLetterFrequency word={word.wordProperties?.berlinerisch ?? ""} />
            <WordCuriosities word={word.wordProperties?.berlinerisch ?? ""} />
          </div>
        </section>

        {wordTags.length > 0 && (
          <section class="c-section-card" id="grammatik">
            <div class="c-section-card__header">
              <span class="c-section-card__num">05</span>
              <h2 class="c-section-card__title">Grammatik</h2>
            </div>
            <div class="c-section-card__body">
              <p class="c-section-card__grammar-label">Wortart pro Wort (NLP-Analyse)</p>
              {Object.keys(wordTags[0]).map((key) => {
                const isNomenPresent = wordTags[0][key].includes("Nomen");
                return (
                  <div class="c-section-card__grammar-entry">
                    <div class="c-section-card__grammar-word">
                      {isNomenPresent ? capitalizeFirstLetter(key) : key}
                    </div>
                    <div class="c-section-card__grammar-tags">
                      {wordTags[0][key].map((tag) => (
                        <span class="c-section-card__grammar-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section class="c-section-card" id="phonologie">
          <div class="c-section-card__header">
            <span class="c-section-card__num">06</span>
            <h2 class="c-section-card__title">Phonologie</h2>
          </div>
          <div class="c-section-card__body">
            {similarSoundingWords(allWords, word).find((w) => w.isSimilar) && (
              <>
                <h3>Ähnlich klingende Wörter</h3>
                <ul>
                  {similarSoundingWords(allWords, word)
                    .filter((result) => result.isSimilar)
                    .map((result) => (
                      <li>
                        <a href={routeToWord(result.word?.slug ?? undefined)}>
                          {result.word?.wordProperties?.berlinerisch}
                        </a>
                      </li>
                    ))}
                </ul>
              </>
            )}
            <WordSimilarSpelling allWords={allWords} currentWord={word} />
          </div>
        </section>

        <WordAnagrams allWords={allWords} word={word.wordProperties?.berlinerisch ?? ""} />

        <section class="c-section-card" id="navigation">
          <div class="c-section-card__header">
            <span class="c-section-card__num">07</span>
            <h2 class="c-section-card__title">Alphabetische Nachbarn</h2>
          </div>
          <div class="c-section-card__body">
            <WordAlphabetNav allWords={allWords} currentWord={word} />
          </div>
        </section>

        {wordProps?.relatedWords?.nodes && wordProps?.relatedWords?.nodes.length > 0 && (
          <div class="c-section-card">
            <div class="c-section-card__body">
              <h3>Verwandte Worte:</h3>
              <ul class="c-single-word__related-words-list">
                {wordProps.relatedWords.nodes
                  .filter((w) => w?.wordProperties?.berlinerisch !== wordProps?.berlinerisch)
                  .map((w): BerlinerWord[] => (
                    <li class="c-single-word__related-word">
                      <a
                        class="c-single-word__related-word-link"
                        href={routeToWord(w?.slug ?? undefined)}
                      >
                        {w?.wordProperties?.berlinerisch}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {!hasImages && wordProps?.learnMore && (
          <a
            class="c-single-word__learn-more-link"
            href={wordProps.learnMore}
            target="_blank"
            title="mehr zu diesem Wort auf Wikipedia"
          >
            Erfahre mehr über dieses Wort
            <span class="c-single-word__learn-more-link-icon">
              <ExternalLink height="10" width="10" />
            </span>
          </a>
        )}

      </div>

      {hasImages && (
        <aside class="c-word-gallery-col">
          <p class="c-word-gallery-col__label">Bilder</p>
          <ImageGallery
            images={wordProps?.images}
            lightboxSizes={lightboxSizes}
            lightboxWidths={lightboxWidths}
            loading="eager"
            sizes={gallerySizes}
            widths={galleryWidths}
          />
          {wordProps?.learnMore && (
            <a
              class="c-single-word__learn-more-link"
              href={wordProps.learnMore}
              target="_blank"
              title="mehr zu diesem Wort auf Wikipedia"
            >
              Erfahre mehr über dieses Wort
              <span class="c-single-word__learn-more-link-icon">
                <ExternalLink height="10" width="10" />
              </span>
            </a>
          )}
        </aside>
      )}

    </div>

  </div>

  <footer class="c-single-word__footer">
    {word?.dateGmt && (
      <p class="c-single-word__created">Wort erstellt am: {formattedDate(word.dateGmt)}</p>
    )}
    {word?.modifiedGmt && (
      <p class="c-single-word__modified">Bearbeitet am: {formattedDate(word.modifiedGmt)}</p>
    )}
  </footer>

  <RelatedWords words={allWords}>
    <li>
      <RandomWordButton class:list="c-related-words__word is-random" words={allWords} />
    </li>
  </RelatedWords>

</Layout>

<script>
  const links = document.querySelectorAll<HTMLAnchorElement>('.c-word-sidebar__link');
  const sections = document.querySelectorAll<HTMLElement>('.c-section-card[id]');

  if (links.length > 0 && sections.length > 0) {
    const setActive = (id: string) => {
      links.forEach((l) => l.classList.remove('is-active'));
      const active = document.querySelector<HTMLAnchorElement>(
        `.c-word-sidebar__link[href="#${id}"]`
      );
      active?.classList.add('is-active');
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    sections.forEach((s) => observer.observe(s));
  }
</script>
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Exit 0.

- [ ] **Step 3: Run type check**

```bash
pnpm typechecking
```

Expected: No type errors in `[...wordSlug].astro` or modified components.

- [ ] **Step 4: Commit**

```bash
git add src/pages/wort/[...wordSlug].astro
git commit -m "feat(word-page): redesign single word page — sidebar nav, section cards, editorial layout"
```

---

## Spec Coverage

| Spec section | Implemented in | ✓ |
|---|---|---|
| §1 Container query setup | Task 4 `.c-word-page`, `.c-word-main` | ✅ |
| §1 Desktop 2-col grid `>= 48rem` | Task 4 | ✅ |
| §1 Gallery inner grid `>= 60rem` | Task 4 `.c-word-main--with-gallery` | ✅ |
| §1 Mobile horizontal scroll nav | Task 1 `@container word-page < 48rem` | ✅ |
| §2 Topbar (breadcrumbs, sticky) | Task 4 `.c-page-topbar` + Task 6 | ✅ |
| §3 Sidebar with word block + nav groups | Task 1 + Task 6 | ✅ |
| §3 Active link (IntersectionObserver) | Task 6 inline script | ✅ |
| §4 Word Hero card | Task 2 + Task 6 | ✅ |
| §4 Wortart badge | Task 6 `wortartLabel` + `__wortart-badge` | ✅ |
| §5 Section cards with `__num` + `__title` | Task 3 + Task 6 | ✅ |
| §6.1 Etymologie infotext block | Task 3 `__infotext` + Task 6 | ✅ |
| §6.2 Linguistik stat boxes + CV legend | Task 3 + Task 6 | ✅ |
| §6.3 Grammatik NLP tag chips | Task 3 `__grammar-*` + Task 6 | ✅ |
| §6.4 Gallery column (conditional) | Task 4 + Task 6 | ✅ |
| §7 Mobile sidebar CSS-only switch | Task 1 | ✅ |
| §8 New SCSS files + modified file | Tasks 1–4 | ✅ |
| §10 Dark mode on all new components | Tasks 1–4 (`butler-mx.dark-mode-class`) | ✅ |
| §11 Existing components untouched | No changes to word sub-components | ✅ |
