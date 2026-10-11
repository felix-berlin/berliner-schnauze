# PageSpeed Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower CLS, remove Sentry's 481 ms long task, make hashed assets long-cacheable, shrink the footer image and drop Cloudflare Web Analytics on berliner-schnauze.wtf.

**Architecture:** Five independent, small changes: a lazy Sentry loader, a measured CLS fix in the homepage header, a `_headers` rule, a corrected `sizes` attribute, and a CSP cleanup. No changes to search/Orama.

**Tech Stack:** Astro 7 (static, Cloudflare Pages), Vite 8/Rolldown, `@sentry/browser` 11, Vitest + jsdom, Playwright, Lighthouse CLI (via `pnpm dlx`).

**Spec:** `docs/superpowers/specs/2026-10-11-pagespeed-quick-wins-design.md`

## Global Constraints

- Do not touch Orama/search (`src/stores/wordList.ts`, `src/services/searchIndex.ts`, `/api/search/*`).
- Do not change `font-display` (stays `fallback`; `swap` → CLS 0.46, `optional` → CLS 0.65).
- Do not change Matomo.
- pnpm only. Import aliases (`@plugins` does not exist — keep relative paths already used in `BaseHead.astro`/plugins).
- Non-Baseline browser APIs need a fallback (`requestIdleCallback` → `setTimeout`).
- Every UI change is verified in the browser in light + dark mode, desktop + mobile width (toggle with `document.documentElement.classList.toggle('dark')`).
- Commits: Conventional Commits, scope `perf` types e.g. `perf(sentry): …`, end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Dev/E2E server: `NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 npx infisical run -- pnpm exec astro dev --ignore-lock --port 4322`. Leave the user's own dev server running.

## Review Focus

1. Error thrown by a page script **before** Sentry loads → must not crash the loader; it is simply not reported (accepted). Pinned by Task 1 test "does not import before load".
2. Page already fully loaded when the loader runs (`readyState === "complete"`, e.g. View-Transition navigations or late script execution) → init must still happen exactly once. Pinned by Task 1 test "imports when page already loaded".
3. Safari without `requestIdleCallback` → init must still run via `setTimeout`. Pinned by Task 1 test "falls back to setTimeout".
4. `manualChunks` rule must still put `@sentry/*` into the lazy `sentry` chunk, not into the entry chunk → checked in Task 1 Step 6 (build output grep).
5. Header CLS fix must not clip the headline on the narrowest viewport (320 px) or change desktop layout → checked in Task 2 Step 6 browser screenshots.

---

### Task 1: Load Sentry lazily after page load + idle

**Files:**
- Create: `src/plugins/sentryInit.ts` (the current `Sentry.init(...)` moved verbatim)
- Modify: `src/plugins/sentryBrowser.ts` (becomes the loader)
- Modify: `astro.config.mjs:625` (`manualChunks` sentry rule)
- Test: `src/tests/unit/plugins/sentryBrowser.test.ts` (create)

**Interfaces:**
- Produces: `sentryBrowser.ts` has no exports; side effect only: schedules `import("./sentryInit")` once after `load` + idle.
- `sentryInit.ts`: side effect only (`Sentry.init`), no exports.

- [ ] **Step 1: Move the init into `src/plugins/sentryInit.ts`**

Copy the full current content of `src/plugins/sentryBrowser.ts` into `src/plugins/sentryInit.ts` unchanged (imports `@sentry/browser`, `astro:env/client`, `../../package.json`, then `Sentry.init({...})`).

