# PWA Update Notifications + App Settings Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a new PWA version is deployed and the service worker updates:
- If the user has granted notification permission → show native `Notification`, delay the page reload until the user clicks it (60s fallback timeout)
- If no permission → reload immediately (existing behavior, now explicit)

A new `/settings` page is the entry point for app preferences. The existing `/pwa` cache overview becomes `/settings/cache` (sub-page). Footer link updated accordingly.

**Route structure:**
```
/settings          → AppSettings.vue (notification toggle, future settings)
/settings/cache    → PwaCacheOverview.vue (moved from /pwa)
```

**Architecture:**
- `$notificationPermission` atom mirrors `Notification.permission` reactively
- `requestNotificationPermission()` triggers browser prompt from user gesture
- `pwa.ts` adds `onNeedReload` to `registerSW` — providing this callback suppresses the default auto-reload, so we must call `window.location.reload()` in all branches
- `src/pages/pwa.astro` → moved to `src/pages/settings/cache.astro`
- `src/pages/settings/index.astro` → new main settings page
- `Footer.astro` link `/pwa` → `/settings/cache`
- MainMenu gets `/settings` link

**Tech Stack:** Nanostores `atom`, `virtual:pwa-register` (`onNeedReload`), Web Notifications API, Vue 3 Composition API, `useStore` from `@nanostores/vue`, `trackEvent` from `@utils/analytics`.

**Key API facts (verified against installed v1.3.0):**
- `onNeedReload?: () => void` — fires with `autoUpdate` when new SW activates; providing it suppresses the default hard reload → must call `window.location.reload()` manually
- `onNeedRefresh` — prompt strategy only, **do not use**
- `Notification.permission` → `"default" | "granted" | "denied"` — browser-persisted, no localStorage needed
- `Notification.requestPermission()` → `Promise<NotificationPermission>` — must be user-gesture triggered
- `notification.onclick = fn` — callback when user taps the OS notification
- `new Notification(title, { body, icon })` — shows native OS notification

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/stores/notificationPermission.ts` | Atom + `requestNotificationPermission()` action |
| Modify | `src/services/pwa.ts` | Add `onNeedReload` — notify if granted, reload always |
| Create | `src/components/AppSettings.vue` | Notification toggle UI, `client:only="vue"` |
| Create | `src/styles/components/_app-settings.scss` | BEM styles for AppSettings |
| Modify | `src/styles/components/index.scss` | Add `@forward "app-settings"` |
| **Move** | `src/pages/pwa.astro` → `src/pages/settings/cache.astro` | Cache overview at `/settings/cache` |
| Create | `src/pages/settings/index.astro` | Main settings page at `/settings` |
| Modify | `src/components/Footer.astro:57` | Update `/pwa` link → `/settings/cache` |
| Modify | `src/components/header/MainMenu.vue` | Add `{ link: "/settings", title: "Einstellungen" }` |
| Create | `src/tests/unit/stores/notificationPermission.test.ts` | Unit tests for store |

---

## Phase 0: Documentation Discovery ✅ (complete)

**Verified allowed APIs:**

| API | Source |
|-----|--------|
| `atom<T>(initial)` | `nanostores` |
| `onMount(atom, () => cleanup)` | `nanostores` |
| `registerSW({ onNeedReload, onOfflineReady, onRegisteredSW })` | `node_modules/vite-plugin-pwa/types/index.d.ts` |
| `trackEvent(category, action, label)` | `@utils/analytics` |
| `useStore($atom)` | `@nanostores/vue` |
| `Notification.permission`, `.requestPermission()`, `new Notification()`, `.onclick` | Web API |

**Anti-patterns:**
- Do NOT import from `@stores/index` barrel (causes `wordList.ts` computedAsync side effect)
- Do NOT use `onNeedRefresh` (prompt strategy only)
- Do NOT call `Notification.requestPermission()` outside user gesture handler
- Do NOT omit `window.location.reload()` — providing `onNeedReload` suppresses the default reload

**Copy-from references:**
- Atom pattern: `src/stores/installApp.ts:13–40`
- Astro page structure: `src/pages/pwa.astro:1–13`
- Vue component setup + useStore: `src/components/PwaCacheOverview.vue`
- SCSS component: `src/styles/components/_pwa-cache.scss`
- Footer link structure: `src/components/Footer.astro:57`
- menuItems array: `src/components/header/MainMenu.vue:38–56`

---

## Task 1: Notification Permission Store

**Files:**
- Create: `src/stores/notificationPermission.ts`
- Create: `src/tests/unit/stores/notificationPermission.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/unit/stores/notificationPermission.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequestPermission = vi.fn();
Object.defineProperty(global, "Notification", {
  value: { permission: "default" as NotificationPermission, requestPermission: mockRequestPermission },
  writable: true,
});

