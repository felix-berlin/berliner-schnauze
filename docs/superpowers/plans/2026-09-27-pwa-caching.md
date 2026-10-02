# PWA-Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Updates are fast on mobile, new pages are reachable immediately after a deploy, and users can control update behavior and an opt-in offline dictionary from the settings.

**Architecture:** The Workbox `generateSW` precache shrinks to the app shell. Navigations go through a NetworkFirst runtime cache `pages` with a precache fallback to `/index.html`. A small `public/sw-background-fetch.js` (pulled in via `workbox.importScripts`) handles Background Fetch events. User settings live in a persistent Nanostore. The offline dictionary runs in the page context: Background Fetch on Chromium, otherwise an in-page downloader. Both write into the same `pages` cache.

**Tech Stack:** Astro 7, Vue 3 (`<script setup>`), `@vite-pwa/astro` + Workbox (`generateSW`), Nanostores (`nanostores`, `@nanostores/persistent`, `@nanostores/vue`), VueUse (`useNetwork`), Vitest + jsdom + `@vue/test-utils`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-pwa-caching-design.md`

## Global Constraints

- Package manager is pnpm only. Never use `npm` or `yarn`. (`npx playwright` / `npx infisical` are fine, as in CLAUDE.md.)
- Always use path aliases (`@stores/*`, `@services/*`, `@components/*`, `@composables/*`, `@utils/*`, `@styles/*`). Exception: `package.json` is imported as `../../package.json`, just like in `src/services/pwa.ts`.
- Vue: Composition API `<script setup lang="ts">`, block order `<template>`, `<script>`, `<style>`. Styles are unscoped. BEMIT (`.c-…__…--…`). Each component has its own SCSS at `src/styles/components/_name.scss`, loaded via `@use "@styles/components/name"`.
- Icons: Lucide, loaded asynchronously via `defineAsyncComponent(() => import("virtual:icons/lucide/<name>"))`.
- Analytics: `trackEvent("App", <action>, "PWA")` from `@utils/analytics`, and category `"App"` with label `"Settings"` for settings UI actions.
- Import stores from their own file (`@stores/pwaSettings.ts`), never from `@stores/index`.
- Baseline rule: Background Fetch and `navigator.connection` are non-Baseline. They are only allowed as progressive enhancement with a fallback or by hiding the UI. Content and functionality must never depend on them.
- **UI tasks (Task 9, Task 10) MUST be carried out with the `impeccable` skill.** Read `DESIGN.md` + `PRODUCT.md` first (Postcard Rule, currywurst orange as accent, "Paper Lift" shadow, cheeky/warm voice). `@include mx.paper-card` for cards, `.c-button--primary` for the orange CTA, `var(--color-muted)` for secondary text.
- Commits follow `<type>(pwa): <description>`, imperative, lowercase, with the footer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- When running oxlint directly: `--format=agent`. Single test: `pnpm vitest run <file>`.
- Constants shared between page code and the SW script: cache name `"pages"`, version header `"x-offline-dictionary-version"`, Background Fetch ID `"offline-dictionary@<package.json version>"`, SW message `{ type: "offline-dictionary", result: "success" | "fail" | "abort" }`.

## Review Focus

1. **Clearing the cache while the offline dictionary is on:** "Alles leeren" or clearing the "Besuchte Seiten" bucket should switch the dictionary off. Silently re-downloading about 450 MB on the next start is not acceptable. Test in Task 8.
2. **Old chunk after an update:** In the `auto`/`next-start`/ignored-toast cases, the old page lazily loads a chunk that has already been deleted. `vite:preloadError` should reload the page once, without a reload loop. Test in Task 3.
3. **Storage full during the download:** When `cache.put` throws `QuotaExceededError`, the state becomes `error`, with no endless retry and no uncaught promise. Test in Task 6.
4. **User paused, then the network or connection changes:** The download stays paused, and `online`/`connection.change` do not resume it. Test in Task 6.
5. **Turning the dictionary off during a running Background Fetch:** The fetch is aborted, and the SW abort handler does not write any entries after the deletion. Tests in Task 5 + Task 7.

---

## File Structure

| File                                                                                                      | Responsibility                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `astro.config.mjs` (modify)                                                                               | Workbox: app-shell precache, NetworkFirst navigation route, navigation preload, `importScripts` |
| `public/sw-background-fetch.js` (create)                                                                  | SW-side Background Fetch handler: cache records, notify clients                                 |
| `src/stores/pwaSettings.ts` (create)                                                                      | Persistent settings `$updateMode`, `$offlineDictionary` + `patchOfflineDictionary`              |
| `src/services/pwa.ts` (modify)                                                                            | Update modes, update check on return, `vite:preloadError` reload, offline dictionary boot       |
| `src/services/storagePersistence.ts` (create)                                                             | `navigator.storage.persisted()/persist()` wrapper                                               |
| `src/services/offlineDictionary.ts` (create)                                                              | Download logic (in page + Background Fetch), progress store, gates, enable/disable/resume       |
| `src/composable/useCacheStorage.ts` (modify)                                                              | Bucket name `pages`, clearing switches the dictionary off                                       |
| `src/components/AppSettingsUpdates.vue` + `src/styles/components/_app-settings-updates.scss` (create)     | S3 UI                                                                                           |
| `src/components/AppSettings.vue` (modify)                                                                 | Mount `AppSettingsUpdates`                                                                      |
| `src/components/PwaOfflineDictionary.vue` + `src/styles/components/_pwa-offline-dictionary.scss` (create) | S1/S2/S4 UI                                                                                     |
| `src/components/PwaCacheOverview.vue` (modify)                                                            | Mount `PwaOfflineDictionary`                                                                    |
| `src/tests/e2e/pwa-caching.spec.ts` (create)                                                              | Navigation/offline behavior against the production build                                        |
| `CLAUDE.md` (modify)                                                                                      | Update the PWA section                                                                          |

---

### Task 1: Settings store `pwaSettings.ts`

**Files:**

- Create: `src/stores/pwaSettings.ts`
- Test: `src/tests/unit/stores/pwaSettings.test.ts`

**Interfaces:**

- Produces:
  - `type UpdateMode = "prompt" | "auto" | "next-start"`
  - `interface OfflineDictionarySettings { enabled: boolean; wifiOnly: boolean; syncedVersion: string | null }`
  - `DEFAULT_OFFLINE_DICTIONARY: OfflineDictionarySettings` (`{ enabled: false, wifiOnly: true, syncedVersion: null }`)
  - `$updateMode: PersistentAtom<UpdateMode>` (localStorage key `pwaUpdateMode`, default `"prompt"`)
  - `$offlineDictionary: PersistentAtom<OfflineDictionarySettings>` (key `pwaOfflineDictionary`)
  - `patchOfflineDictionary(patch: Partial<OfflineDictionarySettings>): void`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/stores/pwaSettings.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

const load = () => import("@stores/pwaSettings.ts");

describe("pwaSettings — $updateMode", () => {
  it("defaults to prompt", async () => {
    const { $updateMode } = await load();
    expect($updateMode.get()).toBe("prompt");
  });

  it("restores a persisted mode", async () => {
    localStorage.setItem("pwaUpdateMode", "auto");
    const { $updateMode } = await load();
    expect($updateMode.get()).toBe("auto");
  });

  it("falls back to prompt for an unknown persisted value", async () => {
    localStorage.setItem("pwaUpdateMode", "sometimes");
    const { $updateMode } = await load();
    expect($updateMode.get()).toBe("prompt");
  });
});

describe("pwaSettings — $offlineDictionary", () => {
  it("defaults to disabled, wifi-only, never synced", async () => {
    const { $offlineDictionary } = await load();
    expect($offlineDictionary.get()).toEqual({
      enabled: false,
      syncedVersion: null,
      wifiOnly: true,
    });
  });

  it("falls back to defaults for corrupt JSON", async () => {
    localStorage.setItem("pwaOfflineDictionary", "{not json");
    const { $offlineDictionary } = await load();
    expect($offlineDictionary.get().enabled).toBe(false);
  });

  it("fills missing keys from defaults", async () => {
    localStorage.setItem("pwaOfflineDictionary", JSON.stringify({ enabled: true }));
    const { $offlineDictionary } = await load();
    expect($offlineDictionary.get()).toEqual({
      enabled: true,
      syncedVersion: null,
      wifiOnly: true,
    });
  });

  it("patchOfflineDictionary merges and persists", async () => {
    const { $offlineDictionary, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ enabled: true });
    patchOfflineDictionary({ syncedVersion: "1.2.3" });
    expect($offlineDictionary.get()).toEqual({
      enabled: true,
      syncedVersion: "1.2.3",
      wifiOnly: true,
    });
    expect(JSON.parse(localStorage.getItem("pwaOfflineDictionary") ?? "{}").syncedVersion).toBe(
      "1.2.3",
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/stores/pwaSettings.test.ts`
Expected: FAIL, because the module `@stores/pwaSettings.ts` does not exist.

- [ ] **Step 3: Implement**

```ts
// src/stores/pwaSettings.ts
import { persistentAtom } from "@nanostores/persistent";

export type UpdateMode = "prompt" | "auto" | "next-start";

export interface OfflineDictionarySettings {
  enabled: boolean;
  wifiOnly: boolean;
  /** package.json version of the last complete download, null = never / invalidated. */
  syncedVersion: string | null;
}

const UPDATE_MODES: readonly string[] = ["prompt", "auto", "next-start"];

export const DEFAULT_OFFLINE_DICTIONARY: OfflineDictionarySettings = {
  enabled: false,
  syncedVersion: null,
  wifiOnly: true,
};

export const $updateMode = persistentAtom<UpdateMode>("pwaUpdateMode", "prompt", {
  decode: (value) => (UPDATE_MODES.includes(value) ? (value as UpdateMode) : "prompt"),
  encode: (value) => value,
});

export const $offlineDictionary = persistentAtom<OfflineDictionarySettings>(
  "pwaOfflineDictionary",
  DEFAULT_OFFLINE_DICTIONARY,
  {
    decode(value) {
      try {
        return {
          ...DEFAULT_OFFLINE_DICTIONARY,
          ...(JSON.parse(value) as Partial<OfflineDictionarySettings>),
        };
      } catch (err) {
        console.warn("[pwaSettings] Failed to parse offline dictionary settings:", value, err);
        return DEFAULT_OFFLINE_DICTIONARY;
      }
    },
    encode: JSON.stringify,
  },
);

