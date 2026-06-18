# Toast Redesign: Container-als-Popover, 6 Positionen, FLIP-Stacking

**Datum:** 2026-06-18  
**Status:** Approved

---

## Ziel

Das Toast-System erhält:
- 6 Positionen (top/bottom × left/center/right)
- Korrektes CSS-basiertes Stacking ohne manuelle Pixel-Berechnung
- FLIP-Animationen beim Schließen von Toasts (übrige gleiten smooth nach)
- Richtungs-aware Enter/Leave-Animationen
- Max. 3 Toasts pro Position (ältester wird verdrängt)
- CSS Anchor Positioning als progressives Enhancement für Viewport-Overflow-Flip

---

## Browser-Feature-Baseline (Stand Juni 2026)

| Feature | Status |
|---|---|
| Popover API | **Baseline Widely Available** (April 2025) |
| `@starting-style` | Baseline Newly Available (2024) |
| `transition: overlay allow-discrete` | Baseline Newly Available (2024) |
| CSS Anchor Positioning (`anchor-name`, `position-anchor`, `position-area`, `@position-try`) | **Baseline Newly Available** (Oktober 2025 – April 2026) |

CSS Anchor Positioning ist produktionsreif für Core-Features. Sub-Features wie `anchor-scope` haben noch kleinere Browser-Differenzen — deshalb wird `@position-try` hinter `@supports (position-area: top)` isoliert.

---

## Architektur

### Komponentenbaum

```
ToastNotifyContainer.vue        ← gruppiert Store → Position-Gruppen
  └── ToastPositionGroup.vue    ← NEU: popover="manual" Container pro Ecke
        └── <TransitionGroup>
              └── ToastNotify.vue   ← reines Content-Element, kein Popover
```

### Verantwortlichkeiten

| Komponente | Verantwortung |
|---|---|
| `ToastNotifyContainer` | Gruppiert `$toastNotify` Store nach `position`, rendert eine `ToastPositionGroup` pro aktiver Position |
| `ToastPositionGroup` | Das `popover="manual"` Element. Managt `showPopover()`/`hidePopover()` Lifecycle. Enthält `<TransitionGroup>`. Positioniert via CSS-Modifier-Klassen. |
| `ToastNotify` | Reines Content-Element: Icon, Message, Action-Button, Close-Button, Swipe-to-dismiss. Kein Popover, keine Inline-Styles, keine Offset-Berechnung. |

### Entfernte Konzepte aus `ToastNotify`

Die folgenden Props und Methoden entfallen komplett:

- `popover="manual"` Attribut
- `initOffset` Prop
- `outerSpacing` Prop  
- `gapBetween` Prop
- `setPosition()` Methode
- `setDynamicPosition()` Methode
- `stylePosition` Reactive Object
- `isSupported` / `supportsPopover()` Check (liegt jetzt auf Container-Ebene)

---

## Store (`toastNotify.ts`)

### Typ-Erweiterung

```ts
position?: 
  | "bottom-center" | "bottom-left" | "bottom-right"
  | "top-center"    | "top-left"    | "top-right"
```

### id-Vereinheitlichung

```ts
// War: Math.random() * 1000  (number, fehleranfällig, Kollisionen möglich)
// Neu: 
id: crypto.randomUUID()  // string UUID
```

Der Typ `ToastNotify.id` wechselt von `number` auf `string`. `removeToastById` vereinfacht sich entsprechend.

### Max-3-Enforcement

```ts
const MAX_PER_POSITION = 3

export const createToastNotify = (payload: ToastPayload): void => {
  if (!supportsPopover()) return

  const pos = payload.position ?? "top-right"
  const current = $toastNotify.get()
  const forPos = current.filter(t => (t.position ?? "top-right") === pos)

  let updated = current
  if (forPos.length >= MAX_PER_POSITION) {
    const oldest = forPos.at(-1)!
    hidePopover(oldest.id)
    updated = current.filter(t => t.id !== oldest.id)
  }

  const toast = createToast(payload)
  $toastNotify.set([toast, ...updated])

  // Timeout-Logik bleibt unverändert
}
```

`supportsPopover()` bleibt im Store — der Check wird in `ToastPositionGroup.onBeforeMount` ausgeführt. Wenn nicht unterstützt, rendert die Gruppe nichts (`isSupported = false`, Template via `v-if` ausgeblendet).

---

## `ToastPositionGroup.vue` — Popover Lifecycle

### Show/Hide-Logik

```
watch(props.toasts.length):
  0 → ≥1 : containerRef.value?.showPopover()
  ≥1 → 0 : wird via TransitionGroup @after-leave ausgelöst → hidePopover()
```

Das Popover-Element wird **nicht** via `v-if` bedingt gerendert. `v-if` würde das DOM-Element vor Ende der Leave-Animation zerstören. Der Container bleibt im DOM; `hidePopover()` wird erst nach `@after-leave` aufgerufen — und nur wenn `props.toasts.length === 0`, da `@after-leave` nach jeder einzelnen Toast-Exit-Animation feuert, nicht nur nach der letzten.

### Template-Struktur

```vue
<div
  ref="container"
  popover="manual"
  class="c-toast-container"
  :class="`c-toast-container--${position}`"
>
  <TransitionGroup
    name="c-toast-notify"
    @after-leave="onAfterLeave"
  >
    <ToastNotify
      v-for="toast in toasts"
      :key="toast.id"
      v-bind="toast"
    />
  </TransitionGroup>
</div>
```

