# Plan: Themen-Multiselect-Filter (analog zu Worttyp)

**Ziel**: Im Wortlisten-Filter-Panel einen zweiten Multiselect-Filter für `Themen` hinzufügen, der exakt dem bestehenden `Worttyp`-Filter folgt (gleiche UI-Pattern, gleiche Store-Mechanik, gleiche Orama-`where`-Logik). Zusätzlich: `@vueform/multiselect`s hardcodierten englischen Text `"X options selected"` auf Deutsch übersetzen — sowohl für den neuen Themen-Filter als auch (Bugfix) für den bestehenden Worttyp-Filter.

---

## Phase 0: Bestandsaufnahme (bereits erledigt — Referenz für alle Phasen)

### Worttyp-Filter — vollständiger Ist-Zustand

**UI-Komponente**: `src/components/filter/WordTypeFilter.vue`
```vue
<template>
  <nav class="c-word-type-filter">
    <Multiselect
      v-model="value"
      mode="multiple"
      :close-on-select="false"
      :hide-selected="false"
      :options="wordSearch.wordTypes"
      locale="de"
      fallback-locale="en"
      class="c-word-type-filter__select"
      placeholder="Worttypen filtern"
      :aria="{ 'aria-label': 'Worttypen filtern', 'aria-placeholder': undefined, 'aria-multiselectable': undefined }"
      @select="onSelect(value)"
      @deselect="onSelect(value)"
    />
  </nav>
</template>

<script setup lang="ts">
import { useStore, useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/wordList.ts";
import { trackEvent } from "@utils/analytics";
import Multiselect from "@vueform/multiselect";

const wordSearch = useStore($wordSearch);
const value = useVModel($wordSearch, "activeWordTypeFilter");

const onSelect = (value: string[]) => {
  trackEvent("WordList", "Filter", `Word Type: ${value.join(", ")}`);
};
</script>

<style lang="scss">
@use "@styles/components/word-type-filter";
@use "@vueform/multiselect/themes/default.css";
</style>
```

**Multiselect-Lib**: `@vueform/multiselect@2.6.11` (`node_modules/@vueform/multiselect`). `locale`/`fallback-locale` Props existieren, aber diese Version bündelt **keine** Locale-Dateien (`find node_modules/@vueform/multiselect -iname "*locale*"` → leer). Die Props sind aktuell wirkungslos.

**Wichtiger Fund — Grund für den Screenshot-Bug**: In `node_modules/@vueform/multiselect/dist/multiselect.mjs:475-479`:
```js
const multipleLabelText = computed(() => {
  return multipleLabel.value !== undefined
    ? multipleLabel.value(iv.value, $this)
    : (iv.value && iv.value.length > 1 ? `${iv.value.length} options selected` : `1 option selected`)
});
```
`"3 options selected"` ist der **hardcodierte englische Default-Text**, gerendert wenn kein `multipleLabel`-Prop übergeben wird. Fix: `multipleLabel`-Funktion als Prop übergeben, die deutschen Text zurückgibt. `locale`/`fallback-locale` bleiben harmlos (keine Wirkung, kein Löschen nötig — aber optional entfernbar da tot).