export function patchOfflineDictionary(patch: Partial<OfflineDictionarySettings>): void {
  $offlineDictionary.set({ ...$offlineDictionary.get(), ...patch });
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/tests/unit/stores/pwaSettings.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/pwaSettings.ts src/tests/unit/stores/pwaSettings.test.ts
git commit -m "feat(pwa): add persistent pwa settings store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Workbox configuration (A + B + C)

**Files:**

- Modify: `astro.config.mjs` (block `workbox:`, currently around lines 432–513)

**Interfaces:**

- Produces: runtime cache name `"pages"` (used by Task 6/7/8), precache fallback `/index.html`.

There is no unit test: the generated `sw.js` is checked by a build (this task) and by E2E (Task 11).

- [ ] **Step 1: Shrink the precache to the app shell**

In `astro.config.mjs`, replace `navigateFallback` including its comment, plus `globPatterns`:

```js
        globPatterns: import.meta.env.DEV
          ? []
          : [
              "**/*.{js,css,svg,png,jpg,jpeg,gif,webp,avif,woff2,ico,txt}",
              // HTML: app shell only. Word/changelog/magazin/themen pages are cached on
              // visit (runtime "pages" cache below) or via the opt-in offline dictionary —
              // precaching all ~6000 pages re-downloaded ~450 MB on every deploy, because
              // each page embeds the hashed /_astro asset names.
              "*.html",
              "games/**/*.html",
              "settings/**/*.html",
            ],
```

Leave `globIgnores` (`og/**`, `screenshots/**`) as it is. The HTML folders are already excluded by the new patterns.

- [ ] **Step 2: Add navigation preload and the NetworkFirst navigation route**

Directly after `maximumFileSizeToCacheInBytes`:

```js
        navigationPreload: true,
```

As the **first** entry in `runtimeCaching`:

```js
          {
            // Network first so pages deployed after the last SW update are reachable
            // immediately; the cache only answers offline. No expiration on purpose: the
            // opt-in offline dictionary (src/services/offlineDictionary.ts) writes into this
            // same cache, and an entry limit would silently evict its pages.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [200],
              },
              // Uncached page while offline → homepage (search works offline).
              precacheFallback: {
                fallbackURL: "/index.html",
              },
            },
          },
```

Note: the `urlPattern` function is serialized into `sw.js` via `toString()`, so it must not reference variables from `astro.config.mjs`.

- [ ] **Step 3: Build with a small word set and inspect `sw.js`**

Run:

```bash
E2E_WORD_LIMIT=50 pnpm build:local
grep -c "wort/aasen.html" dist/sw.js
grep -o 'url:"index.html"' dist/sw.js | head -1
grep -o 'cacheName:"pages"' dist/sw.js
grep -o 'navigationPreload' dist/sw.js | head -1
grep -o 'fallbackURL[^}]*' dist/sw.js | head -1
```

Expected:

- `0` for `wort/aasen.html`.
- A precache entry for `index.html` (if the format is `"url":"index.html"`, adjust the grep accordingly). The key must match `fallbackURL: "/index.html"`. If Workbox stores it differently, adjust `fallbackURL` to the actual key and note that here.
- `cacheName:"pages"`, `navigationPreload` and `fallbackURL:"/index.html"` are present.
- `sw.js` no longer contains `navigateFallback` / `createHandlerBoundToURL`: `grep -c createHandlerBoundToURL dist/sw.js` → `0`.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: no new errors in `astro.config.mjs`.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs
git commit -m "fix(pwa): precache only the app shell and serve navigations network-first

Precaching every word page made each deploy re-download ~450 MB and
navigateFallback answered uncached navigations with the homepage without
trying the network, so new pages were missing until the SW update finished.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `pwa.ts` — update modes, update check, preload error, boot

**Files:**

- Modify: `src/services/pwa.ts`
- Test: `src/tests/unit/services/pwa.test.ts`

**Interfaces:**

- Consumes: `$updateMode`, `$offlineDictionary` from `@stores/pwaSettings.ts` (Task 1)
- Consumes: `resumeIfNeeded(): Promise<void>` from `@services/offlineDictionary` (Task 6). Until Task 6 exists, the test mocks the module. The dynamic import is only resolved at runtime, so the order does not matter for the build. To keep it robust anyway, create a stub `src/services/offlineDictionary.ts` with `export async function resumeIfNeeded(): Promise<void> {}` in this task, if it does not exist yet. Task 6 overwrites it.

- [ ] **Step 1: Extend the test setup**

In `src/tests/unit/services/pwa.test.ts`:

1. Add after the existing `vi.mock` calls:

```ts
vi.mock("@services/offlineDictionary", () => ({ resumeIfNeeded: vi.fn() }));
```

2. Add `localStorage.clear();` to the top-level `beforeEach`.
3. Extend the existing `window.location` stub with `assign`:

```ts
const mockReload = vi.fn();
const mockAssign = vi.fn();
Object.defineProperty(window, "location", {
  configurable: true,
  // oxlint-disable-next-line typescript/no-misused-spread
  value: { ...window.location, assign: mockAssign, reload: mockReload },
});
```

4. Change the type of `onRegisteredSW` in `getRegisterSWCallbacks` to `(swScriptUrl: string, registration?: ServiceWorkerRegistration) => void`.

- [ ] **Step 2: Write the failing tests**

Append to the end of `pwa.test.ts`:

```ts
// ── update modes ──────────────────────────────────────────────────────────────

async function setUpdateMode(mode: "prompt" | "auto" | "next-start") {
  const { $updateMode } = await import("@stores/pwaSettings.ts");
  $updateMode.set(mode);
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

function dispatchBeforePreparation(href: string) {
  const event = new Event("astro:before-preparation", { cancelable: true });
  Object.assign(event, { to: new URL(href) });
  document.dispatchEvent(event);
  return event;
}

describe("pwa service — update modes", () => {
  beforeEach(() => {
    mockReload.mockClear();
    mockAssign.mockClear();
  });

  it("auto + visible: no toast, no reload, full reload on next navigation", async () => {
    setVisibility("visible");
    await setUpdateMode("auto");
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");

    onNeedReload();
    expect(createToastNotify).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();

    const event = dispatchBeforePreparation("https://berliner-schnauze.wtf/wort/wa");
    expect(event.defaultPrevented).toBe(true);
    expect(mockAssign).toHaveBeenCalledWith("https://berliner-schnauze.wtf/wort/wa");
    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBe(version);
  });

  it("auto + visible: only the first navigation is intercepted", async () => {
    setVisibility("visible");
    await setUpdateMode("auto");
    const { onNeedReload } = await getRegisterSWCallbacks();
    onNeedReload();

    dispatchBeforePreparation("https://berliner-schnauze.wtf/a");
    const second = dispatchBeforePreparation("https://berliner-schnauze.wtf/b");
    expect(second.defaultPrevented).toBe(false);
    expect(mockAssign).toHaveBeenCalledTimes(1);
  });

  it("auto + hidden: reloads immediately", async () => {
    setVisibility("hidden");
    await setUpdateMode("auto");
    const { onNeedReload } = await getRegisterSWCallbacks();
    onNeedReload();
    expect(mockReload).toHaveBeenCalled();
  });

  it.each(["visible", "hidden"] as const)("next-start + %s: nothing happens", async (state) => {
    setVisibility(state);
    await setUpdateMode("next-start");
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();
    expect(createToastNotify).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("App", "Update deferred to next start", "PWA");
  });
});

// ── update check on return ────────────────────────────────────────────────────

describe("pwa service — update check on visibility", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls registration.update() when visible again after 30 min, throttled", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update } as unknown as ServiceWorkerRegistration);

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).not.toHaveBeenCalled(); // registered just now

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledOnce();

    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledOnce();
  });

  it("does not check when the tab becomes hidden", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update } as unknown as ServiceWorkerRegistration);

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).not.toHaveBeenCalled();
  });

  it("swallows update() rejections (offline)", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update } as unknown as ServiceWorkerRegistration);
    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.runAllTimersAsync();
    expect(update).toHaveBeenCalledOnce();
  });
});

// ── offline dictionary boot ───────────────────────────────────────────────────

describe("pwa service — offline dictionary boot", () => {
  it("resumes the offline dictionary when enabled", async () => {
    const { patchOfflineDictionary } = await import("@stores/pwaSettings.ts");
    patchOfflineDictionary({ enabled: true });
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update: vi.fn() } as unknown as ServiceWorkerRegistration);
    const { resumeIfNeeded } = await import("@services/offlineDictionary");
    await vi.waitFor(() => expect(resumeIfNeeded).toHaveBeenCalledOnce());
  });

  it("does not load the offline dictionary when disabled", async () => {
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update: vi.fn() } as unknown as ServiceWorkerRegistration);
    const { resumeIfNeeded } = await import("@services/offlineDictionary");
    await new Promise((r) => setTimeout(r, 0));
    expect(resumeIfNeeded).not.toHaveBeenCalled();
  });
});

// ── stale chunk after update ──────────────────────────────────────────────────

describe("pwa service — vite:preloadError", () => {
  beforeEach(() => {
    mockReload.mockClear();
  });

  it("reloads once on a failed chunk preload", async () => {
    await import("@services/pwa");
    const event = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it("does not reload again within 10 s (no reload loop)", async () => {
    sessionStorage.setItem("pwa-preload-reload-at", String(Date.now()));
    await import("@services/pwa");
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    expect(mockReload).not.toHaveBeenCalled();
  });
});
```

Also add explicit coverage for `prompt` as the default. The existing tests in `describe("pwa service — onNeedReload")` already run without a set mode and so cover `prompt`. Leave them unchanged.

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm vitest run src/tests/unit/services/pwa.test.ts`
Expected: FAIL in the new describe blocks. The old tests stay green.

- [ ] **Step 4: Implement**

Changes in `src/services/pwa.ts`:

Imports and constants below the existing `PWA_UPDATED_KEY`:

```ts
import { $offlineDictionary, $updateMode } from "@stores/pwaSettings.ts";

const PRELOAD_RELOAD_KEY = "pwa-preload-reload-at";
const PRELOAD_RELOAD_GUARD_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
```

After the success-toast block (before `registerSW`):

```ts
// After an update the old page may lazy-load a chunk the new deploy removed. Reload onto
// the new version once; the timestamp guard stops a loop when the chunk is missing offline.
window.addEventListener("vite:preloadError", (event) => {
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload < PRELOAD_RELOAD_GUARD_MS) return;
  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

// "auto" mode with a visible tab: never interrupt the current page (BON game, forms) —
// turn the next ClientRouter navigation into a full page load instead.
function applyUpdateOnNextNavigation(): void {
  document.addEventListener(
    "astro:before-preparation",
    (event) => {
      event.preventDefault();
      sessionStorage.setItem(PWA_UPDATED_KEY, version);
      trackEvent("App", "Update applied on navigation", "PWA");
      window.location.assign((event as Event & { to: URL }).to.href);
    },
    { once: true },
  );
}
```

At the start of `onNeedReload()`:

```ts
  onNeedReload() {
    const mode = $updateMode.get();
    if (mode === "next-start") {
      trackEvent("App", "Update deferred to next start", "PWA");
      return;
    }
    if (document.visibilityState === "visible") {
      if (mode === "auto") {
        applyUpdateOnNextNavigation();
        trackEvent("App", "Update queued for next navigation", "PWA");
        return;
      }
      // … existing toast code unchanged …
```

Replace `onRegisteredSW`:

```ts
  onRegisteredSW(swScriptUrl, registration) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");

    if (!registration) return;

    // Mobile PWAs stay open for days without a navigation, so the browser's own update
    // check rarely runs — check again whenever the app comes back to the foreground.
    let lastUpdateCheck = Date.now();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;
      lastUpdateCheck = Date.now();
      // Offline or flaky network: the next foreground switch retries.
      registration.update().catch(() => {});
    });

    if ($offlineDictionary.get().enabled) {
      void import("@services/offlineDictionary").then((m) => m.resumeIfNeeded());
    }
  },
```

Verify: the ClientRouter must actually abort on `preventDefault()` in `astro:before-preparation`. Check this in the Astro docs via context7 (`resolve-library-id` "astro" → `query-docs` "astro:before-preparation preventDefault"). If `preventDefault` is not supported there, override `event.loader` instead: `event.loader = () => { window.location.assign(event.to.href); return new Promise(() => {}); };`. Then adjust the test to check `mockAssign` after calling `event.loader()`.

If the Task 6 stub does not exist yet, create `src/services/offlineDictionary.ts`:

```ts
export async function resumeIfNeeded(): Promise<void> {}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run src/tests/unit/services/pwa.test.ts`
Expected: PASS (old + new tests)

- [ ] **Step 6: Commit**

```bash
git add src/services/pwa.ts src/tests/unit/services/pwa.test.ts src/services/offlineDictionary.ts
git commit -m "feat(pwa): add update modes and check for updates when returning to the app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `storagePersistence.ts` (S4 logic)

**Files:**

- Create: `src/services/storagePersistence.ts`
- Test: `src/tests/unit/services/storagePersistence.test.ts`

**Interfaces:**

- Produces:
  - `type PersistState = "unsupported" | "persisted" | "not-persisted"`
  - `getPersistState(): Promise<PersistState>`
  - `requestPersistentStorage(): Promise<PersistState>`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/services/storagePersistence.test.ts
import { getPersistState, requestPersistentStorage } from "@services/storagePersistence";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

function stubStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, "storage", { configurable: true, value: storage });
}

afterEach(() => {
  vi.clearAllMocks();
  stubStorage(undefined);
});