- [ ] **Step 2: Write the failing test** `src/tests/unit/plugins/sentryBrowser.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { initSpy } = vi.hoisted(() => ({ initSpy: vi.fn() }));
vi.mock("@/plugins/sentryInit", () => {
  initSpy();
  return {};
});

const setReadyState = (state: DocumentReadyState) =>
  Object.defineProperty(document, "readyState", { configurable: true, value: state });

describe("sentryBrowser loader", () => {
  beforeEach(() => {
    vi.resetModules();
    initSpy.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setReadyState("complete");
  });

  it("does not import before load", async () => {
    setReadyState("loading");
    await import("@/plugins/sentryBrowser");
    await vi.runAllTimersAsync();
    expect(initSpy).not.toHaveBeenCalled();
  });

  it("imports once after load + idle", async () => {
    setReadyState("loading");
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    await import("@/plugins/sentryBrowser");
    window.dispatchEvent(new Event("load"));
    window.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("imports when page already loaded", async () => {
    setReadyState("complete");
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    await import("@/plugins/sentryBrowser");
    await vi.runAllTimersAsync();
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to setTimeout without requestIdleCallback", async () => {
    setReadyState("complete");
    vi.stubGlobal("requestIdleCallback", undefined);
    await import("@/plugins/sentryBrowser");
    await vi.runAllTimersAsync();
    expect(initSpy).toHaveBeenCalledTimes(1);
  });
});
```

Note: `vi.mock` factory runs on first import of the mocked module, so `initSpy` counts actual imports. If Vitest caches the mock across `resetModules`, switch the factory to `vi.doMock` inside `beforeEach`.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/tests/unit/plugins/sentryBrowser.test.ts`
Expected: FAIL — "does not import before load" fails (current file inits synchronously / mock never imported) or "imports once" fails.

- [ ] **Step 4: Replace `src/plugins/sentryBrowser.ts` with the loader**

```ts
// Sentry costs ~500 ms main-thread time on mid-range mobiles; load it after the
// page is interactive. Errors before that point are not reported (accepted).
const loadSentry = () => {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
  idle(() => void import("./sentryInit"));
};

