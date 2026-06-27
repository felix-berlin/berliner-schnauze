# Plan: Matomo Content Tracking

**Ziel**: Matomo Content Tracking für alle wesentlichen Inhaltsbereiche der Berliner-Schnauze-App implementieren — Impressionen (Anzeige) und Interaktionen (Klicks) für Banners, CTAs, Word Cards, Homepage-Highlights und BON-Share-Ergebnisse.

**Vorbedingung erfüllt**: BON Event Tracking (Game Started/Over/Resumed/Highscore/Streak/Share/WordExplored) wurde bereits implementiert — commit `bb0c07f4` auf `feature/more-word-details`.

**Ausgangslage**:
- `astro-matomo` Integration aktiv mit `viewTransition.contentElement: "main"` — re-scannt Inhalte bei Astro-Navigationen
- `SingleWord.vue` hat rudimentäres Content Tracking (fehlt `data-content-target`)
- Alle anderen Komponenten: kein Content Tracking
- `src/utils/analytics.ts` hat `trackEvent`, aber keine Content-Tracking-Helfer

**Alle Ziel-Komponenten verifiziert (existieren)**:

- `src/components/GameCtaCard.astro` ✓
- `src/components/FactCard.astro` ✓
- `src/components/word/BookRecommendations.astro` ✓
- `src/components/word/SingleWord.vue` ✓ (partiell vorhanden)
- `src/components/WordOfTheDay.vue` ✓
- `src/components/AlertBanner.vue` ✓
- `src/components/InstallApp.vue` ✓
- `src/components/WordSuggestHint.vue` ✓
- `src/components/RelatedWords.vue` ✓
- `src/components/games/BonCard.vue` ✓
- `src/components/games/BonShareView.vue` ✓ (neu hinzugefügt)

---

## Allowed APIs (aus Matomo-Docs verifiziert)

```html
<!-- Auf Root-Element des Content-Blocks -->
<div
  data-track-content
  data-content-name="Eindeutiger Name"
  data-content-piece="Spezifisches Inhaltselement"
  data-content-target="/ziel-url"
>
```

```ts
// Für dynamisch gemountete Vue-Islands (nach onMounted)
_paq.push(['trackContentImpressionsWithinNode', domElement])

// Vollständig manuell (wenn kein DOM-Zugriff)
_paq.push(['trackContentImpression', name, piece, target])
_paq.push(['trackContentInteraction', 'click', name, piece, target])

// Debug
_paq.push(['logAllContentBlocksOnPage'])
```