describe("storagePersistence", () => {
  it("reports unsupported without navigator.storage", async () => {
    stubStorage(undefined);
    expect(await getPersistState()).toBe("unsupported");
    expect(await requestPersistentStorage()).toBe("unsupported");
  });

  it.each([
    [true, "persisted"],
    [false, "not-persisted"],
  ])("getPersistState maps persisted()=%s to %s", async (value, expected) => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(value) });
    expect(await getPersistState()).toBe(expected);
  });

  it("requestPersistentStorage tracks the result", async () => {
    stubStorage({ persist: vi.fn().mockResolvedValue(false) });
    const { trackEvent } = await import("@utils/analytics");
    expect(await requestPersistentStorage()).toBe("not-persisted");
    expect(trackEvent).toHaveBeenCalledWith("App", "Persistent storage denied", "PWA");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/services/storagePersistence.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

```ts
// src/services/storagePersistence.ts
import { trackEvent } from "@utils/analytics";

export type PersistState = "unsupported" | "persisted" | "not-persisted";

export async function getPersistState(): Promise<PersistState> {
  if (!navigator.storage?.persisted) return "unsupported";
  return (await navigator.storage.persisted()) ? "persisted" : "not-persisted";
}

/** Asks the browser not to evict our caches under storage pressure (Chrome decides heuristically). */
export async function requestPersistentStorage(): Promise<PersistState> {
  if (!navigator.storage?.persist) return "unsupported";
  const granted = await navigator.storage.persist();
  trackEvent("App", granted ? "Persistent storage granted" : "Persistent storage denied", "PWA");
  return granted ? "persisted" : "not-persisted";
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/tests/unit/services/storagePersistence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/storagePersistence.ts src/tests/unit/services/storagePersistence.test.ts
git commit -m "feat(pwa): add persistent storage helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: SW script `sw-background-fetch.js` + `importScripts`

**Files:**

- Create: `public/sw-background-fetch.js`
- Modify: `astro.config.mjs` (`workbox`)
- Test: `src/tests/unit/services/swBackgroundFetch.test.ts`

**Interfaces:**

- Consumes: Background Fetch ID `offline-dictionary@<version>` (the version comes from the ID), cache `"pages"`, header `"x-offline-dictionary-version"`.
- Produces: `postMessage({ type: "offline-dictionary", result: "success" | "fail" | "abort", stored: number })` to all window clients. Task 7 consumes this.

**Spec deviation (intentional):** `backgroundfetchabort` does **not** cache records. An abort only comes from "cancel" / "turn off" (Task 7), and writing afterwards would put deleted entries back (Review Focus 5).

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/services/swBackgroundFetch.test.ts
// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SCRIPT = readFileSync("public/sw-background-fetch.js", "utf8");
const ORIGIN = "https://berliner-schnauze.wtf";

type Listener = (event: unknown) => void;

function setup() {
  const listeners = new Map<string, Listener>();
  const store = new Map<string, Response>();
  const cache = {
    put: vi.fn(async (req: Request, res: Response) => {
      store.set(new URL(req.url).pathname, res);
    }),
  };
  const client = { postMessage: vi.fn() };
  const self = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    clients: {
      matchAll: vi.fn().mockResolvedValue([client]),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
  };
  const caches = { open: vi.fn().mockResolvedValue(cache) };
  new Function("self", "caches", SCRIPT)(self, caches);

  async function fire(type: string, registration: object) {
    let done: Promise<unknown> = Promise.resolve();
    const updateUI = vi.fn().mockResolvedValue(undefined);
    listeners.get(type)?.({
      registration,
      updateUI,
      waitUntil: (p: Promise<unknown>) => (done = p),
    });
    await done;
    return { updateUI };
  }

  return { cache, caches, client, fire, self, store };
}

function record(path: string, response: Response | Promise<Response>) {
  return { request: new Request(ORIGIN + path), responseReady: Promise.resolve(response) };
}

function registration(id: string, records: ReturnType<typeof record>[]) {
  return { id, matchAll: vi.fn().mockResolvedValue(records) };
}

describe("sw-background-fetch.js", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("success: caches ok records with the version header and notifies clients", async () => {
    const reg = registration("offline-dictionary@9.9.9", [
      record("/wort/aasen", new Response("<h1>aasen</h1>", { status: 200 })),
      record("/wort/weg", new Response("gone", { status: 404 })),
    ]);
    const { updateUI } = await env.fire("backgroundfetchsuccess", reg);

    expect([...env.store.keys()]).toEqual(["/wort/aasen"]);
    expect(env.store.get("/wort/aasen")?.headers.get("x-offline-dictionary-version")).toBe("9.9.9");
    expect(await env.store.get("/wort/aasen")?.text()).toBe("<h1>aasen</h1>");
    expect(updateUI).toHaveBeenCalledWith({ title: "Offline-Wörterbuch bereit" });
    expect(env.client.postMessage).toHaveBeenCalledWith({
      result: "success",
      stored: 1,
      type: "offline-dictionary",
    });
  });

  it("skips redirected responses (unusable for navigations)", async () => {
    const redirected = new Response("x", { status: 200 });
    Object.defineProperty(redirected, "redirected", { value: true });
    const reg = registration("offline-dictionary@1.0.0", [record("/wort/a", redirected)]);
    await env.fire("backgroundfetchsuccess", reg);
    expect(env.store.size).toBe(0);
  });

  it("fail: still caches the successful records and reports fail", async () => {
    const reg = registration("offline-dictionary@1.0.0", [
      record("/wort/a", new Response("a", { status: 200 })),
      { request: new Request(ORIGIN + "/wort/b"), responseReady: Promise.reject(new Error("x")) },
    ]);
    await env.fire("backgroundfetchfail", reg);
    expect([...env.store.keys()]).toEqual(["/wort/a"]);
    expect(env.client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ result: "fail", stored: 1 }),
    );
  });

  it("abort: caches nothing, reports abort", async () => {
    const reg = registration("offline-dictionary@1.0.0", [
      record("/wort/a", new Response("a", { status: 200 })),
    ]);
    await env.fire("backgroundfetchabort", reg);
    expect(env.store.size).toBe(0);
    expect(reg.matchAll).not.toHaveBeenCalled();
    expect(env.client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ result: "abort" }),
    );
  });

  it("click: opens the cache settings", async () => {
    await env.fire("backgroundfetchclick", registration("offline-dictionary@1.0.0", []));
    expect(env.self.clients.openWindow).toHaveBeenCalledWith("/settings/cache");
  });

  it("ignores foreign background fetches", async () => {
    const reg = registration("something-else", [record("/x", new Response("x"))]);
    await env.fire("backgroundfetchsuccess", reg);
    expect(env.caches.open).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/services/swBackgroundFetch.test.ts`
Expected: FAIL (ENOENT for `public/sw-background-fetch.js`)

- [ ] **Step 3: Implement**

```js
// public/sw-background-fetch.js
// Imported into the Workbox-generated sw.js via `workbox.importScripts` (astro.config.mjs).
// Stores the pages of the opt-in offline dictionary downloaded by Background Fetch
// (started in src/services/offlineDictionary.ts) in the same "pages" cache the
// NetworkFirst navigation route reads from.
const PAGES_CACHE = "pages";
const BG_FETCH_PREFIX = "offline-dictionary@";
const VERSION_HEADER = "x-offline-dictionary-version";

const isOurs = (registration) => registration.id.startsWith(BG_FETCH_PREFIX);

async function storeRecords(registration) {
  const version = registration.id.slice(BG_FETCH_PREFIX.length);
  const cache = await caches.open(PAGES_CACHE);
  const records = await registration.matchAll();
  let stored = 0;
  // Sequential on purpose: ~3600 pages in parallel would hold hundreds of MB in memory.
  for (const record of records) {
    const response = await record.responseReady.catch(() => null);
    if (!response?.ok || response.redirected) continue;
    const headers = new Headers(response.headers);
    headers.set(VERSION_HEADER, version);
    await cache.put(
      record.request,
      new Response(await response.blob(), {
        headers,
        status: response.status,
        statusText: response.statusText,
      }),
    );
    stored++;
  }
  return stored;
}

async function notifyClients(result, stored) {
  const windows = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of windows) client.postMessage({ result, stored, type: "offline-dictionary" });
}

self.addEventListener("backgroundfetchsuccess", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(
    (async () => {
      const stored = await storeRecords(event.registration);
      await event.updateUI({ title: "Offline-Wörterbuch bereit" });
      await notifyClients("success", stored);
    })(),
  );
});

self.addEventListener("backgroundfetchfail", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(
    (async () => {
      const stored = await storeRecords(event.registration);
      await event.updateUI({ title: "Offline-Wörterbuch unvollständig" });
      await notifyClients("fail", stored);
    })(),
  );
});

// Aborts come from "cancel"/"disable" in the app — don't write pages the app is deleting.
self.addEventListener("backgroundfetchabort", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(notifyClients("abort", 0));
});

self.addEventListener("backgroundfetchclick", (event) => {
  if (!isOurs(event.registration)) return;
  event.waitUntil(self.clients.openWindow("/settings/cache"));
});
```

In `astro.config.mjs` → `workbox`, after `navigationPreload: true,`:

```js
        // Background Fetch handlers for the offline dictionary (public/sw-background-fetch.js).
        importScripts: ["sw-background-fetch.js"],
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/tests/unit/services/swBackgroundFetch.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Check the build**

Run: `E2E_WORD_LIMIT=50 pnpm build:local && grep -o 'importScripts("sw-background-fetch.js")' dist/sw.js && ls dist/sw-background-fetch.js`
Expected: both are found.

- [ ] **Step 6: Commit**

```bash
git add public/sw-background-fetch.js astro.config.mjs src/tests/unit/services/swBackgroundFetch.test.ts
git commit -m "feat(pwa): handle offline dictionary background fetches in the service worker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `offlineDictionary.ts` — core (in-page download, gates, lifecycle)

**Files:**

- Create/overwrite: `src/services/offlineDictionary.ts`
- Test: `src/tests/unit/services/offlineDictionary.test.ts`

**Interfaces:**

- Consumes: `$offlineDictionary`, `patchOfflineDictionary` (Task 1), `requestPersistentStorage` (Task 4), `trackEvent`.
- Produces (Task 7, 8, 10 rely on these):
  - `PAGES_CACHE = "pages"`, `VERSION_HEADER = "x-offline-dictionary-version"`, `AVG_PAGE_BYTES = 75_000`
  - `type DownloadState = "idle" | "waiting" | "running" | "paused" | "done" | "error"`
  - `type DownloadMode = "background-fetch" | "page"`
  - `interface OfflineDictionaryProgress { state: DownloadState; mode: DownloadMode | null; done: number; total: number; bytes: number }`
  - `$offlineDictionaryProgress: ReadableAtom<OfflineDictionaryProgress>`
  - `getWordUrls(): Promise<string[]>`
  - `getMissingUrls(urls: string[]): Promise<string[]>`
  - `canDownloadNow(manual: boolean): boolean`
  - `estimateDownloadBytes(): Promise<number>`
  - `startDownload(options?: { manual?: boolean }): Promise<void>`
  - `pauseDownload(): void`
  - `cancelDownload(): Promise<void>`
  - `enableOfflineDictionary(): Promise<void>`
  - `disableOfflineDictionary(): Promise<void>`
  - `resumeIfNeeded(): Promise<void>`

The Background Fetch path is added in Task 7. In this task, `startDownload` always uses the in-page path.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/services/offlineDictionary.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../../package.json";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@services/storagePersistence", () => ({
  requestPersistentStorage: vi.fn().mockResolvedValue("persisted"),
}));

const ORIGIN = "https://berliner-schnauze.wtf";
const SLUGS = ["aasen", "anmachen", "wa", "alex", "bulette", "icke"];

// ── fakes ─────────────────────────────────────────────────────────────────────

function createFakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const path = (r: RequestInfo | URL) =>
    new URL(typeof r === "string" ? r : r instanceof URL ? r.href : r.url, ORIGIN).pathname;
  const putError: { value: Error | null } = { value: null };
  const open = vi.fn(async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      delete: async (r: RequestInfo) => store.delete(path(r)),
      keys: async () => [...store.keys()].map((p) => new Request(ORIGIN + p)),
      match: async (r: RequestInfo) => store.get(path(r))?.clone(),
      put: async (r: RequestInfo, res: Response) => {
        if (putError.value) throw putError.value;
        store.set(path(r), res);
      },
    };
  });
  return { open, putError, stores };
}

function pageResponse(body = "<html></html>", status = 200) {
  return new Response(body, { headers: { "content-type": "text/html" }, status });
}

