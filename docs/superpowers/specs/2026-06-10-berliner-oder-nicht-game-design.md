# Berliner oder nicht? — Swipe-Game Design Spec

**Date:** 2026-06-10  
**Route:** `/games/berliner-oder-nicht`  
**Status:** Approved

---

## Overview

Ein süchtig machendes Swipe-Kartenspiel: echtes Berlinerisch-Wort oder erfunden? Der Spieler entscheidet per Swipe/Button/Tastatur. 3 Leben, Streak-Multiplikator, Highscore in localStorage.

---

## Architecture

### Approach
Composable-driven (B): `useGame.ts` trägt alle Game-Logic, UI-Komponenten sind rein präsentational.

### New Files

```
src/pages/games/berliner-oder-nicht.astro     ← Route
src/composable/useGame.ts                      ← Game-Logic Composable
src/components/games/BerlinerOderNicht.vue     ← Root island (client:load)
src/components/games/GameCard.vue              ← Swipeable Karte
src/components/games/GameHUD.vue               ← Leben, Score, Streak
src/components/games/GameResult.vue            ← Endscreen
src/data/fakeWords.ts                          ← Fake-Wörter Dataset
src/styles/components/_berliner-oder-nicht.scss
```

---

## Data Sources

### Real Words
- Source: `/api/search/index.json` — build-time statisch, kein extra API-Call nötig
- Fetch on `onMounted` in `BerlinerOderNicht.vue`
- Fields used: `berlinerisch` (Wort), `post_name` (Slug für Link), erste Translation

### Fake Words (`src/data/fakeWords.ts`)
Statisches TS-Array, zwei Kategorien:
- **Erfunden** (~50): Klingen plausibel berlinerisch (z.B. "Schnörrke", "Wabbatz", "Pröllke")
- **Hochdeutsch** (~30): Echte dt. Wörter die nicht berlinerisch sind (z.B. "Fernseher", "Bürgersteig")

```typescript
export interface FakeWord {
  word: string
  category: 'invented' | 'hochdeutsch'
}
export const fakeWords: FakeWord[] = [ ... ]
```

---

## Game State (`useGame.ts`)

### Types

```typescript
interface GameCard {
  word: string
  isReal: boolean
  slug?: string        // für Link zur /wort/-Seite
  translation?: string // erste Translation, im Feedback anzeigen
}

interface GameState {
  phase: 'idle' | 'playing' | 'result'
  lives: number        // 0–3
  score: number
  streak: number
  bestStreak: number   // dieser Runde
  multiplier: number   // 1 | 2 | 3 | 5
  totalAnswered: number
  correctAnswers: number
  currentCard: GameCard | null
  deck: GameCard[]
  lastAnswerCorrect: boolean | null
  lastCard: GameCard | null  // für Result-Screen Link
}
```

### Persistent Stats (nanostores `persistentMap`)

```typescript
// key: "gameStats:"
interface GameStats {
  highScore: number
  bestStreak: number
  totalGamesPlayed: number
  totalCorrect: number
  totalAnswered: number
}
```

### Deck Building
- Mix: 60% real words (aus search index), 40% fake (aus `fakeWords.ts`)
- 20 Karten pro Runde, Fisher-Yates shuffle
- Deck leer → neues Deck nahtlos (endless play, keine Dopplung innerhalb einer 20er-Runde)

### Scoring

| Streak | Multiplikator | Punkte/Karte |
|--------|--------------|--------------|
| 0–2    | 1×           | 10           |
| 3–5    | 2×           | 20           |
| 6–9    | 3×           | 30           |
| 10+    | 5×           | 50           |

- Falscher Antwort: Leben −1, Streak Reset, kein Punktabzug
- Game Over bei 0 Leben

---

## Interaction

### Input
- **Swipe** (Touch/Maus): `useSwipe` aus VueUse — rechts = "Ja, Berlinerisch!", links = "Nee, erfunden!"
- **Buttons**: Zwei Buttons unter Karte (✗ / ✓ mit Lucide-Icons)
- **Keyboard**: `onKeyStroke` aus VueUse — `←` = Nein, `→` = Ja