**Wie `astro-matomo` Content Tracking handhabt** (Quelle: [matomo.ts](https://github.com/felix-berlin/astro-matomo/blob/main/packages/astro-matomo/src/matomo.ts)):

```js
// Feuert bei jedem astro:after-swap (View Transition)
_paq.push(["trackContentImpressionsWithinNode", document.querySelector("main")]);
```

Wichtige Konsequenzen:

- **Initiales Laden**: Matomo.js ruft `trackAllContentImpressions()` selbst auf — aber Vue Islands sind zu diesem Zeitpunkt noch nicht hydriert → deren `data-track-content` ist nicht im DOM → werden **nicht erfasst**
- **Nach Navigation**: `astro:after-swap` feuert **bevor** Vue-Islands hydrieren → gleiche Lücke
- **Viewport**: `trackContentImpressionsWithinNode` ist **nicht** viewport-aware — statische Astro-Inhalte unter dem Fold werden als Impression gezählt (bewusstes Trade-off, da `astro-matomo` nur basics mitbringt)
- **Double-Counting-Risiko**: Keins — Vue Islands sind beim `astro:after-swap` noch nicht im DOM, daher können sie von `astro-matomo` nicht doppelt gezählt werden

**Anti-Patterns (verboten)**:

- `trackAllContentImpressions()` selbst aufrufen → doppeltes Tracking mit Matomo.js auf Initial-Load
- `onMounted` statt IntersectionObserver in `useContentTracking` → zählt Impressionen bevor der User die Komponente sieht
- `data-content-piece` ohne Wert (bare attribute) → liefert `"Unknown"` in Reports
- `data-content-ignoreinteraction` vergessen wenn manuelles Interaction-Tracking gewünscht

---

## Phase 1: Utility + Composable

**Dateien**: `src/utils/analytics.ts`, `src/composable/useContentTracking.ts` (neu)

### Tasks

1. **`analytics.ts`**: `trackContentImpressionsWithinNode(el: Element): void` ergänzen
   ```ts
   export function trackContentImpressionsWithinNode(el: Element): void {
     if (!isBrowser()) return
     window._paq.push(['trackContentImpressionsWithinNode', el])
   }
   ```

2. **`useContentTracking.ts`** (neues Composable) erstellen:

   Impression erst beim Eintreten in den Viewport feuern — nicht bei `onMounted`. Viele Kandidaten (RelatedWords, WordAnagrams, WordAlphabetNav, BonCard, Footer) liegen unterhalb des Folds. Ein `onMounted`-Aufruf würde Impressionen für Inhalte zählen, die der User nie gesehen hat.

   ```ts
   import { useIntersectionObserver } from '@vueuse/core'
   import type { Ref } from 'vue'
   import { trackContentImpressionsWithinNode } from '@utils/analytics'

   export function useContentTracking(el: Ref<Element | null>) {
     const { stop } = useIntersectionObserver(el, ([entry]) => {
       if (entry.isIntersecting && el.value) {
         trackContentImpressionsWithinNode(el.value)
         stop() // Impression nur einmal zählen
       }
     })
   }
   ```

   `useIntersectionObserver` ist bereits in `@vueuse/core` vorhanden (im Projekt verfügbar, kein neues Package nötig).

### Verifikation
```bash
grep -n "trackContentImpressionsWithinNode" src/utils/analytics.ts
grep -n "useContentTracking" src/composable/useContentTracking.ts
pnpm typechecking
```

---

## Phase 2: Fix SingleWord.vue

**Datei**: `src/components/word/SingleWord.vue`

**Problem**: `data-content-target` fehlt → Klick-Interaktionen werden in Matomo nicht zugeordnet.

### Task

Im `<article>`-Root (aktuell Zeile 2–11): `data-content-target` mit der Word-URL binden.

```html
<article
  data-track-content
  data-content-name="word"
  :data-content-target="wordUrl"
  ...
>
```

- `wordUrl` = relativer Pfad zum Wort (z.B. `/wort/kiez`) — aus `source.slug` oder äquivalentem Prop ableiten
- `data-content-piece` bleibt: `:data-content-piece="source.wordProperties?.berlinerisch"`

### Verifikation
```bash
grep -n "data-content-target" src/components/word/SingleWord.vue
# Muss eine Bindung zeigen, nicht leer
```

---

## Phase 3: Statische Astro-Komponenten

Für `.astro`-Dateien reichen HTML-Attribute — kein JS-Aufruf nötig, da `astro-matomo` den DOM initial und nach View Transitions scannt.

### 3a: GameCtaCard.astro

**Datei**: Ort via `find src -name "GameCtaCard.astro"` ermitteln.

```html
<!-- Root-Element der CTA-Karte -->
<div
  data-track-content
  data-content-name="Game CTA"
  data-content-piece="Berliner oder Nicht spielen"
  data-content-target="/berliner-oder-nicht"
>
```

### 3b: FactCard.astro

**Datei**: Ort via `find src -name "FactCard.astro"` ermitteln.

```html
<!-- Root-Element der FactCard; piece = Titel/Thema der Karte -->
<div
  data-track-content
  data-content-name="Fact Card"
  data-content-piece={title}
  data-content-target={href ?? '#'}
>
```

### 3c: BookRecommendations.astro

**Datei**: `src/components/word/BookRecommendations.astro`

```html
<!-- Pro Buch-Element -->
<a
  data-track-content
  data-content-name="Book Recommendation"
  data-content-piece={book.title}
  data-content-target={book.href}
>
```

### 3d: WordAlphabetNav.astro

**Datei**: `src/components/word/WordAlphabetNav.astro`

Zeigt "Davor"/"Danach"-Navigationslinks für sequenzielles Browsen zwischen Wörtern. Impression/Interaction-Rate zeigt, ob User alphabetisch weiterbrowsen.

```html
<!-- Auf dem Root-Container der Navigation -->
<nav
  data-track-content
  data-content-name="Alphabet Navigation"
  data-content-piece={`${prevWord ?? 'start'} → ${nextWord ?? 'end'}`}
  data-content-target={nextWordUrl ?? prevWordUrl ?? '#'}
>
```

**Hinweis**: `data-content-target` auf den wahrscheinlichsten Klick-Link setzen (z.B. "Danach"), oder pro Link-Element ein eigenes `data-track-content`-Block anlegen.

### 3e: WordAnagrams.astro

**Datei**: `src/components/word/WordAnagrams.astro`

Sektion "Buchstabenspiele" mit Anagramm-Links. Misst, ob User verwandte Wörter über Buchstabenspiele entdecken.

```html
<!-- Auf dem Section-Root -->
<section
  data-track-content
  data-content-name="Word Anagrams"
  data-content-piece={wordName}
  data-content-target="#"
>
```

**Anti-Pattern**: `data-content-target` nicht leer lassen — `"#"` als Fallback setzen, da Interaktionen auf Kinder-Links trotzdem getrackt werden.

### 3f: WordSimilarSpelling.astro

**Datei**: `src/components/word/WordSimilarSpelling.astro`

Sektion "Ähnlich geschrieben" mit Links zu ähnlich geschriebenen Wörtern.

```html
<!-- Auf dem Section-Root -->
<section
  data-track-content
  data-content-name="Similar Spelling"
  data-content-piece={wordName}
  data-content-target="#"
>
```

### 3g: WordHero.astro

**Datei**: `src/components/word/WordHero.astro`

Zentraler Header jeder Wort-Detailseite mit Titel, Badges, Audio-Player und Options-Dropdown.

```html
<!-- Auf dem Root-Element (z.B. <header> oder <div>) -->
<header
  data-track-content
  data-content-name="Word Hero"
  data-content-piece={word}
  data-content-target={`/wort/${slug}`}
>
```

**Hinweis**: `WordOptionDropdown.vue` innerhalb des Hero hat bereits eigene `trackEvent`-Calls — `data-content-ignoreinteraction` NICHT setzen, da Matomo sonst gar keine Interaction erfasst. Doppel-Tracking ist hier akzeptabel (unterschiedliche Dimensionen: Impression vs. Event).

### 3h: Footer.astro — Funding/Install-Sektion

**Datei**: `src/components/Footer.astro`

Nur den Funding/App-Install-Bereich im Footer tracken, nicht den gesamten Footer (zu viele irrelevante Links würden den Report verwässern).

```html
<!-- Nur auf dem Funding-/Install-Container, nicht auf dem <footer>-Root -->
<div
  data-track-content
  data-content-name="Footer Funding CTA"
  data-content-piece="Projekt unterstützen"
  data-content-target={fundingUrl}
>
```

Erst Datei lesen um den genauen Container für Funding-Links zu identifizieren.

### Verifikation Phase 3
```bash
grep -rn "data-track-content" src/components/**/*.astro src/pages/**/*.astro
# Muss GameCtaCard, FactCard, BookRecommendations zeigen
```

---

## Phase 4: Vue-Komponenten — Homepage & Banner

Vue-Islands werden **nach** dem initialen Matomo-Scan gemountet → `useContentTracking(root)` nötig.

### Pattern für alle Vue-Komponenten in dieser Phase:

```vue
<template>
  <div
    ref="root"
    data-track-content
    data-content-name="…"
    data-content-piece="…"
    data-content-target="…"
  >
    <!-- Inhalt -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useContentTracking } from '@composables/useContentTracking'

const root = ref<HTMLElement | null>(null)
useContentTracking(root)
</script>
```

### 4a: WordOfTheDay.vue

**Datei**: `src/components/WordOfTheDay.vue`

- `data-content-name="Word of the Day"`
- `data-content-piece` = das heutige Wort (reaktiv aus Store)
- `data-content-target` = Link zur Word-Detail-Seite

### 4b: AlertBanner.vue

**Datei**: `src/components/AlertBanner.vue`

- `data-content-name="Alert Banner"`
- `data-content-piece` = Banner-Text/Titel (Prop)
- `data-content-target` = Banner-Link (Prop) oder `"#"` wenn kein Link
- Interaction Tracking: Wenn Banner manuell geschlossen wird → `trackContentInteraction` manuell aufrufen (zusätzlich zu auto-tracking)

### 4c: InstallApp.vue

**Datei**: `src/components/InstallApp.vue`

- `data-content-name="PWA Install Prompt"`
- `data-content-piece="App installieren"`
- `data-content-target="javascript:install"` oder `"#install"`
- **Hinweis**: `trackEvent` für den Klick existiert bereits — `data-content-ignoreinteraction` ergänzen wenn Doppel-Tracking vermieden werden soll

### 4d: WordSuggestHint.vue

**Datei**: `src/components/WordSuggestHint.vue`

- `data-content-name="Word Suggest CTA"`
- `data-content-piece="Wort vorschlagen"`
- `data-content-target` = Modal-Trigger oder direkte URL

### 4e: SuggestWordForm.vue

**Datei**: `src/components/SuggestWordForm.vue`

Das Formular selbst als Content-Block — Impression = Formular gesehen, Interaction = Submit-Button geklickt. Ergänzt das bestehende `trackEvent("Form", "Send", "Word Suggestion")` um die Sichtbarkeits-Dimension (wie viele User sehen das Formular, aber schicken es nicht ab?).

Pattern: Wie `AlertBanner.vue` in Phase 4b — Composable-Pattern + `data-content-ignoreinteraction` auf dem Submit-Button, da der Klick über `trackEvent` bereits erfasst wird.

```vue
<template>
  <form
    ref="root"
    data-track-content
    data-content-name="Word Suggest Form"
    data-content-piece="Wort einreichen"
    data-content-target="/wort-vorschlagen"
  >
    <!-- ... -->
    <!-- Submit-Button: ignoreinteraction, da trackEvent bereits feuert -->
    <button type="submit" data-content-ignoreinteraction>
      Wort einreichen
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useContentTracking } from '@composables/useContentTracking'

const root = ref<HTMLFormElement | null>(null)
useContentTracking(root)
</script>
```

### 4f: RandomWordButton.vue

**Datei**: `src/components/RandomWordButton.vue`

Einfacher Discovery-CTA. Impression = Button wurde gesehen, Interaction = Klick.

```vue
<template>
  <a
    ref="root"
    data-track-content
    data-content-name="Random Word CTA"
    data-content-piece="Zufälliges Wort"
    :data-content-target="randomUrl"
  >
    Zufälliges Wort
  </a>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useContentTracking } from '@composables/useContentTracking'

const root = ref<HTMLAnchorElement | null>(null)
useContentTracking(root)
</script>
```

**Hinweis**: Erst Datei lesen — prüfen ob `root` bereits als `ref` existiert und ob die Komponente schon reaktive Props für die URL hat.

### 4g: MainMenu.vue

**Datei**: `src/components/header/MainMenu.vue`

Das Dropdown-Menü mit Game-Link, Wort-Vorschlag, Word-Index und Settings. Content Tracking auf dem Menü-Container zeigt, welche Nav-Items angeklickt werden.

```vue
<template>
  <div
    ref="root"
    data-track-content
    data-content-name="Main Menu"
    data-content-piece="Navigation"
    data-content-target="#"
  >
```

**Hinweis**: `data-content-target="#"` da das Menü mehrere Ziel-Links hat. Matomo trackt den tatsächlich geklickten `href`-Link als Interaction-Target automatisch.

### Verifikation Phase 4
```bash
grep -rn "useContentTracking" src/components/
# Muss WordOfTheDay, AlertBanner, InstallApp, WordSuggestHint zeigen
pnpm test:unit
```

---

## Phase 5: Vue-Komponenten — Word Detail & Spiel

### 5a: RelatedWords.vue

**Datei**: `src/components/RelatedWords.vue` (oder `src/components/word/RelatedWords.vue`)

- Tracking auf der Section-Ebene (nicht pro Wort)
- `data-content-name="Related Words"`
- `data-content-piece` = Wort-Name der Hauptseite (Prop)

### 5b: BonShareView.vue

**Datei**: `src/components/games/BonShareView.vue`

Dieses Vue-Island wird via `client:only="vue"` auf `/games/berliner-oder-nicht/share` eingebunden. Da das Ergebnis aus URL-Params geladen wird, muss `data-content-piece` reaktiv gesetzt werden.

```vue
<template>
  <div
    ref="root"
    class="c-bon-share-view"
    data-track-content
    data-content-name="BON Share Result"
    :data-content-piece="contentPiece"
    data-content-target="/games/berliner-oder-nicht"
  >
```

In `<script setup>`:

```ts
import { ref, computed } from 'vue'
import { useContentTracking } from '@composables/useContentTracking'

const root = ref<HTMLElement | null>(null)
useContentTracking(root)

const contentPiece = computed(() =>
  payload.value
    ? `Score ${payload.value.score}${payload.value.playerName ? ` – ${payload.value.playerName}` : ''}`
    : 'Spielergebnis'
)
```

**Messwert**: Impression = jemand sieht ein geteiltes Ergebnis; Interaction = Klick auf „Selbst spielen" → zeigt Share-Funnel-Conversion.

**Hinweis**: Der „Selbst spielen"-Link (`data-content-target`) wird von Matomo automatisch als Interaction erfasst — kein `@click`-Handler nötig (kein Doppel-Tracking mit Event Tracking, da dort kein `trackEvent` auf dem Link liegt).

### 5c: BonCard.vue

**Datei**: `src/components/games/BonCard.vue`

- Karte wird dynamisch per `v-for` gemountet → `useContentTracking` auf dem Card-Root
- `data-content-name="Bon Card"`
- `data-content-piece` = das angezeigte Wort
- `data-content-target="javascript:answer"` (kein echter Link)
- `data-content-ignoreinteraction` NICHT setzen — Klick-Interaktionen sollen erfasst werden

### Verifikation Phase 5
```bash
grep -rn "data-track-content" src/components/word/ src/components/games/
pnpm test:unit
```

---

## Phase 6: Verifikation & Qualitätssicherung

### 6.1 Dev-Server Debug

```js
// In Browser-Konsole auf der laufenden App
_paq.push(['logAllContentBlocksOnPage'])
// Muss alle implementierten Blöcke listen
```

### 6.2 Anti-Pattern-Check

```bash
# Kein trackAllContentImpressions im Quellcode
grep -rn "trackAllContentImpressions" src/
# Erwartetes Ergebnis: keine Treffer

# Alle data-content-piece haben Werte (kein bare attribute)
grep -rn 'data-content-piece[^=]' src/
# Erwartetes Ergebnis: keine Treffer

# Alle data-track-content-Elemente haben content-name und piece
grep -rn "data-track-content" src/
# Jede Zeile manuell auf vollständigkeit prüfen
```

### 6.3 Test-Suite

```bash
pnpm test:unit
# Alle 1600+ Tests bestehen
```

### 6.4 Type-Check

```bash
pnpm typechecking
# Keine neuen Fehler
```

### 6.5 Vollständigkeitscheckliste

- [ ] `SingleWord.vue` — `data-content-target` gesetzt
- [ ] `analytics.ts` — `trackContentImpressionsWithinNode` exportiert
- [ ] `useContentTracking.ts` — Composable erstellt
- [ ] `GameCtaCard.astro` — Content Tracking Attribute
- [ ] `FactCard.astro` — Content Tracking Attribute
- [ ] `BookRecommendations.astro` — Content Tracking Attribute
- [ ] `WordOfTheDay.vue` — Attribute + `useContentTracking`
- [ ] `AlertBanner.vue` — Attribute + `useContentTracking`
- [ ] `InstallApp.vue` — Attribute + `useContentTracking` + `data-content-ignoreinteraction` prüfen
- [ ] `WordSuggestHint.vue` — Attribute + `useContentTracking`
- [ ] `RelatedWords.vue` — Attribute + `useContentTracking`
- [ ] `BonShareView.vue` — Attribute + `useContentTracking` + reaktives `data-content-piece`
- [ ] `BonCard.vue` — Attribute + `useContentTracking`

**Phase 3 (neue Astro-Komponenten):**

- [ ] `WordAlphabetNav.astro` — Attribute auf nav-Root
- [ ] `WordAnagrams.astro` — Attribute auf section-Root
- [ ] `WordSimilarSpelling.astro` — Attribute auf section-Root
- [ ] `WordHero.astro` — Attribute auf header-Root
- [ ] `Footer.astro` — Attribute nur auf Funding-/Install-Container

**Phase 4 (neue Vue-Islands):**

- [ ] `SuggestWordForm.vue` — Attribute + `useContentTracking` + `data-content-ignoreinteraction` auf Submit
- [ ] `RandomWordButton.vue` — Attribute + `useContentTracking`
- [ ] `MainMenu.vue` — Attribute + `useContentTracking`

---

## Bewusst ausgeschlossene Komponenten

Diese wurden geprüft und explizit NICHT in den Plan aufgenommen:

| Komponente | Grund |
| ---------- | ----- |
| `ImageGallery.astro` | Hat bereits `trackEvent('Lightbox', …)` — Content Tracking redundant |
| `SearchModalTrigger.vue` | Hat bereits `trackEvent('Search', …)` — redundant |
| `WordOptionDropdown.vue` | Hat 3× `trackEvent` — Content Tracking würde Konflikte erzeugen |
| `SocialList.vue` | Externe Klicks via Referral-Analytics besser messbar |
| `AudioPlayerList.vue` | Audio-Plays sind kein Link-CTA, kein sinnvoller `data-content-target` |
| `CookieConsent.vue` | Einzelner Button, Event Tracking ausreichend |
| `AppSettings.vue` / `AppSettingsNavCard.vue` | Settings-Seiten haben anderes User-Intent, Conversion-Funnel nicht relevant |
| `AppSettingsNotifications.vue` | Notification-Permission hat eigenes `trackEvent` in Store |
| `PwaCacheOverview.vue` | Technische UI, kein Content-Discovery-Funnel |
| `MainHeader.vue` | Zu breit; Kinder-Komponenten (Menu, Search) tracken gezielter |
| `ColorModeToggle.vue` | Settings-Toggle, kein Content-CTA |
| `ScrollToTop.vue` | Utility, kein Content |