let fakeCaches: ReturnType<typeof createFakeCaches>;
let fetchMock: ReturnType<typeof vi.fn>;
let connection: (EventTarget & { saveData?: boolean; type?: string }) | undefined;

function setConnection(value: typeof connection) {
  connection = value;
  Object.defineProperty(navigator, "connection", { configurable: true, value });
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  fakeCaches = createFakeCaches();
  vi.stubGlobal("caches", fakeCaches);
  fetchMock = vi.fn(async (url: string) =>
    url === "/api/search/index.json"
      ? new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))))
      : pageResponse(`<h1>${url}</h1>`),
  );
  vi.stubGlobal("fetch", fetchMock);
  setConnection(undefined);
  setOnline(true);
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function load() {
  const mod = await import("@services/offlineDictionary");
  const settings = await import("@stores/pwaSettings.ts");
  return { ...mod, ...settings };
}

const pagesCache = () => fakeCaches.stores.get("pages") ?? new Map<string, Response>();

// ── tests ─────────────────────────────────────────────────────────────────────

describe("offlineDictionary — url list", () => {
  it("getWordUrls maps search index slugs to /wort/<slug>", async () => {
    const { getWordUrls } = await load();
    expect(await getWordUrls()).toEqual(SLUGS.map((s) => `/wort/${s}`));
  });

  it("getWordUrls throws on a failed index request", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    const { getWordUrls } = await load();
    await expect(getWordUrls()).rejects.toThrow("503");
  });

  it("getMissingUrls skips pages cached for the current version only", async () => {
    const { getMissingUrls } = await load();
    const cache = await caches.open("pages");
    await cache.put(
      "/wort/aasen",
      new Response("x", { headers: { "x-offline-dictionary-version": version } }),
    );
    await cache.put(
      "/wort/wa",
      new Response("x", { headers: { "x-offline-dictionary-version": "0.0.1" } }),
    );
    await cache.put("/wort/alex", new Response("visited, no header"));
    expect(await getMissingUrls(["/wort/aasen", "/wort/wa", "/wort/alex", "/wort/icke"])).toEqual([
      "/wort/wa",
      "/wort/alex",
      "/wort/icke",
    ]);
  });

  it("estimateDownloadBytes = missing pages × average page size", async () => {
    const { AVG_PAGE_BYTES, estimateDownloadBytes } = await load();
    expect(await estimateDownloadBytes()).toBe(SLUGS.length * AVG_PAGE_BYTES);
  });
});

describe("offlineDictionary — in-page download", () => {
  it("caches every page with the version header and marks the version synced", async () => {
    const { $offlineDictionary, $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });

    expect(pagesCache().size).toBe(SLUGS.length);
    expect(pagesCache().get("/wort/aasen")?.headers.get("x-offline-dictionary-version")).toBe(
      version,
    );
    expect($offlineDictionaryProgress.get()).toMatchObject({
      done: SLUGS.length,
      mode: "page",
      state: "done",
      total: SLUGS.length,
    });
    expect($offlineDictionaryProgress.get().bytes).toBeGreaterThan(0);
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });

  it("runs at most 4 page requests in parallel", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return pageResponse();
    });
    const { startDownload } = await load();
    await startDownload({ manual: true });
    expect(maxInFlight).toBe(4);
  });

  it("skips non-ok and redirected responses without failing the run", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      if (url === "/wort/wa") return pageResponse("", 404);
      if (url === "/wort/alex") {
        const res = pageResponse();
        Object.defineProperty(res, "redirected", { value: true });
        return res;
      }
      return pageResponse();
    });
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect(pagesCache().has("/wort/wa")).toBe(false);
    expect(pagesCache().has("/wort/alex")).toBe(false);
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("does not re-download pages already cached for this version", async () => {
    const cache = await caches.open("pages");
    await cache.put(
      "/wort/aasen",
      new Response("x", { headers: { "x-offline-dictionary-version": version } }),
    );
    const { startDownload } = await load();
    await startDownload({ manual: true });
    expect(fetchMock).not.toHaveBeenCalledWith("/wort/aasen", expect.anything());
  });

  it("dedupes concurrent startDownload calls", async () => {
    const { startDownload } = await load();
    await Promise.all([startDownload({ manual: true }), startDownload({ manual: true })]);
    expect(fetchMock.mock.calls.filter(([u]) => u === "/api/search/index.json")).toHaveLength(1);
  });

  it("storage full (QuotaExceededError) → state error, no retry", async () => {
    fakeCaches.putError.value = new DOMException("full", "QuotaExceededError");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { $offlineDictionary, $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("error");
    expect($offlineDictionary.get().syncedVersion).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("network loss mid-download → paused; online event resumes and completes", async () => {
    let failNext = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      if (failNext && url === "/wort/wa") {
        failNext = false;
        setOnline(false);
        throw new TypeError("Failed to fetch");
      }
      return pageResponse();
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload();
    expect($offlineDictionaryProgress.get().state).toBe("paused");

    setOnline(true);
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
    expect(pagesCache().size).toBe(SLUGS.length);
  });
});

describe("offlineDictionary — gates", () => {
  it("wifiOnly on cellular → waiting, no requests; wifi change starts the download", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("waiting");
    expect(fetchMock).not.toHaveBeenCalled();

    connection!.type = "wifi";
    connection!.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
  });

  it("wifiOnly off → downloads on cellular", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: false });
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("no connection.type support → no wifi gate", async () => {
    const { canDownloadNow, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ wifiOnly: true });
    expect(canDownloadNow(false)).toBe(true);
  });

  it("saveData blocks automatic starts but not manual ones", async () => {
    setConnection(Object.assign(new EventTarget(), { saveData: true }));
    const { canDownloadNow } = await load();
    expect(canDownloadNow(false)).toBe(false);
    expect(canDownloadNow(true)).toBe(true);
  });
});