describe("notificationPermission store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.defineProperty(global.Notification, "permission", { value: "default", writable: true });
  });

  it("initializes with Notification.permission value", async () => {
    const { $notificationPermission } = await import("@stores/notificationPermission.ts");
    expect($notificationPermission.get()).toBe("default");
  });

  it("requestNotificationPermission calls browser API and updates atom", async () => {
    mockRequestPermission.mockResolvedValue("granted");
    const { requestNotificationPermission, $notificationPermission } = await import(
      "@stores/notificationPermission.ts"
    );
    await requestNotificationPermission();
    expect(mockRequestPermission).toHaveBeenCalledOnce();
    expect($notificationPermission.get()).toBe("granted");
  });

  it("handles denied permission", async () => {
    mockRequestPermission.mockResolvedValue("denied");
    const { requestNotificationPermission, $notificationPermission } = await import(
      "@stores/notificationPermission.ts"
    );
    await requestNotificationPermission();
    expect($notificationPermission.get()).toBe("denied");
  });

  it("is a no-op when already granted", async () => {
    Object.defineProperty(global.Notification, "permission", { value: "granted", writable: true });
    const { requestNotificationPermission } = await import("@stores/notificationPermission.ts");
    await requestNotificationPermission();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("isNotificationSupported returns boolean", async () => {
    const { isNotificationSupported } = await import("@stores/notificationPermission.ts");
    expect(typeof isNotificationSupported()).toBe("boolean");
  });
});
```

Run: `pnpm vitest run src/tests/unit/stores/notificationPermission.test.ts` — expect failures.

- [ ] **Step 2: Implement store**

Create `src/stores/notificationPermission.ts`:

```ts
import { atom } from "nanostores";
import { trackEvent } from "@utils/analytics";

export type NotificationPermissionState = NotificationPermission | "unsupported";

export const isNotificationSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const $notificationPermission = atom<NotificationPermissionState>(
  isNotificationSupported() ? Notification.permission : "unsupported",
);

export const requestNotificationPermission = async (): Promise<void> => {
  if (!isNotificationSupported()) return;
  if (Notification.permission === "granted") return;

  const result = await Notification.requestPermission();
  $notificationPermission.set(result);
  trackEvent("App", `Notification permission ${result}`, "PWA");
};
```

- [ ] **Step 3: Run tests — expect pass**

```bash
pnpm vitest run src/tests/unit/stores/notificationPermission.test.ts
```

---

## Task 2: Update pwa.ts — onNeedReload with deferred reload

**Files:**
- Modify: `src/services/pwa.ts`

- [ ] **Step 1: Add `onNeedReload` to registerSW**

Replace entire `src/services/pwa.ts` content with:

```ts
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedReload() {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const notification = new Notification("Berliner Schnauze wurde aktualisiert!", {
        body: "Tippe hier, um die neue Version zu laden.",
        icon: "/icons/icon-192.png",
      });

      const doReload = () => {
        notification.close();
        clearTimeout(fallbackTimer);
        window.location.reload();
      };

      const fallbackTimer = setTimeout(doReload, 60_000);
      notification.onclick = doReload;

      trackEvent("App", "Update notification shown", "PWA");
    } else {
      window.location.reload();
      trackEvent("App", "Silent update applied", "PWA");
    }
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.log("PWA application ready to work offline");
    }

    createToastNotify({
      message: "Berliner Schnauze kann jetzt offline genutzt werden.",
      showClose: true,
      status: "success",
      timeout: null,
    });

    trackEvent("App", "Is Offline ready", "PWA");
  },
  onRegisteredSW(swScriptUrl) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");
  },
});
```

**Verification:**
```bash
pnpm typechecking
```
No new errors — `onNeedReload` is in `RegisterSWOptions`.

---

## Task 3: Route restructure — /pwa → /settings/cache

**Files:**
- Move: `src/pages/pwa.astro` → `src/pages/settings/cache.astro`
- Modify: `src/components/Footer.astro:57`

- [ ] **Step 1: Create directory and move page**

Create `src/pages/settings/cache.astro` with the exact content of `src/pages/pwa.astro`:

```astro
---
import PwaCacheOverview from '@components/PwaCacheOverview.vue'
import Layout from '@layouts/Layout.astro'

const page = {
  description: 'Verwalte den Offline-Cache der Berliner Schnauze App.',
  title: 'Offline-Cache – Berliner Schnauze',
}
---

<Layout content={page}>
  <PwaCacheOverview client:only="vue" />
