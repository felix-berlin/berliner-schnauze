# CLS Fix: Font Metric Overrides + client:only Placeholders

**Goal:** Push lab CLS from 0.69 → ≤0.10  
**Branch:** `perf/cls-fix` (extend) or new branch off `perf/img-and-others`  
**Baseline:** CLS 0.69 (perf trace, unthrottled), Lighthouse mobile CLS 0.083

---

## Context

Performance traces on `perf-img-and-others.berliner-schnauze.pages.dev` (2026-06-01) consistently show CLS ~0.69. The cluster starts 60–90ms after TTFB and scores 0.6934.

**Prior plan** (`2026-05-30-performance-cls-fix.md`) proposed `font-display: optional` for body fonts.  
**This is forbidden** — CLAUDE.md states: "Do NOT change to optional — on cold cache the 100ms block period makes all text invisible then appear as fallback, causing severe CLS (0.65 observed)."

Root causes identified in this session:

| # | Cause | Evidence | CLS Impact |
|---|-------|----------|------------|
| 1 | Font swap — Berlin font family, `font-display: swap`, no metric overrides | Shift at 60–90ms post-TTFB → matches font download timing. 5 fonts preloaded but still swap when they arrive | **Primary** ~0.69 |
| 2 | `WordOfTheDay client:only="vue"` — no SSR shell | `client:only` = zero HTML until Vue hydrates. Grid item appears after JS runs, shifts content below | **Secondary** (unmeasured) |
| 3 | Image placeholder CSS bug | Duplicate `.o-index__image` in `:not(.loaded)` block — `opacity:0` then `opacity:1` override. Skeleton plays but image is already visible | No CLS, but broken UX |

**Why CLS from fonts?** `font-display: swap` renders fallback font immediately, then swaps the web font when loaded. If the web font has different metrics (cap height, x-height, line spacing) than the fallback, text reflows → layout shift. Fix: add CSS font metric overrides to the `@font-face` `src` fallback so the fallback font dimensions match the web font.

---

## Phase 0: Documentation Discovery ✅

Sources already confirmed in this session:

| File | Relevant lines |
|------|---------------|
| `src/styles/base/_typo.scss` | Lines 4–38: all 5 `@font-face` with `font-display: swap` |
| `src/pages/index.astro` | Line 83: `<WordOfTheDay client:only="vue" />` |
| `src/styles/objects/_index.scss` | Lines 68–85: `.image-placeholder-wrap` CSS with bug |
| `src/components/WordOfTheDay.vue` | Client-only component, renders crown + word card |

Font stack confirmed (via browser eval):
- `Berliner` 400 normal → `BerlinerRegular.woff2` (headings: h1–h5)
- `Berlin` 400 normal → `Berlin.woff2` (body text)
- `Berlin` 400 italic → `Berlin-Italic.woff2`
- `Berlin` 700 normal → `Berlin-Bold.woff2`
- `Berlin` 900 normal → `BerlinX-Bold.woff2`

All 5 fonts preloaded via `<link rel="preload" as="font">` ✅  
All 5 fonts `font-display: swap` → no metric overrides ❌

---

## Phase 1: Measure Berlin Font Metrics

Before adding metric overrides, measure the actual web font metrics to compute the correct override values.

### 1a — Install fonttools (one-time)

```bash
pip install fonttools
```

### 1b — Extract metrics for Berlin.woff2 (primary body font)

```bash
# Convert woff2 → ttf (fonttools)
cd /home/felix/workspace/berliner-schnauze/public/fonts

python3 -c "
from fontTools.ttLib import TTFont
font = TTFont('Berlin.woff2')
head = font['head']
os2 = font['OS/2']
hhea = font['hhea']
print('unitsPerEm:', head.unitsPerEm)
print('sTypoAscender:', os2.sTypoAscender)
print('sTypoDescender:', os2.sTypoDescender)
print('sTypoLineGap:', os2.sTypoLineGap)
print('usWinAscent:', os2.usWinAscent)
print('usWinDescent:', os2.usWinDescent)
print('sxHeight:', os2.sxHeight)
print('sCapHeight:', os2.sCapHeight)
"
```

