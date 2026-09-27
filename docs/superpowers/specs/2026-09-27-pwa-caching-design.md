# PWA-Caching: schnelle Updates, frische Seiten, Offline-Wörterbuch auf Wunsch

**Datum:** 2026-09-27 · **Branch:** `improvement/pwa-caching`

## Ausgangslage

- `workbox.globPatterns` precacht `**/*.html` → ~6000 HTML-Einträge, ~450 MB im Precache (Screenshot `/settings/cache`: „App-Dateien“ 454 MB).
- Jede Wortseite referenziert ~22 gehashte `/_astro/*`-Dateien. Jede JS/CSS-Änderung ändert damit jede HTML-Revision → jedes Deploy lädt alle Seiten neu. Desktop schnell, Mobile minutenlang bzw. abgebrochene Installs.
- **Bug:** `navigateFallback: "/"` erzeugt eine `NavigationRoute`, die für jede nicht-precachte Navigation sofort `/` aus dem Precache liefert — ohne Netzwerkversuch. Neue Seiten sind erst nach vollständigem SW-Update erreichbar. (Der Kommentar in `astro.config.mjs` behauptet fälschlich „misses both precache and network“.)

## Ziele

1. Updates sind auf Mobile so schnell wie auf Desktop (Precache nur App-Shell, wenige MB).
2. Neue Seiten sind sofort nach Deploy erreichbar.
3. Offline: besuchte Seiten + App-Shell + Suche. Komplettes Wörterbuch nur als Opt-in.
4. Nutzer können Update-Verhalten und Offline-Wörterbuch in den Settings steuern.

## Nicht-Ziele

- Eigener Service Worker via `injectManifest` — `generateSW` + `importScripts` reicht.
- Eintragslimit für besuchte Seiten, Bilder-Cache-Toggle (S5/S6 aus dem Brainstorming verworfen).
- Client-seitiges Rendern von Wortseiten aus dem Suchindex.

## Teil 1 — Service Worker (`astro.config.mjs`, `workbox`)

### A: App-Shell-Precache

- `globPatterns` bleibt für Assets (`js,css,svg,png,…,woff2,ico,txt`), HTML nur noch: `*.html` (oberste Ebene: Startseite, `settings`, `spenden`, …), `games/**/*.html`, `settings/**/*.html`.
- `globIgnores` ergänzt: `wort/**`, `changelog/**`, `magazin/**`, `themen/**` (plus bestehend `og/**`, `screenshots/**`).
- Migration: Workbox entfernt beim `activate` alle Precache-Einträge, die nicht mehr im Manifest stehen → Bestandsnutzer bekommen die ~450 MB automatisch zurück. Hinweis im User-Changelog, dass offline gespeicherte Wortseiten jetzt über das Offline-Wörterbuch kommen.

### B: Navigation NetworkFirst

- `navigateFallback` entfernen.
- Neue `runtimeCaching`-Route (vor den bestehenden):
  - `urlPattern: ({ request }) => request.mode === "navigate"`
  - `handler: "NetworkFirst"`, `cacheName: "pages"`, `networkTimeoutSeconds: 3`
  - `cacheableResponse: { statuses: [200] }`
  - `precacheFallback: { fallbackURL: "/" }` (Precache-Key für `/` beim Implementieren gegen `sw.js` prüfen, `build.format: "file"`)
  - **Kein** `expiration` (Entscheidung 1a): `pages` teilt sich besuchte Seiten und Offline-Wörterbuch; ein Limit würde Offline-Wörterbuch-Einträge stumm verdrängen. Größe ist durch die Seitenanzahl begrenzt, Aufräumen via „Alles leeren“.
- Precachte Seiten gewinnen weiterhin (Precache-Route ist zuerst registriert).

### C: Navigation Preload

- `navigationPreload: true`.

### D: Update-Check beim Zurückkehren

- In `onRegisteredSW(url, registration)`: bei `visibilitychange` → `visible` `registration.update()`, gedrosselt auf max. 1× pro 30 min.

### Bekannte Grenze