describe("offlineDictionary — pause / cancel", () => {
  function slowPages() {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => resolve(pageResponse()), 50);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });
  }

  it("pauseDownload stops the run; online/connection change does not auto-resume", async () => {
    slowPages();
    setConnection(Object.assign(new EventTarget(), { type: "wifi" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, pauseDownload, startDownload } =
      await load();
    patchOfflineDictionary({ enabled: true });
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    pauseDownload();
    await run;
    expect($offlineDictionaryProgress.get().state).toBe("paused");

    const callsBefore = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("online"));
    connection!.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect($offlineDictionaryProgress.get().state).toBe("paused");
  });

  it("a manual start after pause resumes", async () => {
    const { $offlineDictionaryProgress, pauseDownload, startDownload } = await load();
    pauseDownload();
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("cancelDownload resets progress to idle", async () => {
    slowPages();
    const { $offlineDictionaryProgress, cancelDownload, startDownload } = await load();
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    await cancelDownload();
    await run;
    expect($offlineDictionaryProgress.get()).toMatchObject({ done: 0, state: "idle", total: 0 });
  });
});

describe("offlineDictionary — lifecycle", () => {
  it("enable: persists setting, requests persistent storage, downloads", async () => {
    const { $offlineDictionary, $offlineDictionaryProgress, enableOfflineDictionary } =
      await load();
    const { requestPersistentStorage } = await import("@services/storagePersistence");
    await enableOfflineDictionary();
    expect($offlineDictionary.get().enabled).toBe(true);
    expect(requestPersistentStorage).toHaveBeenCalledOnce();
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("disable: removes /wort/* from pages, keeps other pages, resets settings", async () => {
    const cache = await caches.open("pages");
    await cache.put("/wort/aasen", new Response("x"));
    await cache.put("/magazin/post", new Response("x"));
    const { $offlineDictionary, disableOfflineDictionary, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ enabled: true, syncedVersion: version });
    await disableOfflineDictionary();
    expect([...pagesCache().keys()]).toEqual(["/magazin/post"]);
    expect($offlineDictionary.get()).toMatchObject({ enabled: false, syncedVersion: null });
  });

  it("resumeIfNeeded: no-op when disabled", async () => {
    const { resumeIfNeeded } = await load();
    await resumeIfNeeded();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resumeIfNeeded: no-op when synced for the current version", async () => {
    const { patchOfflineDictionary, resumeIfNeeded } = await load();
    patchOfflineDictionary({ enabled: true, syncedVersion: version });
    await resumeIfNeeded();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resumeIfNeeded: re-syncs after an app update", async () => {
    const { $offlineDictionary, patchOfflineDictionary, resumeIfNeeded } = await load();
    patchOfflineDictionary({ enabled: true, syncedVersion: "0.0.1" });
    await resumeIfNeeded();
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/services/offlineDictionary.test.ts`
Expected: FAIL (the exports are missing, the stub from Task 3 only has `resumeIfNeeded`).

- [ ] **Step 3: Implement**

```ts
// src/services/offlineDictionary.ts
import { requestPersistentStorage } from "@services/storagePersistence";
import { $offlineDictionary, patchOfflineDictionary } from "@stores/pwaSettings.ts";
import { trackEvent } from "@utils/analytics";
import { atom } from "nanostores";

import { version } from "../../package.json";

/** Same cache the NetworkFirst navigation route in astro.config.mjs reads from. */
export const PAGES_CACHE = "pages";
/** Marks a cached page as downloaded by the offline dictionary for a given app version. */
export const VERSION_HEADER = "x-offline-dictionary-version";
export const AVG_PAGE_BYTES = 75_000;
const SEARCH_INDEX_URL = "/api/search/index.json";
const CONCURRENCY = 4;

export type DownloadState = "idle" | "waiting" | "running" | "paused" | "done" | "error";
export type DownloadMode = "background-fetch" | "page";

export interface OfflineDictionaryProgress {
  bytes: number;
  done: number;
  mode: DownloadMode | null;
  state: DownloadState;
  total: number;
}

const IDLE: OfflineDictionaryProgress = { bytes: 0, done: 0, mode: null, state: "idle", total: 0 };

export const $offlineDictionaryProgress = atom<OfflineDictionaryProgress>(IDLE);

const setProgress = (patch: Partial<OfflineDictionaryProgress>): void =>
  $offlineDictionaryProgress.set({ ...$offlineDictionaryProgress.get(), ...patch });

// Network Information API: Chromium only, hence optional everywhere.
type Connection = EventTarget & { saveData?: boolean; type?: string };
const getConnection = (): Connection | undefined =>
  (navigator as Navigator & { connection?: Connection }).connection;

let controller: AbortController | null = null;
/** Set by pause/cancel so runDownload doesn't overwrite the state they chose. */
let stopRequested = false;
let running: Promise<void> | null = null;
let pausedByUser = false;
let listenersAttached = false;

export function canDownloadNow(manual: boolean): boolean {
  const connection = getConnection();
  if (!manual && connection?.saveData) return false;
  if (!$offlineDictionary.get().wifiOnly || connection?.type === undefined) return true;
  return connection.type === "wifi" || connection.type === "ethernet";
}

export async function getWordUrls(): Promise<string[]> {
  const response = await fetch(SEARCH_INDEX_URL);
  if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
  const entries = (await response.json()) as { slug: string }[];
  return entries.map(({ slug }) => `/wort/${slug}`);
}

export async function getMissingUrls(urls: string[]): Promise<string[]> {
  const cache = await caches.open(PAGES_CACHE);
  const synced = await Promise.all(
    urls.map(async (url) => (await cache.match(url))?.headers.get(VERSION_HEADER) === version),
  );
  return urls.filter((_, i) => !synced[i]);
}

export async function estimateDownloadBytes(): Promise<number> {
  return (await getMissingUrls(await getWordUrls())).length * AVG_PAGE_BYTES;
}

async function downloadInPage(urls: string[]): Promise<void> {
  controller = new AbortController();
  const { signal } = controller;
  const cache = await caches.open(PAGES_CACHE);
  const queue = [...urls];
  setProgress({ mode: "page", state: "running" });

  const worker = async (): Promise<void> => {
    for (let url = queue.shift(); url && !signal.aborted; url = queue.shift()) {
      const response = await fetch(url, { signal });
      const progress = $offlineDictionaryProgress.get();
      // A deleted word (404) or a redirect must not fail the whole run; redirected
      // responses can't answer navigations, so they're never cached.
      if (!response.ok || response.redirected) {
        setProgress({ done: progress.done + 1 });
        continue;
      }
      const body = await response.blob();
      const headers = new Headers(response.headers);
      headers.set(VERSION_HEADER, version);
      await cache.put(
        url,
        new Response(body, { headers, status: response.status, statusText: response.statusText }),
      );
      const latest = $offlineDictionaryProgress.get();
      setProgress({ bytes: latest.bytes + body.size, done: latest.done + 1 });
    }
  };

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    // After the first failure the sibling workers must stop too, or they keep writing
    // while a resumed run starts.
    controller.abort();
  }
}

function markDone(): void {
  controller = null;
  patchOfflineDictionary({ syncedVersion: version });
  setProgress({ done: $offlineDictionaryProgress.get().total, state: "done" });
  trackEvent("App", "Offline dictionary complete", "PWA");
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("online", () => void resumeIfNeeded());
  getConnection()?.addEventListener("change", () => void resumeIfNeeded());
}

async function runDownload(manual: boolean): Promise<void> {
  attachListeners();
  stopRequested = false;
  if (manual) pausedByUser = false;
  if (!canDownloadNow(manual)) {
    setProgress({ state: "waiting" });
    return;
  }
  try {
    const urls = await getWordUrls();
    const missing = await getMissingUrls(urls);
    setProgress({ bytes: 0, done: urls.length - missing.length, total: urls.length });
    if (missing.length > 0) await downloadInPage(missing);
    if (stopRequested) return;
    markDone();
  } catch (err) {
    controller = null;
    // pause/cancel already set the state
    if (stopRequested) return;
    if (!navigator.onLine) {
      setProgress({ state: "paused" });
      return;
    }
    setProgress({ state: "error" });
    console.error("[offlineDictionary] Download failed:", err);
    trackEvent("App", "Offline dictionary error", "PWA");
  }
}

export function startDownload({ manual = false }: { manual?: boolean } = {}): Promise<void> {
  running ??= runDownload(manual).finally(() => {
    running = null;
  });
  return running;
}

export function pauseDownload(): void {
  pausedByUser = true;
  stopRequested = true;
  controller?.abort();
  setProgress({ state: "paused" });
}

export async function cancelDownload(): Promise<void> {
  stopRequested = true;
  controller?.abort();
  controller = null;
  $offlineDictionaryProgress.set(IDLE);
}

export async function enableOfflineDictionary(): Promise<void> {
  patchOfflineDictionary({ enabled: true });
  trackEvent("App", "Offline dictionary enabled", "PWA");
  await requestPersistentStorage();
  await startDownload({ manual: true });
}

export async function disableOfflineDictionary(): Promise<void> {
  await cancelDownload();
  patchOfflineDictionary({ enabled: false, syncedVersion: null });
  const cache = await caches.open(PAGES_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.filter((r) => new URL(r.url).pathname.startsWith("/wort/")).map((r) => cache.delete(r)),
  );
  trackEvent("App", "Offline dictionary disabled", "PWA");
}

/** App start / network or connection change: continue or re-sync if the dictionary needs it. */
export async function resumeIfNeeded(): Promise<void> {
  const { enabled, syncedVersion } = $offlineDictionary.get();
  if (!enabled || pausedByUser || syncedVersion === version) return;
  await startDownload();
}
```

Note on the test "a manual start after pause resumes": `pauseDownload()` without a running download only sets `pausedByUser`. `startDownload({ manual: true })` resets it.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/tests/unit/services/offlineDictionary.test.ts`
Expected: PASS. If a test around `vi.waitFor` is flaky, raise the `timeout` option (`vi.waitFor(fn, { timeout: 2000 })`) instead of weakening the assertion.

- [ ] **Step 5: Run the `pwa.ts` tests again (they mock the module, the real one now exists)**

Run: `pnpm vitest run src/tests/unit/services/pwa.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/offlineDictionary.ts src/tests/unit/services/offlineDictionary.test.ts
git commit -m "feat(pwa): add opt-in offline dictionary download

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `offlineDictionary.ts` — Background Fetch path

**Files:**

- Modify: `src/services/offlineDictionary.ts`
- Test: `src/tests/unit/services/offlineDictionary.test.ts` (new describe block)

**Interfaces:**

- Consumes: SW messages from Task 5 (`{ type: "offline-dictionary", result, stored }`), Task 6 internals (`runDownload`, `markDone`, `setProgress`, `attachListeners`, `cancelDownload`).
- Produces: `BG_FETCH_ID = \`offline-dictionary@${version}\`` (exported). The public API from Task 6 is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/tests/unit/services/offlineDictionary.test.ts`:

```ts
describe("offlineDictionary — Background Fetch", () => {
  type FakeBgFetch = EventTarget & {
    abort: ReturnType<typeof vi.fn>;
    downloaded: number;
    downloadTotal: number;
    id: string;
  };

  function makeBgFetch(id: string): FakeBgFetch {
    return Object.assign(new EventTarget(), {
      abort: vi.fn().mockResolvedValue(true),
      downloaded: 0,
      downloadTotal: 0,
      id,
    });
  }

  function installServiceWorker(manager: object) {
    const sw = Object.assign(new EventTarget(), {
      getRegistration: vi.fn().mockResolvedValue({ backgroundFetch: manager }),
    });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: sw });
    return sw;
  }

  function makeManager(overrides: Record<string, unknown> = {}) {
    const bgFetch = makeBgFetch(`offline-dictionary@${version}`);
    const manager = {
      fetch: vi.fn().mockResolvedValue(bgFetch),
      get: vi.fn().mockResolvedValue(undefined),
      getIds: vi.fn().mockResolvedValue([]),
      ...overrides,
    };
    return { bgFetch, manager };
  }

  const pageFetches = () => fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/wort/"));

  it("starts a background fetch with the missing urls instead of fetching in the page", async () => {
    const { manager } = makeManager();
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, BG_FETCH_ID, startDownload } = await load();
    await startDownload({ manual: true });

    expect(manager.fetch).toHaveBeenCalledWith(
      BG_FETCH_ID,
      SLUGS.map((s) => `/wort/${s}`),
      expect.objectContaining({ title: "Berliner Schnauze – Offline-Wörterbuch" }),
    );
    // downloadTotal must not be passed: Chrome fails the fetch if the estimate is exceeded
    expect(manager.fetch.mock.calls[0][2]).not.toHaveProperty("downloadTotal");
    expect(pageFetches()).toHaveLength(0);
    expect($offlineDictionaryProgress.get()).toMatchObject({
      mode: "background-fetch",
      state: "running",
    });
  });

  it("progress events update bytes and estimated done", async () => {
    const { bgFetch, manager } = makeManager();
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, AVG_PAGE_BYTES, startDownload } = await load();
    await startDownload({ manual: true });

    bgFetch.downloaded = AVG_PAGE_BYTES * 2;
    bgFetch.dispatchEvent(new Event("progress"));
    expect($offlineDictionaryProgress.get()).toMatchObject({ bytes: AVG_PAGE_BYTES * 2, done: 2 });
  });

  it("SW success message → done and synced", async () => {
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const { $offlineDictionary, $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });

    sw.dispatchEvent(
      new MessageEvent("message", {
        data: { result: "success", stored: SLUGS.length, type: "offline-dictionary" },
      }),
    );
    expect($offlineDictionaryProgress.get().state).toBe("done");
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });

  it("SW fail message → error", async () => {
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    sw.dispatchEvent(
      new MessageEvent("message", {
        data: { result: "fail", stored: 1, type: "offline-dictionary" },
      }),
    );
    expect($offlineDictionaryProgress.get().state).toBe("error");
  });

  it("falls back to the in-page download when backgroundFetch.fetch rejects", async () => {
    const { manager } = makeManager({ fetch: vi.fn().mockRejectedValue(new TypeError("quota")) });
    installServiceWorker(manager);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect(pageFetches()).toHaveLength(SLUGS.length);
    expect($offlineDictionaryProgress.get()).toMatchObject({ mode: "page", state: "done" });
  });

  it("re-attaches to a running fetch with the same id instead of starting a new one", async () => {
    const existing = makeBgFetch(`offline-dictionary@${version}`);
    const { manager } = makeManager({ get: vi.fn().mockResolvedValue(existing) });
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload();
    expect(manager.fetch).not.toHaveBeenCalled();
    expect($offlineDictionaryProgress.get()).toMatchObject({
      mode: "background-fetch",
      state: "running",
    });
  });

  it("aborts a stale fetch from an older app version", async () => {
    const stale = makeBgFetch("offline-dictionary@0.0.1");
    const { manager } = makeManager({
      get: vi.fn(async (id: string) => (id === stale.id ? stale : undefined)),
      getIds: vi.fn().mockResolvedValue([stale.id]),
    });
    installServiceWorker(manager);
    const { startDownload } = await load();
    await startDownload({ manual: true });
    expect(stale.abort).toHaveBeenCalledOnce();
    expect(manager.fetch).toHaveBeenCalledOnce();
  });

  it("disable during a running background fetch aborts it before deleting pages", async () => {
    const { bgFetch, manager } = makeManager();
    installServiceWorker(manager);
    const { disableOfflineDictionary, startDownload } = await load();
    await startDownload({ manual: true });
    await disableOfflineDictionary();
    expect(bgFetch.abort).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/services/offlineDictionary.test.ts`
Expected: FAIL in the "Background Fetch" block.

- [ ] **Step 3: Implement**

Add to `src/services/offlineDictionary.ts`:

After the constants:

```ts
const BG_FETCH_PREFIX = "offline-dictionary@";
/** Carries the app version so public/sw-background-fetch.js can stamp VERSION_HEADER. */
export const BG_FETCH_ID = `${BG_FETCH_PREFIX}${version}`;

// Background Fetch API: Chromium only, not in lib.dom — typed locally.
type BackgroundFetchRegistrationLike = EventTarget & {
  abort(): Promise<boolean>;
  downloaded: number;
  id: string;
};
type BackgroundFetchManagerLike = {
  fetch(
    id: string,
    requests: string[],
    options: { icons: { sizes: string; src: string; type: string }[]; title: string },
  ): Promise<BackgroundFetchRegistrationLike>;
  get(id: string): Promise<BackgroundFetchRegistrationLike | undefined>;
  getIds(): Promise<string[]>;
};

async function getBackgroundFetchManager(): Promise<BackgroundFetchManagerLike | undefined> {
  const registration = await navigator.serviceWorker?.getRegistration();
  return (registration as { backgroundFetch?: BackgroundFetchManagerLike } | undefined)
    ?.backgroundFetch;
}

let activeBgFetch: BackgroundFetchRegistrationLike | null = null;
```

New functions (above `runDownload`):

```ts
function followBackgroundFetch(bgFetch: BackgroundFetchRegistrationLike, missing: number): void {
  activeBgFetch = bgFetch;
  const alreadyDone = $offlineDictionaryProgress.get().done;
  setProgress({ mode: "background-fetch", state: "running" });
  // No per-request progress in the API — estimate done from bytes.
  bgFetch.addEventListener("progress", () => {
    setProgress({
      bytes: bgFetch.downloaded,
      done: alreadyDone + Math.min(missing, Math.floor(bgFetch.downloaded / AVG_PAGE_BYTES)),
    });
  });
}

/** Returns true when a Background Fetch now owns the download. */
async function tryBackgroundFetch(missing: string[]): Promise<boolean> {
  const manager = await getBackgroundFetchManager();
  if (!manager) return false;

  for (const id of await manager.getIds()) {
    if (id.startsWith(BG_FETCH_PREFIX) && id !== BG_FETCH_ID)
      await (await manager.get(id))?.abort();
  }

  const existing = await manager.get(BG_FETCH_ID);
  if (existing) {
    followBackgroundFetch(existing, missing.length);
    return true;
  }

  try {
    const bgFetch = await manager.fetch(BG_FETCH_ID, missing, {
      icons: [{ sizes: "192x192", src: "/favicons/android-chrome-192x192.png", type: "image/png" }],
      title: "Berliner Schnauze – Offline-Wörterbuch",
    });
    followBackgroundFetch(bgFetch, missing.length);
    return true;
  } catch (err) {
    console.warn("[offlineDictionary] Background Fetch unavailable, downloading in page:", err);
    return false;
  }
}

function onServiceWorkerMessage(event: MessageEvent<{ result?: string; type?: string }>): void {
  if (event.data?.type !== "offline-dictionary" || !activeBgFetch) return;
  activeBgFetch = null;
  if (event.data.result === "success") markDone();
  else if (event.data.result === "fail") {
    setProgress({ state: "error" });
    trackEvent("App", "Offline dictionary error", "PWA");
  }
  // "abort" comes from cancelDownload(), which already reset the state.
}
```

Changes to existing functions:

`attachListeners()`: add a line:

```ts
navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
```

`runDownload()`: in the `try` block, replace

```ts
if (missing.length > 0) await downloadInPage(missing);
```

with

```ts
if (missing.length > 0) {
  if (await tryBackgroundFetch(missing)) return; // completion arrives via SW message
  await downloadInPage(missing);
}
```

`startDownload()`: the first line in the function:

```ts
if (activeBgFetch) return Promise.resolve();
```

`cancelDownload()`:

```ts
export async function cancelDownload(): Promise<void> {
  stopRequested = true;
  controller?.abort();
  controller = null;
  const bgFetch = activeBgFetch;
  activeBgFetch = null;
  await bgFetch?.abort();
  $offlineDictionaryProgress.set(IDLE);
}
```

`markDone()`: add `activeBgFetch = null;`.

`pauseDownload()` stays in-page only (the UI hides "Pause" in `background-fetch` mode).

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/tests/unit/services/offlineDictionary.test.ts`
Expected: PASS (all blocks)

- [ ] **Step 5: Commit**

```bash
git add src/services/offlineDictionary.ts src/tests/unit/services/offlineDictionary.test.ts
git commit -m "feat(pwa): download the offline dictionary via background fetch where supported

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `useCacheStorage` — bucket name + clearing switches the dictionary off

**Files:**

- Modify: `src/composable/useCacheStorage.ts` (`BUCKET_NAME_MAP` around line 54, `clearBucket` around line 277, `clearAll` around line 291)
- Test: `src/tests/unit/composable/useCacheStorage.test.ts`

**Interfaces:**

- Consumes: `cancelDownload` from `@services/offlineDictionary` (Task 6/7), `patchOfflineDictionary` (Task 1).

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/composable/useCacheStorage.test.ts`, add to the mocks at the top:

```ts
vi.mock("@services/offlineDictionary", () => ({ cancelDownload: vi.fn() }));
```

In `describe("getBucketDisplayName")`:

```ts
it("maps the pages runtime cache", () => {
  expect(getBucketDisplayName("pages")).toBe("Besuchte Seiten");
});
```

New describe block at the end of the file:

```ts
describe("useCacheStorage — clearing turns off the offline dictionary", () => {
  beforeEach(async () => {
    localStorage.clear();
    const { patchOfflineDictionary } = await import("@stores/pwaSettings.ts");
    patchOfflineDictionary({ enabled: true, syncedVersion: "1.0.0" });
    vi.stubGlobal(
      "caches",
      makeMockCacheStorage({
        "api-search-index": [{ size: 1, url: "https://example.com/a" }],
        pages: [{ size: 1, url: "https://example.com/wort/aasen" }],
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clearAll disables the dictionary and cancels a running download", async () => {
    const { $offlineDictionary } = await import("@stores/pwaSettings.ts");
    const { cancelDownload } = await import("@services/offlineDictionary");
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearAll();
    expect($offlineDictionary.get()).toMatchObject({ enabled: false, syncedVersion: null });
    expect(cancelDownload).toHaveBeenCalled();
    unmount();
  });

  it("clearBucket('pages') disables the dictionary", async () => {
    const { $offlineDictionary } = await import("@stores/pwaSettings.ts");
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearBucket("pages");
    expect($offlineDictionary.get().enabled).toBe(false);
    unmount();
  });

  it("clearing another bucket keeps the dictionary on", async () => {
    const { $offlineDictionary } = await import("@stores/pwaSettings.ts");
    const { result, unmount } = withSetup(() => useCacheStorage());
    await result.clearBucket("api-search-index");
    expect($offlineDictionary.get().enabled).toBe(true);
    unmount();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts`
Expected: FAIL in the 4 new tests.

- [ ] **Step 3: Implement**

In `src/composable/useCacheStorage.ts`:

Imports:

```ts
import { cancelDownload } from "@services/offlineDictionary";
import { patchOfflineDictionary } from "@stores/pwaSettings.ts";
```

`BUCKET_NAME_MAP` gets:

```ts
  pages: "Besuchte Seiten",
```

New helper inside `useCacheStorage()` above `clearBucket`:

```ts
// The offline dictionary lives in "pages". Clearing it means "free the space" — turn the
// dictionary off instead of silently re-downloading ~450 MB on the next app start.
async function turnOffOfflineDictionary(): Promise<void> {
  await cancelDownload();
  patchOfflineDictionary({ enabled: false, syncedVersion: null });
}
```

In `clearBucket(name)`, directly after the successful `await caches.delete(name);` (still inside `try`, or right after the try/catch before `loadCaches`):

```ts
if (name === "pages") await turnOffOfflineDictionary();
```

In `clearAll()` after the `Promise.allSettled(...)` line:

```ts
await turnOffOfflineDictionary();
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run src/tests/unit/composable/useCacheStorage.test.ts`
Expected: PASS (old + new)

- [ ] **Step 5: Commit**

```bash
git add src/composable/useCacheStorage.ts src/tests/unit/composable/useCacheStorage.test.ts
git commit -m "feat(pwa): label the pages cache and turn off the offline dictionary when it is cleared

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: UI `AppSettingsUpdates.vue` (S3) — **with `/impeccable`**

**Files:**

- Create: `src/components/AppSettingsUpdates.vue`
- Create: `src/styles/components/_app-settings-updates.scss`
- Modify: `src/components/AppSettings.vue`
- Test: `src/tests/unit/components/AppSettingsUpdates.test.ts`, `src/tests/unit/components/AppSettings.test.ts` (stub if needed)

**Interfaces:**

- Consumes: `$updateMode`, `UpdateMode` (Task 1).

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/components/AppSettingsUpdates.test.ts
import AppSettingsUpdates from "@components/AppSettingsUpdates.vue";
import { $updateMode } from "@stores/pwaSettings.ts";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

describe("AppSettingsUpdates.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $updateMode.set("prompt");
  });

  it("renders a fieldset with the three update modes", () => {
    const wrapper = mount(AppSettingsUpdates);
    expect(wrapper.find("fieldset legend").text()).toContain("App-Updates");
    expect(wrapper.findAll("input[type=radio]")).toHaveLength(3);
    for (const label of ["Nachfragen", "Automatisch", "Beim nächsten Start"]) {
      expect(wrapper.text()).toContain(label);
    }
  });

  it.each([
    ["prompt", 0],
    ["auto", 1],
    ["next-start", 2],
  ] as const)("checks the radio for %s", (mode, index) => {
    $updateMode.set(mode);
    const radios = mount(AppSettingsUpdates).findAll<HTMLInputElement>("input[type=radio]");
    radios.forEach((r, i) => expect(r.element.checked).toBe(i === index));
  });

  it("selecting a mode updates the store and tracks it", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(AppSettingsUpdates);
    await wrapper.findAll("input[type=radio]")[1].setValue(true);
    expect($updateMode.get()).toBe("auto");
    expect(trackEvent).toHaveBeenCalledWith("App", "Update mode: auto", "Settings");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/components/AppSettingsUpdates.test.ts`
Expected: FAIL (component missing)

- [ ] **Step 3: Implement the functional base**

```vue
<!-- src/components/AppSettingsUpdates.vue -->
<template>
  <section class="c-app-settings__card">
    <fieldset class="c-app-settings-updates">
      <legend class="c-app-settings__card-title">
        <component :is="RefreshCwIcon" class="c-app-settings__card-title-icon" />
        App-Updates
      </legend>
      <label v-for="mode in MODES" :key="mode.value" class="c-app-settings-updates__option">
        <input
          class="c-app-settings-updates__input"
          type="radio"
          name="app-update-mode"
          :checked="updateMode === mode.value"
          @change="selectMode(mode.value)"
        />
        <span class="c-app-settings-updates__label">{{ mode.label }}</span>
        <span class="c-app-settings-updates__hint">{{ mode.hint }}</span>
      </label>
    </fieldset>
  </section>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $updateMode, type UpdateMode } from "@stores/pwaSettings.ts";
import { trackEvent } from "@utils/analytics";
import { defineAsyncComponent } from "vue";

const RefreshCwIcon = defineAsyncComponent(() => import("virtual:icons/lucide/refresh-cw"));

const MODES: { hint: string; label: string; value: UpdateMode }[] = [
  { hint: "Wir sagen Bescheid, sobald was Neues da ist.", label: "Nachfragen", value: "prompt" },
  {
    hint: "Beim nächsten Seitenwechsel neu laden – nie mittendrin.",
    label: "Automatisch",
    value: "auto",
  },
  {
    hint: "Keen Hinweis. Die neue Version kommt beim nächsten Öffnen.",
    label: "Beim nächsten Start",
    value: "next-start",
  },
];

const updateMode = useStore($updateMode);

function selectMode(mode: UpdateMode): void {
  $updateMode.set(mode);
  trackEvent("App", `Update mode: ${mode}`, "Settings");
}
</script>

<style lang="scss">
@use "@styles/components/app-settings-updates";
</style>
```

`src/styles/components/_app-settings-updates.scss`: start with an empty file containing a `.c-app-settings-updates {}` block. It gets filled in Step 5.

In `src/components/AppSettings.vue`, after `<AppSettingsNotifications />`:

```vue
<AppSettingsUpdates />
```

and in the script:

```ts
const AppSettingsUpdates = defineAsyncComponent(() => import("@components/AppSettingsUpdates.vue"));
```

If `src/tests/unit/components/AppSettings.test.ts` stubs the other cards via `config.global.stubs`, add `AppSettingsUpdates` there the same way.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run src/tests/unit/components/AppSettingsUpdates.test.ts src/tests/unit/components/AppSettings.test.ts`
Expected: PASS

- [ ] **Step 5: Visual design with the `impeccable` skill**

Invoke the `impeccable` skill with this brief:

> Design `AppSettingsUpdates.vue` (/settings, card "App-Updates"): a native radio fieldset with 3 options (label + one-line hint). Visually consistent with the neighboring cards `AppSettingsTheme` (ColorModePicker, `src/styles/components/_color-mode-picker.scss`) and `AppSettingsNotifications`. Rules: DESIGN.md (Postcard Rule, currywurst orange for the active state, Paper Lift, 4px radius on the theme selector), BEMIT `.c-app-settings-updates__*`, styles only in `src/styles/components/_app-settings-updates.scss`, breakpoints only via `mx.breakpoint` or a container query, visible focus, dark mode. Copy may get more cheeky within the voice in PRODUCT.md, but the labels "Nachfragen" / "Automatisch" / "Beim nächsten Start" and the legend "App-Updates" stay (the tests depend on them). The markup structure may change as long as it stays a fieldset with 3 `input[type=radio]`.

After impeccable: run the test from Step 4 again (PASS), plus `pnpm lint`.

- [ ] **Step 6: Visual check in the browser**

Start the dev server with `NO_DEV_TOOLBAR=1` (see CLAUDE.md) if it is not running without the toolbar. Open `/settings`, check light/dark mode, 375 px and desktop width, and keyboard navigation (arrow keys between the radios). Leave the dev server running.

- [ ] **Step 7: Commit**

```bash
git add src/components/AppSettingsUpdates.vue src/styles/components/_app-settings-updates.scss src/components/AppSettings.vue src/tests/unit/components/AppSettingsUpdates.test.ts src/tests/unit/components/AppSettings.test.ts
git commit -m "feat(pwa): let users choose how app updates are applied

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: UI `PwaOfflineDictionary.vue` (S1/S2/S4) — **with `/impeccable`**

**Files:**

- Create: `src/components/PwaOfflineDictionary.vue`
- Create: `src/styles/components/_pwa-offline-dictionary.scss`
- Modify: `src/components/PwaCacheOverview.vue`
- Test: `src/tests/unit/components/PwaOfflineDictionary.test.ts`, `src/tests/unit/components/PwaCacheOverview.test.ts` (stub)

**Interfaces:**

- Consumes: `$offlineDictionary`, `patchOfflineDictionary` (Task 1); `$offlineDictionaryProgress`, `enableOfflineDictionary`, `disableOfflineDictionary`, `startDownload`, `pauseDownload`, `cancelDownload`, `resumeIfNeeded`, `estimateDownloadBytes` (Task 6/7); `getPersistState`, `requestPersistentStorage`, `PersistState` (Task 4); `formatBytes` from `@composables/useCacheStorage`; `useNetwork` from `@vueuse/core`.
- Produces: event `changed` (after toggling and when the download finishes). `PwaCacheOverview` reacts with `loadCaches()`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/components/PwaOfflineDictionary.test.ts
import PwaOfflineDictionary from "@components/PwaOfflineDictionary.vue";
import { $offlineDictionaryProgress } from "@services/offlineDictionary";
import { $offlineDictionary } from "@stores/pwaSettings.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { version } from "../../../../package.json";

const networkType = ref<string | undefined>(undefined);
vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vueuse/core")>()),
  useNetwork: () => ({ type: networkType }),
}));
vi.mock("@services/storagePersistence", () => ({
  getPersistState: vi.fn().mockResolvedValue("not-persisted"),
  requestPersistentStorage: vi.fn().mockResolvedValue("persisted"),
}));
vi.mock("@services/offlineDictionary", async () => {
  const { atom } = await import("nanostores");
  return {
    $offlineDictionaryProgress: atom({ bytes: 0, done: 0, mode: null, state: "idle", total: 0 }),
    cancelDownload: vi.fn(),
    disableOfflineDictionary: vi.fn(),
    enableOfflineDictionary: vi.fn(),
    estimateDownloadBytes: vi.fn().mockResolvedValue(270_000_000),
    pauseDownload: vi.fn(),
    resumeIfNeeded: vi.fn(),
    startDownload: vi.fn(),
  };
});

const IDLE = { bytes: 0, done: 0, mode: null, state: "idle", total: 0 } as const;

async function mountIt() {
  const wrapper = mount(PwaOfflineDictionary);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  networkType.value = undefined;
  $offlineDictionary.set({ enabled: false, syncedVersion: null, wifiOnly: true });
  $offlineDictionaryProgress.set({ ...IDLE });
});

