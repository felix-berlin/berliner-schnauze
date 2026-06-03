# Single Word Page Redesign – Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the single word detail page (`src/pages/wort/[...wordSlug].astro`) with editorial visual direction, sticky sidebar navigation, and better section hierarchy — while fully preserving the existing design system (orange palette, dashed borders, Berlin font).

**Design direction:** Editorial/Zeitung aesthetic applied to the existing design system. No new colors or fonts are introduced; visual improvement comes from hierarchy, grouping, and layout.

**Tech stack:** Astro SSG, SCSS (no `scoped`), BEM with `c-` prefix, pure CSS for sidebar navigation (no Vue required), `position: sticky`.

**CSS philosophy:** Modern CSS exclusively. No `px`-based breakpoints in new SCSS unless unavoidable. Prefer **Container Queries** (`@container`) over Media Queries for all component-level layout switches. Use CSS nesting (`&`), `clamp()`, `color-mix()`, CSS logical properties (`padding-inline`, `margin-block`), and `container-type: inline-size` on layout containers. Media queries are only acceptable for page-level concerns that genuinely depend on the viewport (e.g. the topbar's `position: sticky` offset), and even then only when a container query cannot express the intent.

---

## 1. Layout Architecture

### Container Query setup

`<div class="c-word-page">` gets `container-type: inline-size; container-name: word-page`. All layout switches inside it use `@container word-page (inline-size >= 48rem)` (or similar thresholds) instead of `@media`. The mobile sidebar nav uses `@container word-page (inline-size < 48rem)`.

Similarly, `.c-word-main` gets `container-type: inline-size; container-name: word-main` so the inner gallery split can switch via `@container word-main (inline-size >= 36rem)`.

### Desktop (container ≥ 48rem)

```
┌──────────────────────────────────────────────────┐
│  Sticky Topbar (breadcrumb)                      │
├─────────────┬────────────────────────────────────┤
│             │                                    │
│  Sticky     │  Main content (section cards)      │
│  Sidebar    │                                    │
│  (200px)    │  ┌ Hero ──────────────────────┐   │
│             │  │ Word title + badges + audio │   │
│  Wort       │  └────────────────────────────┘   │
│  ─────────  │  ┌ 01 Etymologie ─────────────┐   │
│  · Bedeutung│  │ Infotext / Bedeutung        │   │
│  · Beispiele│  └────────────────────────────┘   │
│  ─────────  │  ┌ 02 Orthographie ───────────┐   │
│  · Orthogr. │  │ Silben + Wortzerlegung      │   │
│  · Linguist.│  └────────────────────────────┘   │
│  · Grammatik│  … weitere Sektionen …             │
│  · Phonolog.│                                    │
│  ─────────  │                                    │
│  · Anagramme│                                    │
│  · Nachbarn │                                    │
│             │                                    │
└─────────────┴────────────────────────────────────┘
```

Grid: `grid-template-columns: 200px 1fr`, `gap: 2rem`, `align-items: start`. Applied inside `@container word-page (inline-size >= 48rem)`.

### With Images (container ≥ 48rem)

When `wordProps.images` exists, the main content area becomes a two-column inner grid:

```
┌─────────┬──────────────────────┬───────────────┐
│ Sidebar │ Section cards        │ Gallery       │
│         │ (flex-column)        │ (sticky, 280px│
│         │                      │  right col)   │
└─────────┴──────────────────────┴───────────────┘
```

Inner grid: `grid-template-columns: 1fr 280px`, switched via `@container word-main (inline-size >= 36rem)`. Gallery column is `position: sticky; top: [topbar height]`.

### Mobile (container < 48rem)

- Sidebar collapses to a **horizontal scrollable nav bar** pinned below the topbar.
- Section cards stack full-width.
- Gallery appears inline between Etymologie and Orthographie sections.

---

## 2. Topbar

**Element:** `<nav class="c-page-topbar">` — sticky, `z-index` above content.

**Contents:**
- Left: `<Breadcrumbs>` (existing component, unchanged)
- Right: nothing (topbar stays lean)

**Styling:** white background, `border-bottom: 1px dashed var(--grey-100)`, `box-shadow` subtle. Height: ~52px.

---

## 3. Sidebar

**Element:** `<aside class="c-word-sidebar">` — `position: sticky; top: [topbar height + spacer]`.

### Word Header Block (`.c-word-sidebar__word`)
- Background: `var(--new-blue-400)` (dark blue, existing dark-mode color — used here as accent in light mode too)
- Word title in Berlin font, `color: var(--orange-300)`
- Article/type subtitle in muted color

### Navigation (`.c-word-sidebar__nav`)
Links grouped into three sections with uppercase micro-labels:

| Group label | Links |
|---|---|
| **Inhalt** | Bedeutung, Beispiele |
| **Sprache** | Orthographie, Quantit. Linguistik, Grammatik, Phonologie |
| **Entdecken** | Anagramme, Alphabetische Nachbarn |

Each link: `<a href="#section-id">` — pure anchor navigation, no JS needed.

**Active state:** Left border `3px solid var(--orange-600)` + `background: var(--orange-100)`. Active detection via CSS `scroll-margin-top` on sections + IntersectionObserver in a small inline `<script>` (progressive enhancement, not required for basic nav to work).

**Mobile alternative:** Via `@container word-page (inline-size < 48rem)`, `.c-word-sidebar` switches to horizontal flex row (`overflow-x: auto`, `-webkit-overflow-scrolling: touch`, `scrollbar-width: none`), pinned below topbar. No JS class toggling — pure CSS container query.

---

## 4. Word Hero Card (`.c-word-hero`)

Replaces the current `<header class="c-single-word__header">`.

**Layout:** Flexbox row, space-between.
- Left: H1 word title + badges row
- Right: action buttons

**Word title:** Berlin font, `clamp(32px, 5vw, 60px)`, `color: var(--new-blue-400)` (dark blue), `text-decoration: underline dashed var(--orange-300)`.

**Article suffix** (`, der`): smaller, lighter weight, `color: var(--grey-100)`.

**Badges row** (`.c-word-hero__badges`): flex, gap, below title.
- `<BadgeTag>` for Berolinismus (existing component, unchanged)
- Wortart badge (Substantiv / Verb / etc.) — new plain badge
- Audio player slot (existing `<AudioPlayerList>` component, unchanged)

**Action area:** `<WordOptionDropdown>` (existing component) + `<IsWordOfTheDay>` (stays here, positioned at top-right of hero card, same as current position above the article).

**Background:** `var(--color-background)` (existing CSS custom property — `color-mix(in srgb, var(--orange-100) 30%, white)`, dark mode: `var(--new-blue-400)`).

**Border:** `1px dashed var(--grey-100)` (same as existing `.c-single-word`).

---

## 5. Section Cards

Each content section becomes a `.c-section-card`:

```html
<section class="c-section-card" id="etymologie">
  <div class="c-section-card__header">
    <span class="c-section-card__num">01</span>
    <h2 class="c-section-card__title">Etymologie</h2>
  </div>
  <div class="c-section-card__body">
    <!-- content -->
  </div>
</section>
```

**`.c-section-card`:** `background: white`, `border: 1px dashed var(--grey-100)`, `border-radius: 4px`, `box-shadow` (existing values from `.c-single-word`).

**`.c-section-card__header`:** `padding: 12px 20px`, `border-bottom: 1px dashed var(--orange-200)`, flex row with `align-items: baseline`, `gap: 10px`.

**`.c-section-card__num`:** `font-size: 0.65rem`, `font-weight: 700`, `color: var(--orange-300)`, `letter-spacing: 0.05em`. Counts 01–06.

**`.c-section-card__title`:** Berlin font, `font-size: 1.25rem`, `font-weight: 700`, `color: var(--new-blue-400)`. Replaces raw `h2` styling.

**`.c-section-card__body`:** `padding: 16px 20px`.

### Section order and IDs

| # | ID | Section | Components |
|---|---|---|---|
| 01 | `#etymologie` | Etymologie | InfoText block + Bedeutung list + Alternative Wörter |
| 02 | `#beispiele` | Beispiele | `<WordExamples>` (conditional) |
| 03 | `#orthographie` | Orthographie | Silbentrennung + `<WordDecomposition>` |
| 04 | `#linguistik` | Quantitative Linguistik | Stat boxes + Vokal/Konsonant display + Letter bars + `<WordLetterFrequency>` + `<WordCuriosities>` |
| 05 | `#grammatik` | Grammatik | NLP word-type tags (conditional) |
| 06 | `#phonologie` | Phonologie | Similar-sounding + `<WordSimilarSpelling>` |
| — | `#anagramme` | (Buchstabenspiele) | `<WordAnagrams>` — section-card only if anagrams exist |
| 07 | `#navigation` | Alphabetische Nachbarn | `<WordAlphabetNav>` |

Beispiele and Grammatik are conditional (only rendered if data exists). Both still get section-card wrapping when they do appear.

---

## 6. Section Details

### 6.1 Etymologie (`#etymologie`)

**Infotext block** (when `wordProps.infoText` exists):  
`<div class="c-section-card__infotext">` — `border-left: 3px solid var(--orange-300)`, `background: var(--orange-100)`, `padding: 12px 16px`. Content set via `set:html`.

**Bedeutung list:** Existing `<ul class="c-single-word__translation">` — kept, no structural change.

**Alternative Wörter:** Stays as-is below Bedeutung.

### 6.2 Quantitative Linguistik (`#linguistik`)

Three stat boxes in a flex row:
- **Buchstaben** (total count)
- **Vokale** count — value colored `var(--vowel-color)` (#435e6b)
- **Konsonanten** count — value colored `var(--orange-600)`

`.c-section-card__stat-row`: flex, gap, `flex-wrap: wrap`.  
`.c-section-card__stat-box`: `background: var(--orange-100)`, `border: 1px dashed var(--orange-200)`, `border-radius: 4px`, `padding: 10px 14px`, `flex: 1`, `min-width: 80px`.  
`.c-section-card__stat-label`: 10px uppercase, muted.  
`.c-section-card__stat-value`: 20px, `font-weight: 800`, `color: var(--new-blue-400)` (overridden per above).

**Consonant/Vowel visual display:** Existing `coloredConsonantsAndVowels()` output with `.is-vowel` / `.is-consonant` colored spans — kept exactly as-is, just restyled with larger `letter-spacing` and monospace font for clarity. Add a two-item legend below (● Konsonant / ● Vokal).

**Letter frequency bars:** Existing `<WordLetterFrequency>` output — kept as-is within this card.

**Word Curiosities:** Existing `<WordCuriosities>` output — kept as-is within this card.

### 6.3 Grammatik (`#grammatik`)

**New sub-heading:** Small muted label "Wortart pro Wort (NLP-Analyse)" above the word-type entries.

Each word entry:  
`.c-section-card__grammar-entry` — `margin-bottom: 14px`.  
`.c-section-card__grammar-word` — word text, `font-weight: 700`, bottom border dashed orange.  
`.c-section-card__grammar-tags` — flex wrap, gap.  
`.c-section-card__grammar-tag` — pill/chip: `background: var(--orange-100)`, `border: 1px solid var(--orange-200)`, `border-radius: 4px`, `padding: 2px 10px`, `font-size: 0.75rem`.

This replaces the current raw `<ul>` / `<p>` output from `translateNlpTags()`. The data source is unchanged.

### 6.4 Gallery (with images)

When `wordProps.images` is present, the main content wrapper becomes a two-column grid. The gallery column is `position: sticky` and contains:

- Small uppercase label "Bilder" with dashed bottom border
- `<ImageGallery>` component (existing, unchanged)
- "Erfahre mehr" Wikipedia link (existing, moved into gallery column footer)

Without images: single-column layout, "Erfahre mehr" link stays at bottom of main content.

---

## 7. Mobile Navigation (container < 48rem)

The sidebar becomes a horizontal scrollable nav bar:

The sidebar is a single element that adapts via container query — no separate mobile component or BEM modifier needed:

```scss
.c-word-sidebar {
  // desktop: vertical sticky aside (default)
  display: flex;
  flex-direction: column;

  @container word-page (inline-size < 48rem) {
    // mobile: horizontal scroll bar
    flex-direction: row;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
    position: sticky;
    top: var(--topbar-height, 52px);
    z-index: 10;

    // hide group labels and dividers in mobile row
    .c-word-sidebar__group-label,
    .c-word-sidebar__divider { display: none; }

    .c-word-sidebar__word { display: none; }  // word header only on desktop
  }
}
```

Active link: `color: var(--orange-600)`, `border-bottom: 2px solid var(--orange-600)`.

---

## 8. SCSS Architecture

### New files

- `src/styles/components/_word-sidebar.scss` — sidebar styles
- `src/styles/components/_word-hero.scss` — hero card styles
- `src/styles/components/_section-card.scss` — section card frame styles

### Modified files

- `src/styles/components/_single-word.scss` — remove superseded grid-template-areas, header/main/footer grid rules. Keep: `__word`, `__word-article`, `__translation`, `__examples`, `__example`, `__quote-icon`, `__related-words-list`, `__letter-bar-*`, `__alpha-nav-*`, `__word-parts-*`, `__consonants-vowels`, `__syllables`.
- `src/pages/wort/[...wordSlug].astro` — restructure template.

### New BEM blocks

- `.c-word-sidebar`
- `.c-word-hero`
- `.c-section-card`
- `.c-word-page` (page layout wrapper)
- `.c-word-main` (main content area, with optional `--with-gallery` variant)

### Modern CSS patterns used throughout

```scss
// Container query setup — no media queries inside components
.c-word-page {
  container-type: inline-size;
  container-name: word-page;
}

.c-word-main {
  container-type: inline-size;
  container-name: word-main;
}

// CSS nesting (native, not SCSS-only)
.c-section-card {
  border: 1px dashed var(--grey-100);

  & + & {
    margin-block-start: 0; // gap handled by flex parent
  }

  &__header {
    padding-inline: 1.25rem;
    padding-block: 0.75rem;
  }
}

// clamp() for fluid sizing — no breakpoint needed
.c-word-hero__title {
  font-size: clamp(2rem, 5cqi, 3.75rem); // cqi = container query inline unit
}

// color-mix() for tints (already used in codebase, extend pattern)
.c-section-card__stat-box {
  background: color-mix(in srgb, var(--orange-600) 10%, white);
}

// Logical properties throughout
padding-inline: 1.25rem;   // not padding-left/right
margin-block: 1rem 0;      // not margin-top/bottom
border-inline-start: 3px solid var(--orange-300); // not border-left
```

**Container query breakpoints used:**

| Container    | Threshold      | Effect                             |
| ------------ | -------------- | ---------------------------------- |
| `word-page`  | `>= 48rem`     | Two-column sidebar + main layout   |
| `word-page`  | `< 48rem`      | Horizontal scroll nav              |
| `word-main`  | `>= 36rem`     | Inner gallery column appears       |
| `word-hero`  | `>= 32rem`     | Badges wrap to second row          |

No `@include mx.breakpoint()` calls in new SCSS files. Existing files that use `mx.breakpoint()` are untouched.

---

## 9. Astro Template Structure

```astro
<Layout>
  <nav class="c-page-topbar">
    <Breadcrumbs />
  </nav>

  <!-- Mobile sidebar (below topbar) -->
  <nav class="c-word-sidebar c-word-sidebar--mobile">...</nav>

  <div class="c-word-page">
    <!-- Desktop sidebar -->
    <aside class="c-word-sidebar">...</aside>

    <!-- Main: without images -->
    <main class="c-word-main" class:list={[hasImages && 'c-word-main--with-gallery']}>
      <div class="c-word-hero">...</div>

      <!-- Content col (always) -->
      <div class="c-word-main__content">
        <section class="c-section-card" id="etymologie">...</section>
        <section class="c-section-card" id="beispiele">...</section>
        <section class="c-section-card" id="orthographie">...</section>
        <section class="c-section-card" id="linguistik">...</section>
        <section class="c-section-card" id="grammatik">...</section>
        <section class="c-section-card" id="phonologie">...</section>
        <WordAnagrams /> <!-- renders own section-card if anagrams exist -->
        <section class="c-section-card" id="navigation">...</section>
      </div>

      <!-- Gallery col (only when images present) -->
      {wordProps.images && (
        <aside class="c-word-gallery-col">
          <ImageGallery />
          <a href={wordProps.learnMore}>Erfahre mehr →</a>
        </aside>
      )}
    </main>
  </div>

  <footer class="c-single-word__footer">...</footer>
</Layout>
```

---

## 10. Dark Mode

All new components use existing dark-mode patterns via `@include butler-mx.dark-mode-class`:
- `.c-word-sidebar`: `background: var(--new-blue-400)`, sidebar word block gets darker shade
- `.c-section-card`: `background: var(--new-blue-400)` (matches existing `--color-background` dark value)
- `.c-word-hero`: same as existing `.c-single-word` dark mode (`--color-background: var(--new-blue-400)`)

---

## 11. What Does NOT Change

- All existing utility functions in `wordHelper.ts` — untouched
- All Astro word components (`WordLetterFrequency`, `WordCuriosities`, etc.) — untouched
- All Vue components (`AudioPlayerList`, `WordOptionDropdown`, `BadgeTag`, etc.) — untouched
- `ImageGallery.astro` — untouched
- `WordExamples.astro` — untouched
- SCSS variables, mixins, color tokens — untouched
- GraphQL queries and data fetching — untouched
- SEO / schema JSON — untouched

---

## 12. Out of Scope

- Dark mode toggle (already exists)
- Search functionality
- Animation/transitions (beyond existing hover states)
- New data fields in WordPress
- Print styles