---

## CSS

### `_toast-container.scss` (neu)

```scss
.c-toast-container {
  // UA-Popover-Reset
  margin: 0;
  border: none;
  background: transparent;
  padding: 0;
  overflow: visible;
  max-width: none;
  max-height: none;

  // Layout
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: max-content;

  // Bottom-Positionen: column-reverse → neuester Toast erscheint unten (nearest edge)
  &--bottom-right,
  &--bottom-left,
  &--bottom-center { flex-direction: column-reverse; }

  // Corner-Positioning
  &--top-right     { top: 20px; right: 20px; }
  &--top-left      { top: 20px; left: 20px; }
  &--top-center    { top: 20px; left: 50%; translate: -50% 0; }
  &--bottom-right  { bottom: 20px; right: 20px; }
  &--bottom-left   { bottom: 20px; left: 20px; }
  &--bottom-center { bottom: 20px; left: 50%; translate: -50% 0; }

}
```

### `_toast-notify.scss` — Animation-Update

`overlay allow-discrete` entfällt (kein Top-Layer mehr pro Toast). Vue TransitionGroup übernimmt Enter/Leave/Move:

```scss
// Enter / Leave Timing
.c-toast-notify-enter-active,
.c-toast-notify-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

// Leave: aus dem Flow nehmen damit Move-FLIP korrekt funktioniert
.c-toast-notify-leave-active {
  position: absolute;
}

// Move-Animation (FLIP) — automatisch für alle Positionen
.c-toast-notify-move {
  transition: transform 0.3s ease;
}

// Richtungs-aware Start/End-Zustände via Container-Klasse
.c-toast-container--top-right,
.c-toast-container--bottom-right {
  .c-toast-notify-enter-from,
  .c-toast-notify-leave-to { transform: translateX(110%); opacity: 0; }
}

.c-toast-container--top-left,
.c-toast-container--bottom-left {
  .c-toast-notify-enter-from,
  .c-toast-notify-leave-to { transform: translateX(-110%); opacity: 0; }
}

.c-toast-container--top-center {
  .c-toast-notify-enter-from,
  .c-toast-notify-leave-to { transform: translateY(-110%); opacity: 0; }
}

.c-toast-container--bottom-center {
  .c-toast-notify-enter-from,
  .c-toast-notify-leave-to { transform: translateY(110%); opacity: 0; }
}

// Reduced motion: nur Opacity
@media (prefers-reduced-motion: reduce) {
  .c-toast-notify-enter-active,
  .c-toast-notify-leave-active,
  .c-toast-notify-move {
    transition: opacity 0.3s ease;
    transform: none !important;
  }
}
```

---

## Dateien

| Datei | Änderung |
|---|---|
| `src/components/toast/ToastPositionGroup.vue` | **NEU** |
| `src/components/toast/ToastNotifyContainer.vue` | Umbau: Gruppierungslogik, rendert ToastPositionGroup |
| `src/components/toast/ToastNotify.vue` | Entfernt: popover, inline Styles, Offset-Props, setDynamicPosition |
| `src/stores/toastNotify.ts` | Typen, UUID-id, MAX_PER_POSITION |
| `src/styles/components/_toast-notify.scss` | Animation-Update (kein overlay allow-discrete) |
| `src/styles/components/_toast-container.scss` | **NEU** — Container-Reset, Positioning, @position-try |
| `src/tests/unit/components/toast/ToastNotify.test.ts` | Angepasst: kein Popover auf Toast |
| `src/tests/unit/components/toast/ToastNotifyContainer.test.ts` | Erweitert: Gruppierungslogik |
| `src/tests/unit/components/toast/ToastPositionGroup.test.ts` | **NEU** |

---

## Tests — Schwerpunkte

| Bereich | Was getestet wird |
|---|---|
| Store | Max-3 verdrängt ältesten; `top-center`/`bottom-center` als gültige Positionen; UUID-id ist string |
| `ToastPositionGroup` | `showPopover()` beim ersten Toast; `hidePopover()` nach `@after-leave` wenn leer; `supportsPopover()` Guard |
| `ToastNotify` | Kein `popover` Attribut mehr; Swipe-to-dismiss löst `removeToastById` aus; Action-Button |
| `ToastNotifyContainer` | Gruppierung: 2 Toasts top-right + 1 top-left → 2 Gruppen |

FLIP-Move-Animationen sind nicht direkt unit-testbar (CSS-Animations), werden visuell via `__testUpdateToast()` im Browser verifiziert.

---

## Offene Entscheidungen / nicht im Scope

- **CSS Anchor Positioning (`@position-try`) — Future Enhancement:** `position-try-fallbacks` erfordert zwingend `position-anchor` auf dem Element — ohne Anchor-Verknüpfung ignoriert der Browser den Fallback still. Für eine korrekte Implementierung bräuchten Bottom-Container einen unsichtbaren Anchor-Punkt (`anchor-name`) an der jeweiligen Ecke und würden per `position-anchor` darauf referenzieren. Dieser Aufwand ist für V1 nicht gerechtfertigt; kann in einer Folge-Iteration ergänzt werden.
- Kein `top-center`/`bottom-center` Viewport-Flip — zentrierte Toasts haben selten Overflow-Probleme.
- Swipe-Richtung (aktuell: alle Richtungen) bleibt unverändert.