describe("PwaOfflineDictionary.vue", () => {
  it("shows the size estimate while disabled", async () => {
    const wrapper = await mountIt();
    expect(wrapper.text()).toContain("270 MB");
  });

  it("toggling on enables the dictionary and emits changed", async () => {
    const { enableOfflineDictionary } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-toggle]").setValue(true);
    await flushPromises();
    expect(enableOfflineDictionary).toHaveBeenCalledOnce();
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("toggling off disables the dictionary", async () => {
    $offlineDictionary.set({ enabled: true, syncedVersion: version, wifiOnly: true });
    const { disableOfflineDictionary } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-toggle]").setValue(false);
    await flushPromises();
    expect(disableOfflineDictionary).toHaveBeenCalledOnce();
  });

  it("hides the wifi toggle when the connection type is unknown", async () => {
    $offlineDictionary.set({ enabled: true, syncedVersion: null, wifiOnly: true });
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-wifi]").exists()).toBe(false);
  });

  it("shows the wifi toggle when supported; turning it off resumes", async () => {
    networkType.value = "cellular";
    $offlineDictionary.set({ enabled: true, syncedVersion: null, wifiOnly: true });
    const { resumeIfNeeded } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-wifi]").setValue(false);
    expect($offlineDictionary.get().wifiOnly).toBe(false);
    expect(resumeIfNeeded).toHaveBeenCalled();
  });

  it("in-page running download: shows count, pause and cancel", async () => {
    $offlineDictionary.set({ enabled: true, syncedVersion: null, wifiOnly: true });
    $offlineDictionaryProgress.set({
      bytes: 1_500_000,
      done: 20,
      mode: "page",
      state: "running",
      total: 100,
    });
    const { pauseDownload } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    expect(wrapper.text()).toContain("20 / 100");
    expect(wrapper.find("progress").attributes("value")).toBe("20");
    await wrapper.find("[data-testid=offline-dictionary-pause]").trigger("click");
    expect(pauseDownload).toHaveBeenCalledOnce();
    expect(wrapper.find("[data-testid=offline-dictionary-cancel]").exists()).toBe(true);
  });

  it("background-fetch download: no pause button, hint that it keeps running", async () => {
    $offlineDictionary.set({ enabled: true, syncedVersion: null, wifiOnly: true });
    $offlineDictionaryProgress.set({
      bytes: 1_500_000,
      done: 20,
      mode: "background-fetch",
      state: "running",
      total: 100,
    });
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-pause]").exists()).toBe(false);
    expect(wrapper.text()).toContain("auch wenn du die App schließt");
  });

  it.each(["paused", "waiting", "error"] as const)(
    "%s: resume button starts manually",
    async (state) => {
      $offlineDictionary.set({ enabled: true, syncedVersion: null, wifiOnly: true });
      $offlineDictionaryProgress.set({ ...IDLE, state });
      const { startDownload } = await import("@services/offlineDictionary");
      const wrapper = await mountIt();
      await wrapper.find("[data-testid=offline-dictionary-resume]").trigger("click");
      expect(startDownload).toHaveBeenCalledWith({ manual: true });
    },
  );

  it("synced for the current version: shows ready state", async () => {
    $offlineDictionary.set({ enabled: true, syncedVersion: version, wifiOnly: true });
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-ready]").exists()).toBe(true);
  });

  it("emits changed when a download finishes", async () => {
    $offlineDictionary.set({ enabled: true, syncedVersion: null, wifiOnly: true });
    $offlineDictionaryProgress.set({ ...IDLE, mode: "page", state: "running", total: 10 });
    const wrapper = await mountIt();
    $offlineDictionaryProgress.set({ ...IDLE, mode: "page", state: "done", done: 10, total: 10 });
    await flushPromises();
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("persistent storage: shows state and requests on click", async () => {
    const { requestPersistentStorage } = await import("@services/storagePersistence");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-persist]").trigger("click");
    await flushPromises();
    expect(requestPersistentStorage).toHaveBeenCalledOnce();
    expect(wrapper.find("[data-testid=offline-dictionary-persist]").exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/tests/unit/components/PwaOfflineDictionary.test.ts`
Expected: FAIL (component missing)

- [ ] **Step 3: Implement the functional base**

```vue
<!-- src/components/PwaOfflineDictionary.vue -->
<template>
  <section class="c-pwa-offline-dictionary">
    <header class="c-pwa-offline-dictionary__header">
      <h2 class="c-pwa-offline-dictionary__title">Offline-Wörterbuch</h2>
      <label class="c-pwa-offline-dictionary__switch">
        <input
          data-testid="offline-dictionary-toggle"
          type="checkbox"
          role="switch"
          :checked="settings.enabled"
          :disabled="isToggling"
          @change="toggle"
        />
        <span class="u-sr-only">Offline-Wörterbuch aktivieren</span>
      </label>
    </header>

    <p v-if="!settings.enabled" class="c-pwa-offline-dictionary__intro">
      Alle Wörter uff'm Gerät – ooch ohne Netz.
      <template v-if="estimatedBytes"> Braucht ca. {{ formatBytes(estimatedBytes) }}.</template>
    </p>

    <template v-else>
      <p
        v-if="isReady"
        data-testid="offline-dictionary-ready"
        class="c-pwa-offline-dictionary__status"
      >
        Offline verfügbar – {{ progress.total || "alle" }} Wörter.
      </p>

      <div v-else class="c-pwa-offline-dictionary__progress">
        <progress :max="progress.total || 1" :value="progress.done" />
        <p class="c-pwa-offline-dictionary__status">
          {{ statusText }}
          <span v-if="progress.total">{{ progress.done }} / {{ progress.total }}</span>
          <span v-if="progress.bytes"> · {{ formatBytes(progress.bytes) }}</span>
        </p>
        <p
          v-if="progress.mode === 'background-fetch' && progress.state === 'running'"
          class="c-pwa-offline-dictionary__hint"
        >
          Läuft im Hintergrund weiter, auch wenn du die App schließt.
          <template v-if="showWifiToggle && settings.wifiOnly">
            Einmal gestartet, lädt der Browser auch im Mobilnetz weiter.
          </template>
        </p>
        <div class="c-pwa-offline-dictionary__actions">
          <button
            v-if="progress.state === 'running' && progress.mode === 'page'"
            data-testid="offline-dictionary-pause"
            type="button"
            class="c-button"
            @click="pauseDownload()"
          >
            Pause
          </button>
          <button
            v-if="['paused', 'waiting', 'error'].includes(progress.state)"
            data-testid="offline-dictionary-resume"
            type="button"
            class="c-button c-button--primary"
            @click="startDownload({ manual: true })"
          >
            {{ progress.state === "error" ? "Nochmal versuchen" : "Fortsetzen" }}
          </button>
          <button
            v-if="progress.state === 'running'"
            data-testid="offline-dictionary-cancel"
            type="button"
            class="c-button"
            @click="cancelDownload()"
          >
            Abbrechen
          </button>
        </div>
      </div>

      <label v-if="showWifiToggle" class="c-pwa-offline-dictionary__option">
        <input
          data-testid="offline-dictionary-wifi"
          type="checkbox"
          :checked="settings.wifiOnly"
          @change="toggleWifiOnly"
        />
        Nur im WLAN laden
      </label>
    </template>

    <p class="c-pwa-offline-dictionary__persist">
      <template v-if="persistState === 'persisted'">Speicher ist dauerhaft reserviert.</template>
      <template v-else-if="persistState === 'not-persisted'">
        Der Browser darf den Cache bei Platzmangel löschen.
        <button
          data-testid="offline-dictionary-persist"
          type="button"
          class="c-button"
          @click="requestPersist"
        >
          Speicher dauerhaft reservieren
        </button>
      </template>
    </p>
    <p v-if="persistDenied" class="c-pwa-offline-dictionary__hint">
      Der Browser hat abgelehnt. Chrome erlaubt das meist erst, wenn die App installiert ist.
    </p>
  </section>
</template>

<script setup lang="ts">
import { formatBytes } from "@composables/useCacheStorage";
import { useStore } from "@nanostores/vue";
import {
  $offlineDictionaryProgress,
  cancelDownload,
  disableOfflineDictionary,
  enableOfflineDictionary,
  estimateDownloadBytes,
  pauseDownload,
  resumeIfNeeded,
  startDownload,
} from "@services/offlineDictionary";
import {
  getPersistState,
  type PersistState,
  requestPersistentStorage,
} from "@services/storagePersistence";
import { $offlineDictionary, patchOfflineDictionary } from "@stores/pwaSettings.ts";
import { useNetwork } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";

import { version } from "../../package.json";

const emit = defineEmits<{ changed: [] }>();

const settings = useStore($offlineDictionary);
const progress = useStore($offlineDictionaryProgress);
const { type: connectionType } = useNetwork();

const estimatedBytes = ref<number | null>(null);
const persistState = ref<PersistState>("unsupported");
const persistDenied = ref(false);
const isToggling = ref(false);

const showWifiToggle = computed(() => connectionType.value !== undefined);
const isReady = computed(
  () => settings.value.syncedVersion === version && progress.value.state !== "running",
);

const STATUS_TEXT: Record<string, string> = {
  done: "Fertig.",
  error: "Hat nich jeklappt.",
  idle: "Bereit zum Laden.",
  paused: "Pausiert.",
  running: "Lädt …",
  waiting: "Wartet auf WLAN.",
};
const statusText = computed(() => STATUS_TEXT[progress.value.state]);

onMounted(async () => {
  persistState.value = await getPersistState();
  if (!settings.value.enabled) {
    estimatedBytes.value = await estimateDownloadBytes().catch(() => null);
  }
});

watch(
  () => progress.value.state,
  (state) => {
    if (state === "done") emit("changed");
  },
);

async function toggle(event: Event): Promise<void> {
  isToggling.value = true;
  try {
    if ((event.target as HTMLInputElement).checked) await enableOfflineDictionary();
    else await disableOfflineDictionary();
    persistState.value = await getPersistState();
  } finally {
    isToggling.value = false;
  }
  emit("changed");
}

function toggleWifiOnly(event: Event): void {
  const wifiOnly = (event.target as HTMLInputElement).checked;
  patchOfflineDictionary({ wifiOnly });
  if (!wifiOnly) void resumeIfNeeded();
}

async function requestPersist(): Promise<void> {
  persistState.value = await requestPersistentStorage();
  persistDenied.value = persistState.value === "not-persisted";
}
</script>

<style lang="scss">
@use "@styles/components/pwa-offline-dictionary";
</style>
```

Note: `enableOfflineDictionary()` waits for the whole in-page download. `isToggling` only blocks the switch while it runs, and progress is shown via the store. If the switch should unlock earlier, don't `await` `enableOfflineDictionary` but call it with `void` and emit `changed` right away. Decide this during the impeccable review. The test "toggling on … emits changed" works either way.

`src/styles/components/_pwa-offline-dictionary.scss`: an empty `.c-pwa-offline-dictionary {}` block, filled in Step 5.

In `src/components/PwaCacheOverview.vue`, first inside `<template v-else>` (above `<PwaCacheStats …>`):

```vue
<PwaOfflineDictionary @changed="loadCaches" />
```

Script:

```ts
const PwaOfflineDictionary = defineAsyncComponent(
  () => import("@components/PwaOfflineDictionary.vue"),
);
```

In `src/tests/unit/components/PwaCacheOverview.test.ts`, stub `PwaOfflineDictionary` via `config.global.stubs` or `createSlotStub` (helper from `src/tests/unit/helpers/`), following the pattern of the existing stubs in that file.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run src/tests/unit/components/PwaOfflineDictionary.test.ts src/tests/unit/components/PwaCacheOverview.test.ts`
Expected: PASS. The "270 MB" assertion depends on the output of `formatBytes`. If it formats differently (e.g. "257,5 MB" with 1024 as the base), adjust the expected string to the actual `formatBytes(270_000_000)` output. Don't change `formatBytes`.

- [ ] **Step 5: Visual design with the `impeccable` skill**

Invoke the `impeccable` skill with this brief:

> Design `PwaOfflineDictionary.vue`, a panel at the top of `/settings/cache` (above the stat tiles of the cache overview, see screenshot situation: dark theme, stat tiles, type bar, bucket list). States to design: off (intro + size estimate), running in page (progress + pause/cancel), running in background (progress + hint, no pause), waiting for WiFi, paused, error, ready. Plus the "Nur im WLAN" option (only shown when supported) and the persistent storage row with button and the "abgelehnt" hint. Rules: DESIGN.md / PRODUCT.md (register: product, Postcard Rule with dashed signature, currywurst orange as the accent, primary CTA `.c-button--primary`, `@include mx.paper-card` for the panel, `var(--color-muted)` for hints, one shadow "Paper Lift"). A native `<progress>` styled with a fallback; the switch is a native `input[type=checkbox][role=switch]`. BEMIT `.c-pwa-offline-dictionary__*`, styles only in `src/styles/components/_pwa-offline-dictionary.scss`, container query instead of a viewport breakpoint wherever the layout depends on panel width. Dark + light mode, visible focus, `prefers-reduced-motion` for any animation. Copy may be sharpened within the cheeky/warm voice. Keep: the `data-testid` attributes, the texts "270 MB"-style size estimate, "x / y", "auch wenn du die App schließt", "Nur im WLAN laden", "Speicher dauerhaft reservieren" (tests), and all states and actions.

After impeccable: run the tests from Step 4 again (PASS) and `pnpm lint`.

- [ ] **Step 6: Visual check in the browser**

On the dev server (`NO_DEV_TOOLBAR=1`), open `/settings/cache`. Note that the dev server has no SW, so Background Fetch is not active and the in-page path runs. Switch it on, check progress, pause/resume and cancel, then switch it off. Check light/dark, 375 px and desktop. Watch out: switching it on really downloads all word pages from the dev server (slow, on-demand compile). Cancel after a few seconds; that is enough for the visual check.

- [ ] **Step 7: Commit**

```bash
git add src/components/PwaOfflineDictionary.vue src/styles/components/_pwa-offline-dictionary.scss src/components/PwaCacheOverview.vue src/tests/unit/components/PwaOfflineDictionary.test.ts src/tests/unit/components/PwaCacheOverview.test.ts
git commit -m "feat(pwa): add offline dictionary panel to the cache settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: E2E against the production build

**Files:**

- Create: `src/tests/e2e/pwa-caching.spec.ts`

**Interfaces:**

- Consumes: Task 2 (navigation route + fallback). Required slugs in the E2E build: `aasen`, `anmachen`, `wa`.

- [ ] **Step 1: Write the test**

```ts
// src/tests/e2e/pwa-caching.spec.ts
import { expect, test, type Page } from "@playwright/test";

// The service worker only exists in production builds (CI: build + `astro preview`).
// Against `astro dev` there is no SW — skip instead of reporting false failures.
async function waitForServiceWorkerControl(page: Page): Promise<boolean> {
  await page.goto("/");
  return page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((r) => setTimeout(() => r(undefined), 10_000)),
    ]);
    if (!registration) return false;
    if (navigator.serviceWorker.controller) return true;
    await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r));
    return true;
  });
}