**Store**: `src/stores/wordList.ts`
- `WordList`-Type: `activeWordTypeFilter: string[]` (Zeile 39), `wordTypes: string[]` (Zeile 55)
- Default in `$wordSearch` (persistentMap): `activeWordTypeFilter: []` (63), `wordTypes: []` (78)
- `$activeFilterCount` computed zählt `activeWordTypeFilter?.length` (113)
- `resetAll()` setzt `activeWordTypeFilter` zurück auf `[]` (126) — **fehlt aktuell für `wordTypes`-Optionsliste selbst (korrekt, die bleibt), aber ein neuer `activeThemenFilter` MUSS hier ergänzt werden**
- `wordTypes`-Optionsliste wird via `onMount($wordSearch, ...)` (254-265) aus `/api/search/meta.json` geladen (`getSearchMeta()`, Zeile 242-252) und mit `$wordSearch.setKey("wordTypes", meta.wordTypes)` gesetzt
- Orama-Schema `wordSchema` (271-292): `berlinerischWordTypes: "enum[]"` — **`themen` Feld fehlt hier komplett**, obwohl `src/pages/api/search/index.json.ts` bereits ein `themen: string[]` Feld pro Wort liefert (aus PR #1658)
- `buildWhere()` (302-343): Für Worttyp bei Zeile 334-341:
  ```ts
  if (Array.isArray(wordSearch.activeWordTypeFilter) && wordSearch.activeWordTypeFilter.length > 0) {
    where.berlinerischWordTypes = { containsAny: wordSearch.activeWordTypeFilter };
  }
  ```

**Meta-Endpoint**: `src/pages/api/search/meta.json.ts` liefert aktuell `{ availableWordGroups, rangeFilterMinMax, wordTypes }`. `themen` fehlt. Quelle für Themen-Optionen sollte **`fetchAllThemen()`** aus `@services/api.ts` sein (liefert bereits `{ name, slug, description, count, seo }[]`, sauberer als die NLP-Tag-Herleitung bei `wordTypes`) — **nicht** aus den Wörtern selbst ableiten.

**Entschieden (User, 2026-07-02)**:
- Kein Beta-Badge für Themen-Filter
- Gleiches Farbschema (Orange/Blue) wie Worttyp-Filter übernehmen
- Hilfetext-Vorschlag aus Phase 4 passt so
- `@use "@vueform/multiselect/themes/default.css";` wird aktuell in `WordTypeFilter.vue` importiert (Zeile 40) — würde bei `ThemenFilter.vue` doppelt importiert. Fix: CSS-Import **einmalig in der übergeordneten Komponente** `WordFilter.vue` platzieren, aus `WordTypeFilter.vue` entfernen, in `ThemenFilter.vue` gar nicht erst hinzufügen. Siehe Phase 1 (Anpassung `WordTypeFilter.vue`) und Phase 4 (Import in `WordFilter.vue`).

**Parent-Komponente**: `src/components/word-search/WordFilter.vue` — Filter-Flyout, komponiert alle Filter linear:
```vue
<div class="c-filter-search__headline-wrap" role="group" aria-labelledby="filter-worttyp">
  <p id="filter-worttyp" class="c-filter-search__sub-label">Worttyp</p>
  <BadgeTag> Beta </BadgeTag>
</div>
<i>
  Redewendungen und Wörter können unterschiedliche Worttypen beinhalten, Du kannst hier
  deshalb nach mehreren Typen filtern.
</i>
<WordTypeFilter />
```
Analog wird ein `<ThemenFilter />`-Block eingefügt, direkt nach dem Worttyp-Block. **Kein** `Beta`-Badge nötig für Themen (neu, aber nicht experimentell wie Worttyp — Entscheidung: siehe Phase 2, ggf. mit User klären ob Beta-Badge gewünscht).

**SCSS**: `src/styles/components/_word-type-filter.scss` — nutzt `@vueform/multiselect`-CSS-Custom-Properties (`--ms-*`) für Theming, `butler-mx.dark-mode-class` Mixin für Dark Mode. Analog: `_themen-filter.scss` mit identischem Pattern (eigene BEMIT-Klasse `.c-themen-filter`).

**Test-Template**: `src/tests/unit/components/filter/WordTypeFilter.test.ts` — mockt `@vueform/multiselect` als Stub-Komponente mit `props`/`template`/`emits`, mockt `@nanostores/vue` (`useStore`, `useVModel`), mockt `@stores/wordList.ts`, mockt `@utils/analytics`. Prüft: Rendering, Props-Weitergabe (`mode`, `placeholder`, `locale`, `options`), `trackEvent`-Aufrufe bei select/deselect, v-model-Update.

### Themen-Datenquelle (bereits vorhanden aus PR #1658)

- `fetchAllThemen()` in `src/services/queries/getThemen.ts`, exportiert über `@services/api.ts` — liefert `{ name, slug, description, count, seo }[]`
- `src/pages/api/search/index.json.ts` `makeOramaSearchIndex()` liefert bereits `themen: string[]` (Slugs) pro Wort im Such-Index (Zeile ~64-66, nach dem PR-1658-Fix)
- `src/gql/entity-types.ts` / `BerlinerWordFragment` hat bereits `berlinerischThemen: { nodes: { name, slug }[] } | null` getypt

**Kein Filter-UI für Themen existiert bisher** — reines Net-New-Feature auf UI/Store-Ebene, Datenschicht ist fertig.

---

## Phase 1: Multiselect deutsche Übersetzung (Bugfix, betrifft beide Filter)

### Was umsetzen

In `WordTypeFilter.vue` einen `multipleLabel`-Prop-Handler ergänzen, der den `@vueform/multiselect`-Default `"X options selected"` durch deutschen Text ersetzt. Gleiches Pattern wird in Phase 2 für den neuen `ThemenFilter.vue` mitgegeben (nicht separat duplizieren — als kleine shared Helper-Funktion, z. B. in `@utils/helpers.ts` oder direkt lokal in beiden Komponenten dieselbe Zeile).

**Multiselect-API-Referenz** (aus `node_modules/@vueform/multiselect/dist/multiselect.mjs:475-479`):
```js
const multipleLabelText = computed(() => {
  return multipleLabel.value !== undefined
    ? multipleLabel.value(iv.value, $this)
    : (iv.value && iv.value.length > 1 ? `${iv.value.length} options selected` : `1 option selected`)
});
```
`multipleLabel` ist eine Funktion `(selectedValues, multiselectInstance) => string`. Sie MUSS als Prop übergeben werden, um den Default zu überschreiben.

### Umsetzung (Copy-Pattern)

In `WordTypeFilter.vue` (und später `ThemenFilter.vue`) im `<script setup>`:
```ts
const multipleLabel = (selected: string[]) =>
  selected.length === 1 ? "1 Option ausgewählt" : `${selected.length} Optionen ausgewählt`;
```
Im Template:
```vue
<Multiselect
  ...
  :multiple-label="multipleLabel"
  ...
/>
```

**Zusätzlich in dieser Phase (User-Entscheidung)**: `@use "@vueform/multiselect/themes/default.css";` aus `WordTypeFilter.vue`s `<style>`-Block (aktuell Zeile 40) entfernen. Der Import wandert in Phase 4 in die übergeordnete Komponente `WordFilter.vue`, damit er nur einmal global geladen wird (sonst doppelter Import sobald `ThemenFilter.vue` dazukommt). `WordTypeFilter.vue`s `<style>`-Block behält nur `@use "@styles/components/word-type-filter";`.

**Anti-Pattern-Guard**: NICHT versuchen, `locale`/`fallback-locale` funktionsfähig zu machen (keine Locale-Dateien in dieser Package-Version vorhanden — würde ins Leere laufen). NICHT eine `i18n`-Library nachrüsten für diesen einen String — Overkill für ein Wort.

### Verification

- `pnpm vitest run src/tests/unit/components/filter/WordTypeFilter.test.ts` — bestehende Tests dürfen nicht brechen
- Neuer Test-Case: `multipleLabel`-Prop liefert erwarteten deutschen String für 1 und >1 ausgewählte Werte
- Manuell im Dev-Server: Wortliste öffnen → Filter-Flyout → Worttyp-Filter → mehrere Optionen wählen → Text zeigt z. B. "3 Optionen ausgewählt" statt "3 options selected"

---

## Phase 2: Themen-Optionen in Store + Meta-Endpoint + Orama-Schema

### Was umsetzen

**2a. `src/pages/api/search/meta.json.ts` erweitern**

Themen-Liste aus `fetchAllThemen()` beziehen (nicht aus Wörtern ableiten — die Quelle ist bereits sauber strukturiert):
```ts
import { fetchAllThemen } from "@services/api.ts";
// ...
const allThemen = await fetchAllThemen();
const themen = allThemen
  .filter((t): t is typeof t & { slug: string; name: string } => !!t.slug && !!t.name)
  .map((t) => ({ name: t.name, slug: t.slug }))
  .sort((a, b) => a.name.localeCompare(b.name, "de"));
```
`meta`-Objekt um `themen` ergänzen:
```ts
const meta = {
  availableWordGroups,
  rangeFilterMinMax: minMax,
  themen,
  wordTypes,
};
```

**Wichtig**: Anders als `wordTypes` (Array von Strings — Slug = Anzeigename identisch) brauchen Themen **Slug UND Name getrennt**, da der Multiselect-Optionswert (Filter-Kriterium = Slug, matched gegen `themen: string[]` im Such-Index) sich vom Anzeigetext (Name, z. B. "Essen & Trinken") unterscheidet. `@vueform/multiselect` unterstützt Objekt-Optionen via `{ value, label }` — siehe Phase 3.

**2b. `src/stores/wordList.ts` erweitern**

- `WordList`-Type: `activeThemenFilter: string[]` und `themen: { name: string; slug: string }[]` ergänzen (analog zu `activeWordTypeFilter`/`wordTypes`, Zeile 39/55)
- `$wordSearch`-Defaults: `activeThemenFilter: []`, `themen: []` ergänzen (analog Zeile 63/78)
- `$activeFilterCount`: `if (wordSearch.activeThemenFilter?.length) count++;` ergänzen (analog Zeile 113)
- `resetAll()`: `$wordSearch.setKey("activeThemenFilter", []);` ergänzen (analog Zeile 126) — **NICHT** `themen`-Optionsliste selbst zurücksetzen, exakt wie bei `wordTypes`
- `getSearchMeta()`-Return-Type um `themen: { name: string; slug: string }[]` erweitern (Zeile 247-251)
- `onMount($wordSearch, ...)`: `$wordSearch.setKey("themen", meta.themen);` ergänzen (analog Zeile 259)
- `setThemenFilter(themaSlug: string)`-Funktion analog zu `setWordTypeFilter` (Zeile 174-181) — nutzt bestehende `toggleInArray`-Helper, kein neuer Code nötig, nur eine neue exportierte Funktion falls für Badge-Klicks auf Wortseiten gebraucht (nicht zwingend für den Multiselect selbst, der arbeitet direkt mit `useVModel`)
- Orama `wordSchema` (Zeile 271-292): `themen: "enum[]"` ergänzen (analog `berlinerischWordTypes: "enum[]"`)
- `stemmerSkipProperties` (Zeile 370-378): `"themen"` ergänzen, analog `"berlinerischWordTypes"` — Themen-Slugs sollen nicht gestemmt werden
- `buildWhere()` (Zeile 302-343): neuer Block analog Zeile 334-341:
  ```ts
  if (Array.isArray(wordSearch.activeThemenFilter) && wordSearch.activeThemenFilter.length > 0) {
    where.themen = { containsAny: wordSearch.activeThemenFilter };
  }
  ```

**Anti-Pattern-Guard**: NICHT `themen` aus den Such-Index-Wörtern selbst ableiten wie bei `wordTypes` (dort historisch bedingt durch NLP-Tags nötig) — `fetchAllThemen()` existiert bereits als saubere, direkte Quelle und liefert bereits sortierte, eindeutige Themen mit Name+Slug. NICHT den bestehenden `wordTypes`-Mechanismus umbauen — nur parallel ergänzen.

### Verification

- `pnpm gql:generate` NICHT nötig (keine neue GQL-Query, `fetchAllThemen` existiert bereits)
- `curl localhost:4321/api/search/meta.json | jq .themen` → Array von `{ name, slug }`
- `pnpm vitest run src/tests/unit/services` — falls ein Test für `meta.json.ts` existiert, grep vorher prüfen: `find src/tests/unit -iname "*meta*"`
- TypeScript: `pnpm typechecking` (gezielt, nicht nach jedem Edit)

---

## Phase 3: `ThemenFilter.vue`-Komponente

### Was umsetzen

Neue Datei `src/components/filter/ThemenFilter.vue`, 1:1 Kopie des `WordTypeFilter.vue`-Patterns:

```vue
<template>
  <nav class="c-themen-filter">
    <Multiselect
      v-model="value"
      mode="multiple"
      :close-on-select="false"
      :hide-selected="false"
      :options="themenOptions"
      :multiple-label="multipleLabel"
      class="c-themen-filter__select"
      placeholder="Themen filtern"
      :aria="{
        'aria-label': 'Themen filtern',
        'aria-placeholder': undefined,
        'aria-multiselectable': undefined,
      }"
      @select="onSelect(value)"
      @deselect="onSelect(value)"
    />
  </nav>
</template>

<script setup lang="ts">
import { useStore, useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/wordList.ts";
import { trackEvent } from "@utils/analytics";
import { computed } from "vue";
import Multiselect from "@vueform/multiselect";

const wordSearch = useStore($wordSearch);
const value = useVModel($wordSearch, "activeThemenFilter");

const themenOptions = computed(() =>
  wordSearch.value.themen.map((t) => ({ value: t.slug, label: t.name })),
);

const multipleLabel = (selected: string[]) =>
  selected.length === 1 ? "1 Option ausgewählt" : `${selected.length} Optionen ausgewählt`;

const onSelect = (value: string[]) => {
  trackEvent("WordList", "Filter", `Themen: ${value.join(", ")}`);
};
</script>

<style lang="scss">
@use "@styles/components/themen-filter";
</style>
```

**WICHTIG — Objekt-Optionen bei `@vueform/multiselect`**: Anders als `WordTypeFilter` (Optionen sind Plain-Strings, `:options="wordSearch.wordTypes"`) braucht `ThemenFilter` `{ value, label }`-Objekte, da Anzeigename (Name) und Filterkriterium (Slug) unterschiedlich sind. `@vueform/multiselect` unterstützt dieses Format nativ über `:options="[{ value: 'a', label: 'A' }]"` — **vor Implementierung verifizieren** durch Lesen von `node_modules/@vueform/multiselect/README.md` bzw. der TS-Typen in `node_modules/@vueform/multiselect/dist/multiselect.d.ts`, Abschnitt zu `options`-Prop-Format, um kein API-Detail zu erfinden.

**CSS-Import (User-Entscheidung)**: `@use "@vueform/multiselect/themes/default.css";` wird in `ThemenFilter.vue` **NICHT** importiert — wandert stattdessen einmalig in die übergeordnete Komponente `WordFilter.vue` (Phase 4). `ThemenFilter.vue`s `<style>`-Block enthält nur `@use "@styles/components/themen-filter";`. CSS ist in diesem Projekt nicht scoped, ein globaler Import genügt für alle Multiselect-Instanzen.

### Referenz-Dateien zum Kopieren

- Struktur: `src/components/filter/WordTypeFilter.vue` (komplett)
- SCSS-Pattern: `src/styles/components/_word-type-filter.scss` → neue Datei `src/styles/components/_themen-filter.scss`, `.c-word-type-filter` → `.c-themen-filter` umbenennen, `--ms-*`-Custom-Properties identisch übernehmen (gleiches Orange/Blue-Theming wie Worttyp, es sei denn User möchte visuelle Abgrenzung — dann `--orange-*` Variablen gegen andere Palette tauschen, siehe Phase 5 Klärung)

### Verification

- Komponente rendert `.c-themen-filter` nav
- Optionen kommen korrekt aus `$wordSearch.themen` (nicht aus `wordTypes`)
- `multipleLabel` liefert deutschen Text

---

## Phase 4: Integration in `WordFilter.vue`

### Was umsetzen

In `src/components/word-search/WordFilter.vue` nach dem bestehenden Worttyp-Block (Zeile 22-32) einfügen:

```vue
<div class="c-filter-search__headline-wrap" role="group" aria-labelledby="filter-themen">
  <p id="filter-themen" class="c-filter-search__sub-label">Themen</p>
</div>

<i>
  Filtere nach thematischen Kategorien wie Essen &amp; Trinken, Alkohol &amp; Kneipe
  oder Schimpfwörter.
</i>

<ThemenFilter />
```

Import ergänzen im `<script setup>`:
```ts
import ThemenFilter from "@components/filter/ThemenFilter.vue";
```

**Entschieden**: Kein Beta-Badge für den Themen-Block (im Gegensatz zu Worttyp).

**CSS-Import verschieben (User-Entscheidung, siehe Phase 1 + 3)**: Der `<style>`-Block von `WordFilter.vue` (aktuell nur `@use "@styles/components/switch";`, Zeile 122-123) bekommt zusätzlich den Multiselect-Theme-Import, der bisher in `WordTypeFilter.vue` lag:
```scss
@use "@styles/components/switch";
@use "@vueform/multiselect/themes/default.css";
```
Damit wird das CSS genau einmal geladen, unabhängig davon wie viele Multiselect-Filter (`WordTypeFilter`, `ThemenFilter`) `WordFilter.vue` komponiert.

### Verification

- `pnpm vitest run src/tests/unit/components/word-search` (falls Test für `WordFilter.vue` existiert — `find src/tests/unit -iname "*WordFilter*"` vorher prüfen)
- Manuell: Filter-Flyout öffnen, Themen-Sektion sichtbar zwischen Worttyp und Berolinismus-Switch, Multiselect-Styling für beide Filter weiterhin korrekt (CSS lädt trotz Verschiebung)
- `grep -rn "multiselect/themes/default.css" src/` → genau 1 Treffer (in `WordFilter.vue`)

---

## Phase 5: Tests

### Was umsetzen

Neue Datei `src/tests/unit/components/filter/ThemenFilter.test.ts`, 1:1 Kopie-Pattern von `WordTypeFilter.test.ts`, aber:
- `mockWordSearch` mit `themen: [{ name: "Essen & Trinken", slug: "essen-trinken" }, ...]` statt `wordTypes: [...]`
- `useVModel` mockt `activeThemenFilter` statt `activeWordTypeFilter`
- Options-Assertion prüft `[{ value: "essen-trinken", label: "Essen & Trinken" }, ...]`
- `trackEvent`-Assertion prüft `"Themen:"` Präfix statt `"Word Type:"`
- Neuer Test: `multipleLabel`-Funktion liefert korrekten deutschen Text für 1 / >1 Werte

Ergänzend in `WordTypeFilter.test.ts`: Test-Case für den neuen `multipleLabel`-Prop (Phase 1).

Falls Store-Level-Tests für `wordList.ts` existieren (`find src/tests/unit -iname "*wordList*"`) — vorher lesen und `buildWhere()`/`resetAll()`/`$activeFilterCount` Tests um `activeThemenFilter`-Fälle ergänzen, analog zu bestehenden `activeWordTypeFilter`-Fällen.

### Verification

- `pnpm vitest run src/tests/unit/components/filter/ThemenFilter.test.ts`
- `pnpm vitest run src/tests/unit/components/filter/WordTypeFilter.test.ts`
- `pnpm vitest run src/tests/unit/stores` (falls vorhanden)
- `pnpm lint` — BEMIT-Namenskonvention, Sortierung etc.

---

## Finale Verifikation (gesamter Plan)

1. `pnpm typechecking` — keine neuen TS-Fehler
2. `pnpm lint` — sauber
3. `pnpm test:unit` — alle Tests grün, keine Regressionen in bestehenden Worttyp-/WordFilter-/wordList-Tests
4. Manuell im Dev-Server (`pnpm dev`):
   - Wortliste → Filter öffnen → Themen-Multiselect sichtbar, Optionen mit deutschen Namen (nicht Slugs) angezeigt
   - Mehrere Themen wählen → "X Optionen ausgewählt" (deutsch) statt "X options selected"
   - Worttyp-Filter zeigt ebenfalls deutschen Text nach Auswahl
   - Wortliste filtert korrekt nach gewähltem Thema (Ergebnis-Count ändert sich)
   - `resetAll()` (Zurücksetzen-Button) leert auch den Themen-Filter
   - Dark Mode: Themen-Filter-Styling konsistent mit Worttyp-Filter
5. `grep -rn "options selected" src/` → kein Treffer mehr im eigenen Code (String kommt nur noch aus der Library, wird aber durch `multipleLabel` überschrieben)

---

## Entscheidungen (final, User 2026-07-02)

1. **Beta-Badge**: kein Beta-Badge für Themen-Filter.
2. **Farb-Theming**: gleiche Orange/Blue-Palette wie Worttyp-Filter.
3. **Hilfetext**: Vorschlag "Filtere nach thematischen Kategorien wie Essen & Trinken, Alkohol & Kneipe oder Schimpfwörter." übernommen.
4. **CSS-Import**: `@vueform/multiselect/themes/default.css` einmalig in `WordFilter.vue` statt in jeder einzelnen Filter-Komponente (siehe Phase 1, 3, 4).
