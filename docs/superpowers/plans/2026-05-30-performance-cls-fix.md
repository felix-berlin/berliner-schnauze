# Performance: CLS + Critical Request Chain Fix

**Goal:** Push field CLS from 0.20 → ≤0.10 (Good), break Modal.js chain (500ms), fix duplicate preconnect.  
**Branch:** `perf/cls-fix`  
**Audit baseline:** LCP 1,119ms field (Good), CLS 0.20 field (Needs Improvement), Lighthouse mobile Accessibility/SEO/Best Practices 100/100/100.

---

## Context

Performance trace (2026-05-30) revealed:

| Metric | Value | Threshold |
|---|---|---|
| CLS (field p75) | 0.20 | >0.25 = Bad |
| CLS (Lighthouse mobile) | 0.33 | >0.25 = Bad |
| Max critical path latency | 500ms | — |
| LCP (field p75) | 1,119ms | ≤2,500ms = Good |

Three root causes identified:

1. **Font FOUT** — all 5 `@font-face` rules use `font-display: swap`; `BerlinX-Bold.woff2` has no `<link rel="preload">` (the other 4 do). Late font load triggers layout shift.
2. **Header hydration gap** — `ColorModeToggle` and `MainMenu` both use `client:only="vue"` with no SSR shell. Header renders empty slots → Vue hydrates → content shifts surrounding elements.
3. **Modal.js → ModalCloseButton.js static chain** — `ModalCloseButton` is a static import inside `Modal.vue` (line 45). Modal loads `client:idle` but its bundle eagerly pulls `ModalCloseButton.js`, creating a 500ms sequential chain in the critical path.

Bonus fix: `preconnect` tag in BaseHead.astro uses protocol-relative `//cms.berliner-schnauze.wtf` and lacks `crossorigin`. CMS also sends a `Link: <//cms.berliner-schnauze.wtf>; rel="preconnect"` response header → duplicate.

---

## Phase 0: Documentation Discovery ✅

Already completed (inline in this plan). Key sources:

- `src/styles/base/_typo.scss` — all `@font-face` declarations (lines 4–38)
- `src/components/BaseHead.astro` — 4 font preloads (lines 29–32), preconnect (line 33)
- `src/layouts/Layout.astro` — `client:` directives for Modal (line 43), ToastNotify (42), ScrollToTop (41)
- `src/components/header/MainHeader.astro` — ColorModeToggle line 21, MainMenu line 31
- `src/components/Modal.vue` — ModalCloseButton static import line 45
- `src/stores/modal.ts` — `open()` accepts `{ view: { component: defineAsyncComponent(...) } }`

---

## Phase 1: Add Missing Font Preload + Tune font-display

**Why:** `BerlinX-Bold.woff2` loads late (no preload), causing FOUT and layout shift. `font-display: swap` shows fallback font briefly then swaps — the metric change causes CLS.

**What to change:**

### 1a — Add preload for BerlinX-Bold

File: `src/components/BaseHead.astro` — after existing font preloads (line 32).

```astro
<link rel="preload" href="/fonts/BerlinX-Bold.woff2" as="font" type="font/woff2" crossorigin />
```

Verify existing preloads follow same pattern at lines 29–32:
```astro
<link rel="preload" href="/fonts/BerlinerRegular.woff2" as="font" type="font/woff2" crossorigin />
```

### 1b — Change body/content fonts to `font-display: optional`

`font-display: swap` = show fallback → swap when ready → CLS.  
`font-display: optional` = use fallback if font not ready in 100ms → no swap → no CLS.  
`font-display: block` = invisible text (FOIT) → no CLS but bad UX.

In `src/styles/base/_typo.scss`:
- **Berlin 400 regular + italic** (body text, lines 11–24): change to `font-display: optional`
- **BerlinerRegular** (display/heading font, line 4–10): keep `swap` or change to `optional` — test visually
- **Berlin 700 Bold + BerlinX 900** (headings, lines 25–38): change to `optional`

> **Note:** `optional` means if the font misses the 100ms window on first load, the fallback is used for that page view. On repeat visits the font is cached and loads instantly. This is the recommended CLS fix for web fonts.

**Verification:**
- Run `pnpm build && pnpm server:pages`, open in Chrome DevTools → Performance tab → confirm no layout shifts during font load
- Check that font still renders (not invisible) on first load in incognito

---

## Phase 2: Reserve Header Space for client:only Components

**Why:** `ColorModeToggle` and `MainMenu` are `client:only="vue"` — no SSR HTML. The header slots are empty until Vue hydrates, then content appears and shifts adjacent elements.

**What to change:**

### 2a — Add CSS dimensions to ColorModeToggle slot container

File: `src/components/header/MainHeader.astro`

Wrap `<ColorModeToggle client:only="vue" />` in a container with fixed dimensions matching the rendered button size. Check rendered dimensions in DevTools.