test.describe("PWA-Caching", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "SW behavior checked in Chromium");

  test.beforeEach(async ({ page }) => {
    test.skip(!(await waitForServiceWorkerControl(page)), "no service worker (dev server)");
  });

  test("uncached word page comes from the network, not the homepage fallback", async ({ page }) => {
    await page.goto("/wort/aasen");
    await expect(page.locator("h1 dfn")).toHaveText("aasen");
  });

  test("offline: visited page from the cache, unvisited page falls back to the homepage", async ({
    context,
    page,
  }) => {
    await page.goto("/wort/wa");
    await expect(page.locator("h1 dfn")).toHaveText("wa");

    await context.setOffline(true);

    await page.goto("/wort/wa");
    await expect(page.locator("h1 dfn")).toHaveText("wa");

    await page.goto("/wort/anmachen");
    await expect(page.locator("h1 dfn")).toHaveCount(0);
    await expect(page).toHaveURL(/\/wort\/anmachen$/);
    await expect(page.getByRole("searchbox").first()).toBeVisible();

    await context.setOffline(false);
  });
});
```

Note: check the homepage selector (`getByRole("searchbox")`) against `src/tests/e2e/index.spec.ts` / `global-search-input.spec.ts` and adopt the selector used there if they check the homepage differently.

- [ ] **Step 2: Run against your own production build**

Run:

```bash
E2E_WORD_LIMIT=500 pnpm build:local
pnpm preview --port 4322 &
E2E_PORT=4322 npx playwright test src/tests/e2e/pwa-caching.spec.ts --project=chromium
```

Expected: 2 passed. Stop the preview server afterwards (not the user's dev server).

- [ ] **Step 3: Confirm the test catches the old bug**

Briefly add `navigateFallback: "/"` back into the `workbox` block in `astro.config.mjs`, rebuild (`E2E_WORD_LIMIT=500 pnpm build:local`), restart the preview server, and run the test.
Expected: the first test FAILs (the homepage is shown). Then revert the change (`git checkout astro.config.mjs`) and rebuild.

- [ ] **Step 4: Check the `Vary` header of the word pages (manual)**

Run: `curl -sI https://berliner-schnauze.wtf/wort/aasen | grep -i '^vary'`
Expected: no `Vary` or only `Accept-Encoding`. If it contains other request headers (e.g. `Accept`, `Cookie`), the cached pages from the offline dictionary (plain `fetch`) will not match navigation requests. In that case, report back before merging (fix: `ignoreVary` via `matchOptions` in the Workbox route).