Veraltete gecachte Seiten können offline auf gelöschte `/_astro`-Dateien verweisen → Text lesbar, Vue-Islands evtl. inaktiv. Für das Offline-Wörterbuch abgefedert durch Auto-Re-Sync nach Updates (Teil 2).

## Teil 2 — Settings & Datenfluss

### Store `@stores/pwaSettings.ts` (`persistentAtom`, Muster wie `darkMode.ts`)

```ts
type UpdateMode = "prompt" | "auto" | "next-start";
$updateMode: UpdateMode              // Default "prompt"
$offlineDictionary: {
  enabled: boolean;                  // Default false
  wifiOnly: boolean;                 // Default true
  syncedVersion: string | null;      // package.json version des letzten vollständigen Syncs
}
```

### S3: Update-Verhalten (`src/services/pwa.ts`, `onNeedReload`)

| Modus | Verhalten |
|---|---|
| `prompt` (Default) | Wie heute: Tab sichtbar → Toast „Jetzt aktualisieren“; Tab verborgen → Notification (falls erlaubt) + stilles Reload. |
| `auto` (Entscheidung 2c) | Tab verborgen → Reload sofort. Tab sichtbar → Update als „pending“ merken; bei der nächsten ClientRouter-Navigation volles Reload auf das Ziel (`astro:before-preparation` abfangen, `location.href = event.to.href`). Kein Unterbrechen von BON, Formularen o. ä. |
| `next-start` | Kein Reload, kein Toast. Neue Version ab nächstem vollen Seitenaufruf/App-Start. |

Das „erfolgreich aktualisiert“-Toast (`PWA_UPDATED_KEY`) bleibt für `prompt` und `auto`.

### S1: Offline-Wörterbuch (`src/services/offlineDictionary.ts`)

**URL-Liste:** Slugs aus `/api/search/index.json` (bereits via SWR gecacht) → `/wort/<slug>`. Vor dem Start werden URLs übersprungen, die schon in `pages` liegen *und* `syncedVersion === version` ist.

**Zwei Download-Wege**, gewählt per Feature-Detection:

1. **Background Fetch** (`"backgroundFetch" in registration`, Chromium):
   - `registration.backgroundFetch.fetch("offline-dictionary", urls, { title: "Berliner Schnauze – Offline-Wörterbuch", icons, downloadTotal })`.
   - Läuft weiter, wenn die App geschlossen ist; Browser zeigt eigene Download-UI.
   - Handler in `public/sw-background-fetch.js`, eingebunden via `workbox.importScripts: ["/sw-background-fetch.js"]`:
     - `backgroundfetchsuccess`: alle Records → `caches.open("pages").put(request, response)`, dann `event.updateUI({ title: "Offline-Wörterbuch bereit" })`, Clients per `postMessage({ type: "offline-dictionary-done" })` informieren.
     - `backgroundfetchfail` / `backgroundfetchabort`: erfolgreiche Records trotzdem cachen, Clients informieren.
     - `backgroundfetchclick`: `clients.openWindow("/settings/cache")`.
   - Fortschritt in der Seite: `registration.backgroundFetch.get("offline-dictionary")` → `progress`-Event (`downloaded`/`downloadTotal`).
   - Abbrechen: `bgFetch.abort()`.
2. **Seitenkontext-Fallback** (Firefox, Safari):
   - `fetch` + `caches.open("pages").put()`, 4 parallel.
   - Läuft über ClientRouter-Navigationen weiter (Modul bleibt geladen); beim App-Schließen pausiert, beim nächsten Start Fortsetzung (Skip-Logik oben).
   - Pause/Abbrechen über `AbortController`; `offline`-Event pausiert.

**Fortschritt-Store:** `$offlineDictionaryProgress: { state: "idle" | "running" | "paused" | "done" | "error"; done; total; bytes; mode: "background-fetch" | "page" }`.