Repeat for `BerlinerRegular.woff2` (headings).

### 1c — Identify fallback font

The CSS fallback stack for Berlin is likely `system-ui`, `Arial`, or `sans-serif`. Check `src/styles/variables/_typography.scss` or equivalent for the `font-family` stack used on `body` / paragraphs.

Run the same measurement for the system fallback font (Arial is typically at `/usr/share/fonts/truetype/msttcorefonts/Arial.ttf` or Windows equivalent).

### 1d — Calculate override values

Given metrics from step 1b:

```
size-adjust = (fallback_advance_width / web_font_advance_width) × 100%
ascent-override = sTypoAscender / unitsPerEm × 100%
descent-override = abs(sTypoDescender) / unitsPerEm × 100%
line-gap-override = sTypoLineGap / unitsPerEm × 100%
```

Or use the Chrome DevTools font override panel:
1. DevTools → Rendering tab → "Local fonts" → enable
2. Open `chrome://settings/fonts`  
3. Use [Malte Ubl's size-adjust calculator](https://seek-oss.github.io/capsize/) or the [web font override generator](https://www.industrialempathy.com/perfect-sse/)

**Verification:**
- Note down override values for Berlin and BerlinerRegular before proceeding to Phase 2
- Target: fallback font renders at identical dimensions to web font

---

## Phase 2: Add Font Metric Overrides

### 2a — Add @font-face fallback declarations

File: `src/styles/base/_typo.scss`

Add a `@font-face` for the **fallback font** with metric overrides BEFORE each web font declaration. This creates a virtual "patched" fallback that matches the web font's metrics.

Pattern (adjust values from Phase 1 measurements):

```scss
// Patched fallback for Berlin 400 — metrics matched to Berlin.woff2
@font-face {
  font-family: "Berlin-fallback";
  src: local("Arial");           // or local("system-ui"), whatever the stack uses
  font-weight: 400;
  font-style: normal;
  size-adjust: 97%;              // measured value from Phase 1
  ascent-override: 90%;          // measured value
  descent-override: 22%;         // measured value
  line-gap-override: 0%;         // measured value
}

// Web font (existing, unchanged)
@font-face {
  font-weight: 400;
  font-style: normal;
  font-family: Berlin;
  src: url("/fonts/Berlin.woff2") format("woff2");
  font-display: swap;
}
```

Then update the `font-family` stack wherever `Berlin` is used to include `Berlin-fallback` as immediate fallback:

```scss
// Before:
body { font-family: vars.$berlin, sans-serif; }

// After:
body { font-family: vars.$berlin, Berlin-fallback, sans-serif; }
```

Repeat for `Berliner` (headings) → `Berliner-fallback`.

### 2b — Verify no reflow in DevTools

Run performance trace (Chrome DevTools MCP `performance_start_trace`) on local `pnpm server:pages`. Check:
- CLS insight shows 0 or near-0 for layout shift cluster that was at 60–90ms post-TTFB
- Font still renders correctly visually

**Anti-pattern:** Do NOT add `font-display: optional` — forbidden per CLAUDE.md.  
**Anti-pattern:** Do NOT change `font-display: block` — FOIT.

---

## Phase 3: Reserve Space for WordOfTheDay (client:only)

`WordOfTheDay` uses `client:only="vue"` — Astro outputs an empty `<astro-island>` in the static HTML. When Vue hydrates and renders the card, it inserts content into the facts grid, potentially shifting content below.

### 3a — Measure rendered dimensions

Open staging URL in browser DevTools → inspect the rendered `WordOfTheDay` card:

```js
document.querySelector('astro-island[component-url*="WordOfTheDay"]')
  .children[0].getBoundingClientRect()
// Note: height, width
```

### 3b — Add min-height to astro-island

Option A (CSS — preferred): Target the `<astro-island>` wrapper for WordOfTheDay by adding a class to its parent in `src/pages/index.astro`:

```astro
<!-- Before -->
<WordOfTheDay client:only="vue" />

<!-- After -->
<div class="c-facts-grid__word-of-day-slot">
  <WordOfTheDay client:only="vue" />
</div>
```

```scss
// In src/styles/components/_facts-grid.scss or _index.scss
.c-facts-grid__word-of-day-slot {
  min-height: Xpx; // measured value from 3a
  contain: layout; // prevents shifts from propagating out
}
```

Option B (astro-island selector):

```scss
astro-island:has([class*="WordOfTheDay"]) {
  display: block;
  min-height: Xpx;
}
```

### 3c — Verify

Performance trace → CLSCulprits insight → confirm no shift attributable to WordOfTheDay hydration.

---

## Phase 4: Fix Image Placeholder CSS Bug

File: `src/styles/objects/_index.scss`, lines 68–85.

**Current (broken):**
```scss
.image-placeholder-wrap:not(.loaded) {
  position: relative;
  min-height: var(--min-height-placeholder, 300px);
  @include mx.skeleton-loader;

  .o-index__image {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0;          // ← hidden while loading
    transition: opacity 0.3s;
  }

  .o-index__image {      // ← DUPLICATE: overrides opacity to 1!
    opacity: 1;          // ← image always visible, skeleton pointless
  }
}
```

The second `.o-index__image` rule overrides the first. Image is always `opacity: 1` regardless of loaded state. Skeleton loader plays but image is visible behind it.

**Fix (remove duplicate rule):**
```scss
.image-placeholder-wrap:not(.loaded) {
  position: relative;
  min-height: var(--min-height-placeholder, 300px);
  @include mx.skeleton-loader;

  .o-index__image {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0;
    transition: opacity 0.3s;
  }
}

.image-placeholder-wrap.loaded .o-index__image {
  opacity: 1;
}
```

**Verify:** Image is invisible during load (skeleton visible), fades in after `loaded` class is added.  
Note: The hero image has `priority={true}` (Astro Picture) which adds `fetchpriority="high"`, so the invisible window is typically <50ms on fast connections.

---

## Phase 5: Final Verification

```bash
pnpm build
pnpm test:unit
pnpm server:pages
```

Then performance trace (Chrome DevTools MCP):

1. `performance_start_trace` → `CLSCulprits` insight → confirm cluster score < 0.10
2. Lighthouse mobile audit → CLS score ≥ 0.9
3. Visual check: fonts render correctly (not invisible, not fallback-only)
4. Visual check: WordOfTheDay skeleton / reserved space holds layout before hydration

**Acceptance criteria:**
- [ ] Lab CLS ≤ 0.10 (performance trace, unthrottled)
- [ ] Lighthouse mobile CLS score ≥ 0.9
- [ ] Berlin font renders correctly on first load (not permanent fallback)
- [ ] WordOfTheDay card appears without shifting surrounding content
- [ ] Hero image skeleton animation works correctly (image hidden → fade in)
- [ ] `pnpm test:unit` green (all 240 tests)
- [ ] `pnpm lint` clean

---

## Relation to Existing Plan

`2026-05-30-performance-cls-fix.md` covered:
- Phase 1a (BerlinX-Bold preload) → **already done** (5 fonts preloaded confirmed in browser)
- Phase 1b (font-display: optional) → **blocked** by CLAUDE.md (causes CLS 0.65)
- Phase 2 (ColorModeToggle + MainMenu placeholders) → still valid, not covered here
- Phase 3 (Modal.js chain) → still valid, not covered here
- Phase 4 (preconnect fix) → still valid, not covered here

This plan replaces Phase 1b with font metric overrides and adds WordOfTheDay + image placeholder fixes.