```astro
<div class="color-mode-toggle-slot" style="width: 40px; height: 40px;">
  <ColorModeToggle client:only="vue" />
</div>
```

Or add the class to the parent element that already wraps it and add CSS:
```scss
.color-mode-toggle-slot {
  width: 40px;   // match actual button dimensions
  height: 40px;
  flex-shrink: 0;
}
```

### 2b — Add CSS dimensions to MainMenu slot container

Same pattern. MainMenu renders as a nav element — reserve its height in the header so layout doesn't shift when it appears.

Check `src/components/header/MainHeader.astro` for the parent element wrapping `<MainMenu client:only="vue" />` (line 31) and ensure it has a defined `min-height` or `height`.

### 2c — Verify SetColorMode.astro runs before hydration

`src/components/SetColorMode.astro` (current branch, modified) injects a blocking inline script that sets `data-theme` on `<html>` before paint. Confirm it's included in `BaseHead.astro` or before any layout-affecting components. This prevents color-mode-driven repaints.

**Verification:**
- Chrome DevTools → Performance → record reload → check "Layout Shift" events in timeline
- Confirm header height stays constant from initial paint through hydration
- Field CLS target: ≤0.10

---

## Phase 3: Break Modal.js → ModalCloseButton.js Static Chain

**Why:** `ModalCloseButton` is a static import at `Modal.vue:45`. Even though Modal loads `client:idle`, its bundle eagerly pulls `ModalCloseButton.js` as a dependency, creating a 500ms sequential download chain.

**What to change:**

File: `src/components/Modal.vue` — line 45.

**Before:**
```js
import ModalCloseButton from "@/components/ModalCloseButton.vue"
```

**After:**
```js
import { defineAsyncComponent } from "vue"
const ModalCloseButton = defineAsyncComponent(() => import("@/components/ModalCloseButton.vue"))
```

`ModalCloseButton` is only used inside the modal overlay — it never renders until the modal opens. Async import is safe here and breaks the static chain so Rollup/Vite splits it into a separate chunk that loads on demand.

**Verification:**
- `pnpm build` — confirm `ModalCloseButton` is no longer listed as a static dependency of `Modal` chunk in the Rollup output
- Open page, open browser Network tab, verify `ModalCloseButton.*.js` does NOT load on page load (only loads when modal first opens)
- Open a modal → confirm ModalCloseButton renders correctly
- Run `pnpm test:unit` — confirm modal tests pass

---

## Phase 4: Fix Preconnect in BaseHead.astro

**Why:** `//cms.berliner-schnauze.wtf` (protocol-relative) lacks `crossorigin`. GraphQL requests are CORS — without `crossorigin` the browser opens a second connection for credentialed requests. CMS also sends a `Link: preconnect` response header for the same origin → duplicate.

**What to change:**

File: `src/components/BaseHead.astro` — line 33.

**Before:**
```html
<link href='//cms.berliner-schnauze.wtf' rel='preconnect' />
```

**After:**
```html
<link href='https://cms.berliner-schnauze.wtf' rel='preconnect' crossorigin />
```

For the duplicate `Link:` response header from the CMS server — this comes from WordPress, not from this repo. Options:
- If the CMS is self-managed: remove the `Link: preconnect` header from the WordPress server config / plugin
- If not accessible: acceptable to leave (browser deduplicates same-origin preconnects)

**Verification:**
- Chrome DevTools → Network tab → filter "Initiator: preconnect" → confirm only one connection to `cms.berliner-schnauze.wtf`
- `pnpm build && pnpm server:pages` → view source → confirm `href='https://...'` and `crossorigin` present

---

## Phase 5: Final Verification

Run full audit after all phases:

```bash
# Build
pnpm build

# Type check
pnpm typechecking

# Unit tests
pnpm test:unit

# Local preview
pnpm server:pages
```

Then in Chrome DevTools / Chrome DevTools MCP:
1. Performance trace on `https://berliner-schnauze.wtf/` (after deploying) — confirm CLS < 0.10
2. Lighthouse mobile audit — confirm score maintained (Accessibility/SEO/BP 100)
3. Network tab — confirm `ModalCloseButton.*.js` absent on initial load
4. Network tab — single preconnect to `cms.berliner-schnauze.wtf`

**Acceptance criteria:**
- [ ] Field CLS ≤ 0.10 (may take days to show in CrUX — lab CLS should be 0.00 on mobile Lighthouse)
- [ ] Lighthouse mobile CLS score ≥ 0.9 (currently 0.35)
- [ ] `ModalCloseButton.js` not in initial page load waterfall
- [ ] Single preconnect with `crossorigin` to CMS origin
- [ ] All 58 Lighthouse checks still passing
- [ ] `pnpm test:unit` green
