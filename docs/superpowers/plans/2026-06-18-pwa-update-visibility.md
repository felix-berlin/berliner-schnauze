# Plan: PWA Update Behavior Based on Tab Visibility

**Branch:** `feature/more-word-details` (or a new branch)
**Date:** 2026-06-18

## Goal

Change `onNeedReload` in `src/services/pwa.ts` so update behavior depends on whether the user is actively looking at the tab:

| Tab state | Behavior |
|---|---|
| `visibilityState === "visible"` | Show toast with "Jetzt aktualisieren" action button — **no auto-reload** |
| `visibilityState === "hidden"` | Show native notification + **auto-reload immediately** |

---

## Phase 0: Facts (already gathered)

### Files to touch

| File | Change |
|---|---|
| `src/stores/toastNotify.ts` | Add `actionLabel?: string` + `onAction?: () => void` to `ToastNotify` type |
| `src/components/toast/ToastNotify.vue` | Render action button; call `onAction()` + `hideToast()` on click |
| `src/styles/components/_toast-notify.scss` | Style `.c-toast-notify__action` |
| `src/services/pwa.ts` | Branch `onNeedReload` on `document.visibilityState` |
| `src/tests/unit/components/toast/ToastNotify.test.ts` | Tests for action button |

### Key constraints confirmed
- `ToastNotify` type has **no** `actionLabel`/`onAction` today — must be added
- `document.visibilityState` is **not used anywhere** — new feature
- `trackEvent(category, action, label)` — 3 string params
- `ToastNotify.vue` props via `defineProps<ToastNotify>()` — type extension propagates automatically
- Toast `timeout: null` = stays until dismissed or acted on

---

## Phase 1: Extend Toast with Action Button

### 1a — `src/stores/toastNotify.ts`

Add two optional fields to the `ToastNotify` type (lines 3–14):

```ts
export type ToastNotify = {
  actionLabel?: string;       // <-- add
  onAction?: () => void;      // <-- add
  closeOnSwipe?: boolean;
  // ... rest unchanged
};
```

### 1b — `src/components/toast/ToastNotify.vue`

Destructure the new props (after `showStatusIcon = true`):

```ts
const {
  // ... existing props
  actionLabel,
  onAction,
} = defineProps<ToastNotify>();
```

Add `handleAction` function next to `hideToast`:

```ts
const handleAction = async (): Promise<void> => {
  onAction?.();
  await hideToast();
};
```

Add action button in template, after `.c-toast-notify__message` div, before the close button:

```html
<button
  v-if="actionLabel"
  type="button"
  class="c-toast-notify__action c-button c-button--primary c-button--small"
  @click="handleAction()"
>
  {{ actionLabel }}
</button>
```

### 1c — `src/styles/components/_toast-notify.scss`

Add `.c-toast-notify__action` styles. Reference existing button utilities (`c-button--small`) and ensure the button sits inline with the message. Minimal additions — rely on `c-button` base classes as much as possible.

### Verification
- `pnpm lint` → 0 errors
- `pnpm typechecking` → 0 new TS errors
- `pnpm test:unit` → existing toast tests still pass

---

## Phase 2: Update `src/services/pwa.ts`

Replace the entire `onNeedReload` callback:

```ts
onNeedReload() {
  if (document.visibilityState === "visible") {
    // Active tab: prompt user, no auto-reload
    createToastNotify({
      message: "Eine neue Version ist verfügbar.",
      actionLabel: "Jetzt aktualisieren",
      onAction: () => {
        trackEvent("App", "Update accepted by user", "PWA");
        window.location.reload();
      },
      showClose: true,
      status: "info",
      timeout: null,
    });
    trackEvent("App", "Update toast shown (active tab)", "PWA");
  } else {
    // Background tab: notify + auto-reload
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Berliner Schnauze wurde aktualisiert!", {
          body: "Die neue Version wurde im Hintergrund geladen.",
          icon: "/favicons/android-chrome-192x192.png",
        });
        trackEvent("App", "Background update notification shown", "PWA");
      } catch (err) {
        console.error("[pwa] Failed to show background update notification:", err);
      }
    }
    trackEvent("App", "Background update applied", "PWA");
    window.location.reload();
  }
},
```

**What changed vs. current code:**
- Old `fallbackTimer` + `notification.onclick` reload loop → removed (background = always auto-reload)
- Toast `timeout: null` → update prompt stays until user acts
- 2 old `trackEvent` calls → replaced by 4 granular ones:
  - `"Update toast shown (active tab)"` — toast displayed to active user
  - `"Update accepted by user"` — user clicked the button
  - `"Background update notification shown"` — native notification fired
  - `"Background update applied"` — auto-reload triggered in background

### Verification
- `pnpm lint` → 0 errors
- `pnpm typechecking` → 0 new TS errors

---

## Phase 3: Tests

In `src/tests/unit/components/toast/ToastNotify.test.ts`, add:

1. **Renders action button** when `actionLabel` prop is provided
2. **Does not render action button** when `actionLabel` is absent
3. **Calls `onAction` callback** when action button is clicked
4. **Calls `hideToast` / removes toast** after `onAction`

Mock `removeToastById` (already mocked in other toast tests — follow the same pattern).

### Verification
- `pnpm test:unit` → all tests pass including new ones

---

## Anti-patterns to avoid

- Do NOT auto-reload on visible tab — the whole point is user-initiated
- Do NOT add `timeout` to the update toast (use `null`) — user must see it
- Do NOT invent a `c-button--small` variant if it doesn't already exist — check `src/styles/` first
- Do NOT use `notification.onclick` for the background case — just fire-and-forget the notification, then reload

---

## Execution order

1. Phase 1 (toast extension) → lint + type check
2. Phase 2 (pwa.ts logic) → lint + type check
3. Phase 3 (tests) → full test suite