- [ ] **Step 5: Commit**

```bash
git add src/tests/e2e/pwa-caching.spec.ts
git commit -m "test(pwa): cover network-first navigation and offline fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Documentation + full check

**Files:**

- Modify: `CLAUDE.md` (the **PWA** paragraph under Key Conventions)

- [ ] **Step 1: Update CLAUDE.md**

Replace the PWA paragraph (starting with `**PWA**: Built with`) with:

```markdown
**PWA**: Built with `@vite-pwa/astro` + Workbox (`generateSW`). Service worker registered in `src/services/pwa.ts` via `virtual:pwa-register`. Update behavior follows the user setting `$updateMode` (`@stores/pwaSettings.ts`, UI in `AppSettingsUpdates.vue`): `prompt` (toast when visible, else notification + silent reload), `auto` (reload when hidden, else full reload on the next ClientRouter navigation), `next-start` (nothing). `registration.update()` runs when the app returns to the foreground (max every 30 min); `vite:preloadError` reloads once. Precache = app shell only (JS/CSS/fonts/icons + top-level, `games/`, `settings/` HTML) — **never precache `wort/**`** (every deploy would re-download ~450 MB). Navigations: NetworkFirst into runtime cache `pages` (no expiration, 3 s timeout, `navigationPreload`), offline fallback `/index.html`. Opt-in offline dictionary (`src/services/offlineDictionary.ts`, UI `PwaOfflineDictionary.vue` on `/settings/cache`) writes all `/wort/*` pages into `pages` — via Background Fetch where supported (handlers in `public/sw-background-fetch.js`, loaded via `workbox.importScripts`), otherwise in-page; pages carry `x-offline-dictionary-version`, re-sync after each app update. Other runtime caching (`astro.config.mjs`): StaleWhileRevalidate for search index/meta, NetworkFirst for word-of-the-day, CacheFirst for `imagor-images` (30 days, 500 entries). Cache Storage UI: `src/composable/useCacheStorage.ts` + `PwaCacheOverview.vue`; clearing `pages` turns the offline dictionary off.
```

Also add a line under **Key stores** in CLAUDE.md: add `pwaSettings.ts` (update mode + offline dictionary settings) to the list.

- [ ] **Step 2: Run the full check**

Run:

```bash
pnpm test:unit
pnpm lint
pnpm format:check
pnpm typechecking
```

Expected: everything green. `typechecking` is slow, so run it only once, here. If `astro:before-preparation` or `vite:preloadError` produce type errors in `pwa.ts`, cast the event with `as Event & { to: URL }` (already in the plan) or add the event to the `WindowEventMap`. Don't use `any`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(pwa): document the new caching strategy and settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec Coverage (Self-Review)

| Spec requirement                                                                                                            | Task          |
| --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| A: app-shell precache, migration through Workbox cleanup                                                                    | 2             |
| B: NetworkFirst `pages`, no expiration, precache fallback                                                                   | 2, E2E 11     |
| C: `navigationPreload`                                                                                                      | 2             |
| D: `registration.update()` on visibility, 30 min                                                                            | 3             |
| Store `$updateMode`, `$offlineDictionary`                                                                                   | 1             |
| S3: prompt/auto(2c)/next-start                                                                                              | 3, UI 9       |
| S1: slugs from the search index, 4 in parallel, skip/resume, re-sync after update, disable deletes `/wort/*`, size estimate | 6             |
| S1: Background Fetch + SW handler (`importScripts`), reattach, abort, click → `/settings/cache`                             | 5, 7          |
| S2: `connection.type` gate, hidden when unsupported, `saveData`, background-fetch hint                                      | 6, UI 10      |
| S4: `persisted()`/`persist()`, automatically on enable, denied hint                                                         | 4, 6, UI 10   |
| Bucket name `pages` → "Besuchte Seiten"                                                                                     | 8             |
| UI via impeccable                                                                                                           | 9, 10         |
| Analytics                                                                                                                   | 3, 4, 6, 7, 9 |
| Tests: unit + E2E                                                                                                           | 1–11          |

Intentional deviations from the spec:

- `backgroundfetchabort` caches nothing (Task 5, Review Focus 5).
- Size estimate uses the fixed average `AVG_PAGE_BYTES` (the spec's fallback value), with no averaging over cached entries (YAGNI).
- `precacheFallback` points to `/index.html` instead of `/`, because Workbox matches the precache key exactly (checked in Task 2).
- `vite:preloadError` reload (Task 3) is added and covers Review Focus 2.