### Card Animations
- Richtig: Karte fliegt in Swipe-Richtung aus dem Viewport, grüner Highlight-Rand
- Falsch: Shake-Animation, roter Highlight-Rand, kurze Anzeige der richtigen Antwort
- CSS Transitions via `c-game-card--exit-right` / `c-game-card--exit-left` / `c-game-card--shake` Modifier-Klassen

### Feedback nach Antwort

- Richtig + real (mit Translation): Toast `"{Wort}" = {Translation}` via `createToastNotify`
- Richtig + fake / Richtig + real (ohne Translation): kein Toast, Animation reicht
- Falsch: Overlay auf Karte ("War {Berlinerisch/erfunden}!") für 1200ms, dann nächste Karte
- Leben verloren: Lucide `heart` → `heart-crack` Animation in HUD

---

## UI Components

### `GameHUD.vue`
- Links: 3× Lucide `heart` (gefüllt) / `heart` (leer/grau) für Leben
- Mitte: Score (groß, `ffd700`-Farbe bei neuem Highscore)
- Rechts: Lucide `flame` + Streak-Zahl + Multiplikator-Badge

### `GameCard.vue`
- Zentrierte Karte mit Wort (groß, fett)
- Subtiler Swipe-Indikator-Text ("← NEE" / "JA →") verblasst an Kanten
- Progressbar unten: aktuelle Karte / 20
- Props: `word`, `isAnimatingOut`, `direction`, `isShaking`

### `GameResult.vue`
- Score, Accuracy %, BestStreak dieser Runde
- Highscore-Badge mit Lucide `trophy` wenn neuer Rekord — triggert `ConfettiEffect`
- Falls `lastCard.isReal`: Link zu `/wort/{slug}` mit Lucide `external-link`
- Share-Button: `useShare` — Text: "Ich hab {score} Punkte bei 'Berliner oder nicht?' 🐻 berliner-schnauze.de/games/berliner-oder-nicht"
- Neustart-Button mit Lucide `refresh-cw`

### `BerlinerOderNicht.vue`
- Root-Komponente, fetcht `/api/search/index.json` on mount
- Composable `useGame` einbinden
- Switcht zwischen Idle/Playing/Result via `phase`
- Einbinden von `ConfettiEffect.vue`

### Idle-Screen (phase = 'idle')

- Titel "Berliner oder nicht?", kurze Regel-Erklärung (1 Satz)
- "Spielen"-Button startet Runde (setzt `phase = 'playing'`)
- Falls `$gameStats.highScore > 0`: Aktueller Highscore + BestStreak anzeigen

---

## Icons (Lucide, via `defineAsyncComponent`)

| Verwendung | Icon |
|-----------|------|
| Leben voll | `heart` |
| Leben leer | `heart` (grau/opacity) |
| Leben verloren | `heart-crack` |
| Streak | `flame` |
| Highscore | `trophy` |
| Teilen | `share-2` |
| Neustart | `refresh-cw` |
| Wort-Link | `external-link` |
| Falsch-Button | `x` |
| Richtig-Button | `check` |

---

## SCSS

Datei: `src/styles/components/_berliner-oder-nicht.scss`  
Block-Prefix: `c-berliner-oder-nicht`, `c-game-card`, `c-game-hud`, `c-game-result`  
Kein `scoped` — BEMIT wie alle anderen Komponenten.  
Farben über bestehende SCSS-Variablen/Tokens, kein Hardcoded-Hex in Komponenten.

---

## Astro Page (`src/pages/games/berliner-oder-nicht.astro`)

- Standard `Layout.astro` wrapping
- SEO via `seoData()` helper
- `<BerlinerOderNicht client:load />`
- Kein build-time data fetching nötig (alles client-side)

---

## Analytics

`trackEvent('game', 'game_over', 'berliner-oder-nicht')` bei Game Over  
`trackEvent('game', 'new_highscore', 'berliner-oder-nicht')` bei neuem Highscore

---

## Out of Scope

- Server-side Leaderboard
- Schwierigkeitsgrade
- Multiplayer
- Sound-Effekte