</Layout>
```

Then delete `src/pages/pwa.astro`.

- [ ] **Step 2: Update Footer link**

In `src/components/Footer.astro` at line 57, change:
```ts
link: "/pwa",
```
to:
```ts
link: "/settings/cache",
```

Also update the link label if it reads "PWA" or "Offline-Cache" — check surrounding lines for the `title` field and update if needed.

**Verification:** Build succeeds, `/settings/cache` renders, `/pwa` returns 404.

---

## Task 4: AppSettings Vue Component + SCSS

**Files:**
- Create: `src/components/AppSettings.vue`
- Create: `src/styles/components/_app-settings.scss`
- Modify: `src/styles/components/index.scss`

- [ ] **Step 1: Check SCSS variable names**

Before writing SCSS, grep for actual token names:
```bash
grep -n "spacing\|font-weight\|font-size\|color-warning\|color-error" \
  src/styles/variables/*.scss | head -30
```
Use exact variable names found — do not invent tokens.

- [ ] **Step 2: Create SCSS file**

Create `src/styles/components/_app-settings.scss` using verified token names. Minimal example (adjust tokens to match findings from Step 1):

```scss
@use "@styles/variables" as vars;
@use "@styles/mixins" as mx;

.c-app-settings {
  display: flex;
  flex-direction: column;

  &__section {
    display: flex;
    flex-direction: column;
  }

  &__notification-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__denied-hint {
    font-size: 0.875rem;
  }
}
```

- [ ] **Step 3: Register in SCSS index**

In `src/styles/components/index.scss`, add with other `@forward` lines:
```scss
@forward "app-settings";
```

- [ ] **Step 4: Verify Lucide icon names exist**

```bash
ls node_modules/@iconify-json/lucide/icons/ | grep -E "^bell"
```
Use only icon names confirmed to exist (e.g. `bell.svg` → `lucide/bell`).

- [ ] **Step 5: Create AppSettings.vue**

Create `src/components/AppSettings.vue`:

```vue
<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { defineAsyncComponent } from "vue";
import {
  $notificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@stores/notificationPermission.ts";

const BellIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell"));
const BellOffIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell-off"));

const notificationPermission = useStore($notificationPermission);
const notificationsSupported = isNotificationSupported();
</script>

<template>
  <div class="c-app-settings">
    <section class="c-app-settings__section">
      <h2>Benachrichtigungen</h2>

      <p v-if="!notificationsSupported">
        Dein Browser unterstützt keine Benachrichtigungen.
      </p>

      <template v-else>
        <div class="c-app-settings__notification-row">
          <component :is="notificationPermission === 'granted' ? BellIcon : BellOffIcon" />

          <span v-if="notificationPermission === 'granted'">Benachrichtigungen aktiv</span>
          <span v-else-if="notificationPermission === 'denied'">Benachrichtigungen blockiert</span>
          <span v-else>Benachrichtigungen nicht aktiviert</span>
        </div>

        <p v-if="notificationPermission === 'denied'" class="c-app-settings__denied-hint">
          Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.
        </p>

        <button
          v-if="notificationPermission !== 'granted' && notificationPermission !== 'denied'"
          class="c-btn"
          type="button"
          @click="requestNotificationPermission"
        >
          Benachrichtigungen aktivieren
        </button>
      </template>
    </section>
  </div>
</template>

<style lang="scss">
@use "@styles/components/app-settings";
</style>
```

> **Note:** Check `src/styles/components/_button.scss` for exact button class name (likely `c-btn` or `c-button`).

---

## Task 5: Settings Index Page

**Files:**
- Create: `src/pages/settings/index.astro`

- [ ] **Step 1: Create page**

Create `src/pages/settings/index.astro`:

```astro
---
import AppSettings from '@components/AppSettings.vue'
import Layout from '@layouts/Layout.astro'

const page = {
  description: 'App-Einstellungen für Berliner Schnauze.',
  title: 'Einstellungen – Berliner Schnauze',
}
---

<Layout content={page}>
  <AppSettings client:only="vue" />
</Layout>
```

**Verification:** `/settings` renders, `/settings/cache` still renders.

---

## Task 6: Navigation Links

**Files:**
- Modify: `src/components/header/MainMenu.vue`

- [ ] **Step 1: Add `/settings` to menuItems**

In `src/components/header/MainMenu.vue`, find `menuItems` array (around line 38–56):

```ts
const menuItems = [
  { component: InstallApp, props: { ... } },
  { link: "/wort-vorschlagen", title: "Wort vorschlagen" },
  { link: "/wort", title: "Wort Index" },
];
```

Add:
```ts
{ link: "/settings", title: "Einstellungen" },
```

---

## Final Verification

- [ ] `pnpm vitest run src/tests/unit/stores/notificationPermission.test.ts` — all pass
- [ ] `pnpm test:unit` — full suite, no regressions
- [ ] `pnpm lint` — no errors
- [ ] `pnpm typechecking` — no new errors
- [ ] `pnpm build` — succeeds; `/settings` and `/settings/cache` in output; no `/pwa`
- [ ] Manual: `/settings` loads, notification toggle visible
- [ ] Manual: click button → browser permission dialog appears
- [ ] Manual: grant → status shows "aktiv", button hidden
- [ ] Manual: deny → hint text shown, no button
- [ ] Manual: `/settings/cache` shows cache overview (same as old `/pwa`)
- [ ] Manual: Footer link points to `/settings/cache`

**Anti-pattern verification:**
```bash
# No barrel imports
grep "from \"@stores/index\"" src/components/AppSettings.vue src/stores/notificationPermission.ts

# onNeedRefresh not used
grep "onNeedRefresh" src/services/pwa.ts

# /pwa not referenced anywhere (should be empty)
grep -r '"/pwa"' src/ --include="*.astro" --include="*.vue" --include="*.ts"

# Old pwa.astro gone
ls src/pages/pwa.astro 2>&1  # should: No such file
```