if (document.readyState === "complete") {
  loadSentry();
} else {
  window.addEventListener("load", loadSentry, { once: true });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/tests/unit/plugins/sentryBrowser.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Update `manualChunks` and verify the build split**

In `astro.config.mjs` change

```js
if (id.includes("@sentry/") || id.includes("/plugins/sentryBrowser")) {
```

to

```js
if (id.includes("@sentry/") || id.includes("/plugins/sentryInit")) {
```

Run: `pnpm build:local`
Then:

```bash
rg -l "Sentry|sentry_key|ingest" dist/_astro/*.js | head
rg -o 'import\("[^"]*sentry[^"]*"\)' dist/_astro/*.js | head
```

Expected: `@sentry` code only in `dist/_astro/sentry.*.js`; the loader chunk referenced from the HTML contains a dynamic `import("./sentry.<hash>.js")` (or via preload-helper) and is < 1 KiB. Homepage HTML (`dist/index.html`) must not contain a `<link rel="modulepreload" ... sentry` (if it does, the chunk still loads eagerly — investigate).

- [ ] **Step 7: Verify in browser**

Start the e2e dev server (Global Constraints) or `pnpm server:preview` after the build. In Chrome MCP: load `/`, list network requests filtered to `script` — `sentry.*.js` must start after the `load` event. Run in console: `setTimeout(() => { throw new Error("sentry-lazy-check") }, 5000)` and confirm an `envelope` request to `ingest*.sentry.io` (only if `SENTRY_DSN` is set in the env; otherwise skip and note it).

- [ ] **Step 8: Full unit suite + commit**

Run: `pnpm test:unit`
Expected: all green.

```bash
git add src/plugins/sentryBrowser.ts src/plugins/sentryInit.ts src/tests/unit/plugins/sentryBrowser.test.ts astro.config.mjs
git commit -m "perf(sentry): initialize Sentry after load and idle"
```

---

### Task 2: Fix homepage CLS caused by the Berliner font swap

**Files:**
- Modify (one of, decided by measurement): `src/styles/objects/_index.scss` (`.o-index__header` / `.o-index__headline`) **or** `astro.config.mjs` fonts block (`fallbacks` of `Berliner`)
- Test: `src/tests/e2e/index.spec.ts` (add CLS assertion)

**Interfaces:** none.

- [ ] **Step 1: Reproduce with Lighthouse CLI (mobile, Linux)**

Against production:

```bash
pnpm dlx lighthouse@12 https://berliner-schnauze.wtf/ --only-categories=performance --form-factor=mobile --output=json --output-path=/tmp/claude-1000/-home-felix-workspace-berliner-schnauze/07f84a0b-e255-4b9f-b25e-eaddd2d47dac/scratchpad/lh-before.json --chrome-flags="--headless=new" --quiet
node -e 'const r=require("/tmp/claude-1000/-home-felix-workspace-berliner-schnauze/07f84a0b-e255-4b9f-b25e-eaddd2d47dac/scratchpad/lh-before.json");console.log("CLS",r.audits["cumulative-layout-shift"].numericValue);console.log(JSON.stringify(r.audits["layout-shifts"]?.details?.items?.slice(0,5),null,1))'
```

Expected: CLS ≈ 0.14 with `section.c-facts-grid` as shifted element and the Berliner woff2 as root cause. Write down the CLS value. If CLS is ~0 here, also run 3× more (it is timing dependent) before concluding; if still 0, stop and report to the user — do not guess a fix.

- [ ] **Step 2: Identify which fallback renders the headline before the swap**

In Chrome MCP on the e2e dev server, mobile viewport `412x823x1.75,mobile,touch`, block the font to freeze the fallback state:

```js
// evaluate_script
() => [...document.fonts].filter(f => f.family.startsWith("Berliner")).map(f => f.status)
```

and compare `.o-index__header` height with the font loaded vs. with the request for `/_astro/fonts/<berliner-hash>.woff2` blocked (Playwright MCP `browser_route` to abort it, or DevTools request blocking):

```js
() => ({ header: document.querySelector(".o-index__header").getBoundingClientRect().height,
         h1: document.querySelector(".o-index__headline").getBoundingClientRect().height,
         lines: Math.round(document.querySelector(".o-index__headline").getBoundingClientRect().height / parseFloat(getComputedStyle(document.querySelector(".o-index__headline")).lineHeight)) })
```

Expected: the header height differs between the two states. Note both values at 320, 412 and 768 px width.

- [ ] **Step 3: Write the failing e2e assertion** in `src/tests/e2e/index.spec.ts`

```ts
test("homepage header does not shift when the Berliner font swaps in", async ({ page }) => {
  await page.goto("/");
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) {
            if (!e.hadRecentInput) total += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        document.fonts.ready.then(() => setTimeout(() => resolve(total), 500));
      }),
  );
  expect(cls).toBeLessThan(0.1);
});
```

Run: `E2E_PORT=4322 npx playwright test src/tests/e2e/index.spec.ts --project="Mobile Chrome" -g "does not shift"`
Expected: FAIL (CLS ≥ 0.1). If it passes locally (font served fast from localhost), add `await page.route("**/_astro/fonts/*.woff2", async (r) => { await new Promise(res => setTimeout(res, 1500)); await r.continue(); });` before `goto` to simulate a slow font, then re-run until it FAILS.

- [ ] **Step 4: Apply the smallest fix — option A first (stable header height)**

If Step 2 showed the headline line count changes on swap, reserve the larger height so a re-wrap cannot grow the header. In `src/styles/objects/_index.scss` `&__headline`:

```scss
  &__headline {
    font-size: butler-fn.fluid(29, 56, 320, 1260);
    margin: 0;
    // Berliner swaps in late (font-display: fallback); reserve its line box so
    // the swap cannot change the header height (PSI CLS 0.141 on .c-facts-grid).
    min-block-size: calc(2lh); // <- replace 2 with the line count measured WITH Berliner in Step 2
  }
```

`lh` is Baseline Newly Available. If the measured line count differs per breakpoint, set it per breakpoint with `@include mx.breakpoint("xs") { min-block-size: calc(Nlh); }`.

Option B (only if A cannot hold — e.g. the fallback is *taller* than Berliner so `min-block-size` doesn't prevent shrink-shift): in `astro.config.mjs` change the Berliner `fallbacks: ["Georgia", "serif"]` to a fallback Astro computes metrics for that exists on Linux/Android, then rebuild and check the generated `@font-face{... fallback: ...}` in `dist/index.html` has `size-adjust`.

- [ ] **Step 5: Run the e2e assertion to verify it passes**

Run: `E2E_PORT=4322 npx playwright test src/tests/e2e/index.spec.ts --project="Mobile Chrome"`
Expected: PASS (whole file, not only the new test).

- [ ] **Step 6: Visual check (light + dark, 320 / 412 / 1280 px)**

Chrome MCP screenshots of `/` header area at 320, 412 and 1280 px, each in light and dark (`document.documentElement.classList.toggle('dark')`). Expected: headline not clipped, no extra visible gap vs. production on desktop.

- [ ] **Step 7: Commit**

```bash
git add src/styles/objects/_index.scss src/tests/e2e/index.spec.ts   # or astro.config.mjs for option B
git commit -m "perf(index): reserve headline height to prevent font-swap layout shift"
```

---

### Task 3: Long-term cache for hashed assets + CSP cleanup

**Files:**
- Modify: `public/_headers`

**Interfaces:** none.

- [ ] **Step 1: Add the immutable rule** — append to `public/_headers`:

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 2: Remove Cloudflare Web Analytics from the CSP** — only after the user confirms Web Analytics is disabled in the Cloudflare dashboard (ask; if not confirmed, skip this step and keep the commit to Step 1). In the `Content-Security-Policy` line delete ` https://static.cloudflareinsights.com` (script-src) and ` https://cloudflareinsights.com` (connect-src).

- [ ] **Step 3: Verify locally with Wrangler**

Run: `pnpm build:local && pnpm server:preview` (background), then:

```bash
curl -sI http://localhost:8788/ | rg -i "cache-control|content-security"
f=$(ls dist/_astro/*.css | head -1 | xargs basename); curl -sI "http://localhost:8788/_astro/$f" | rg -i cache-control
```

Expected: `/_astro/*.css` → `public, max-age=31536000, immutable`; `/` unchanged; CSP without `cloudflareinsights` (if Step 2 applied). Port: use the one Wrangler prints.

- [ ] **Step 4: Commit**

```bash
git add public/_headers
git commit -m "perf(cache): serve hashed assets as immutable and drop cloudflare insights from csp"
```

---

### Task 4: Correct footer image `sizes`

**Files:**
- Modify: `src/components/Footer.astro:37`

**Interfaces:** none.

- [ ] **Step 1: Measure the rendered width**

On the e2e dev server, Chrome MCP, for each viewport width 360, 412, 568, 768, 1024, 1440: `emulate` the viewport, scroll to the footer, then:

```js
() => Math.round(document.querySelector(".c-footer__farewell-image").getBoundingClientRect().width)
```

Known data point: 412 px viewport → 186 px. Write down the table (viewport → width) and derive a `sizes` that is ≥ the rendered width at each breakpoint (round up to the nearest 10 px or use `vw` if it scales linearly). Example shape: `(min-width: 1024px) 400px, (min-width: 768px) 30vw, 46vw` — the real numbers come from the table.

- [ ] **Step 2: Apply** — replace `sizes='(min-width: 1024px) 40vw, 50vw'` with the derived value.

- [ ] **Step 3: Verify**

At 412×823 DPR 1.75 the selected `currentSrc` width (from the `srcset` `w` descriptor) must be the smallest candidate ≥ 186 × 1.75 ≈ 326 px:

```js
() => { const i = document.querySelector(".c-footer__farewell-image"); return { w: i.getBoundingClientRect().width, src: i.currentSrc }; }
```

Screenshot the footer at 412 and 1440 px, light and dark — image sharp, layout unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.astro
git commit -m "perf(images): match footer image sizes to rendered width"
```

---

### Task 5: Final verification

- [ ] **Step 1:** `pnpm lint` and `pnpm test:unit` — both green.
- [ ] **Step 2:** `E2E_PORT=4322 npx playwright test src/tests/e2e/index.spec.ts src/tests/e2e/global-footer.spec.ts --project=chromium` — green.
- [ ] **Step 3:** Lighthouse CLI mobile against the local preview (`pnpm server:preview`), compare with `lh-before.json`: CLS < 0.1, no `sentry` entry in `long-tasks`.
- [ ] **Step 4:** Report to the user: what changed, before/after numbers, and the post-deploy checklist from the spec (PSI mobile, `curl -I` on `/_astro/*`, no `cloudflareinsights` requests). Remind them to disable Cloudflare Web Analytics in the dashboard if not done.