**Lebenszyklus:**
- Einschalten → S4 `persist()` anfragen → Start (sofern S2 erlaubt).
- Nach Abschluss → `syncedVersion = version`.
- App-Start mit `enabled && syncedVersion !== version` → automatischer Re-Sync (sofern S2 erlaubt).
- Ausschalten → laufenden Download abbrechen, alle `/wort/*`-Einträge aus `pages` löschen, `syncedVersion = null`.
- Größenschätzung vor dem Start: Anzahl × Ø-Seitengröße (Ø aus bereits gecachten `pages`-Einträgen, sonst Konstante ~75 KB).

### S2: Nur im WLAN

- `navigator.connection?.type` vorhanden → Toggle sichtbar; Start/Re-Sync nur bei `type === "wifi" | "ethernet"`. Sonst Status „wartet auf WLAN“, Start bei `connection.change`.
- API fehlt (Firefox, Safari, Desktop-Chromium ohne `type`) → Toggle ausgeblendet, kein Gate.
- `navigator.connection?.saveData === true` → nie automatisch starten (manueller Start erlaubt).
- Grenze: Ein gestarteter Background Fetch läuft auch nach Wechsel ins Mobilnetz weiter (Browser-gesteuert) — im UI-Hinweistext erwähnen.

### S4: Dauerhafter Speicher

- Status via `navigator.storage.persisted()`, Button „Speicher dauerhaft reservieren“ → `navigator.storage.persist()`. Automatisch beim Einschalten von S1.
- Ergebnis „abgelehnt“ verständlich erklären (Chrome entscheidet heuristisch, z. B. nach Installation).

### Cache-Übersicht

- `BUCKET_NAME_MAP` in `useCacheStorage.ts`: `pages` → „Besuchte Seiten“.

## Teil 3 — UI (Umsetzung mit `/impeccable`)

Die visuelle Umsetzung erfolgt über den `impeccable`-Skill, gemäß `DESIGN.md` / `PRODUCT.md`.

- **`/settings`**: neues Fieldset „App-Updates“ (S3) im Stil des `ColorModePicker` (native Radio-Fieldset), neue Komponente `AppSettingsUpdates.vue`.
- **`/settings/cache`**: Panel „Offline-Wörterbuch“ oben (neue Komponente `PwaOfflineDictionary.vue`): Toggle S1 mit Größenschätzung, Fortschritt (done/total, MB, Modus), Pause/Fortsetzen/Abbrechen (Pause nur im Seitenkontext-Modus), Toggle S2 (nur wenn unterstützt), S4-Status + Button, Hinweistexte (Background-Fetch-Grenze, `saveData`).
- Analytics via `trackEvent("App", …, "PWA")` für: Update-Modus geändert, Offline-Wörterbuch an/aus/fertig/Fehler, Persist angefragt/Ergebnis.

## Tests

- **Unit (Vitest):**
  - `pwaSettings.ts`: Defaults, Encode/Decode.
  - `pwa.ts`: je Update-Modus × Sichtbarkeit; `auto` + sichtbar → Reload erst bei `astro:before-preparation`; Update-Check-Drosselung.
  - `offlineDictionary.ts`: Skip-Logik, Pause/Fortsetzen, WLAN-Gate, `saveData`, Wahl Background Fetch vs. Seitenkontext, Ausschalten löscht Einträge, `syncedVersion`-Re-Sync. `caches`, `fetch`, `navigator.connection`, `registration.backgroundFetch` gemockt.
  - `public/sw-background-fetch.js`: Event-Handler mit gemocktem `self`/`caches`.
  - Neue Vue-Komponenten: Rendering je Zustand, Toggle-Verfügbarkeit.
- **E2E (Playwright, Produktions-Build):** Navigation auf eine nicht precachte Wortseite liefert die echte Seite (nicht `/`); offline liefert eine besuchte Wortseite aus `pages`, eine unbesuchte die Startseite.

## Offene Implementierungsdetails (beim Umsetzen verifizieren)

- Precache-Key von `/` für `precacheFallback` im generierten `sw.js`.
- `astro:before-preparation`: sauberster Weg, auf volles Reload umzulenken (Cancel + `location.href` vs. `event.loader` überschreiben).
- Background Fetch mit ~3600 Requests in einem Fetch: Chrome-Limits prüfen; falls nötig in Chunks (z. B. pro Anfangsbuchstabe) aufteilen.
