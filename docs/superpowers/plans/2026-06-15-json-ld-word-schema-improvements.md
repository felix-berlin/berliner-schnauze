# Plan: JSON-LD Schema Markup Verbesserungen für Wortseiten

**Datei:** `src/pages/wort/[...wordSlug].astro`  
**Funktion:** `schemaJson()` (Zeilen 104–128)  
**Ziel:** Reichhaltigeres `DefinedTerm`-JSON-LD durch Nutzung bereits verfügbarer Datenpunkte

---

## Realdata-Analyse (aus dist/ + API, 916 Wörter)

| Befund | Wert | Impact |
|--------|------|--------|
| `alternateName: ""` (Bug — leerer String statt weglassen) | **883/916** | Kritisch |
| `alternateName: "string"` (Bug — String statt Array) | **33/916** | Kritisch |
| `alternateName` korrekt als Array | **0/916** | — |
| Wörter mit leerem `description` | **25/916** | Hoch |
| Wörter mit Audio | **1/916** (allet-in-butta) | Niedrig |
| Wörter mit Bildergalerie | **0/916** | Niedrig (future-proof) |
| Wörter mit Übersetzungen | **892/916** | — |

> **Hinweis:** Der `dist/`-Output wurde aus einer älteren Codebasis gebaut. Der aktuelle `schemaJson()` in `[...wordSlug].astro` ist bereits besser (korrektes Array-Handling), braucht aber einen Rebuild.

---

## Phase 0: Documentation Discovery (abgeschlossen)

### Quellen

| Quelle | Befund |
|--------|--------|
| `src/gql/graphql.ts:96–101` | `WordPropertiesFragment` — vollständige Typdefinition |
| `src/gql/graphql.ts:101` | `BerlinerWordFragment` — `dateGmt`, `modifiedGmt`, `wordGroup`, SEO-Fragment |
| `src/pages/wort/[...wordSlug].astro:104–128` | Aktuelle `schemaJson()`-Funktion |
| schema.org / Context7 | `AudioObject.contentUrl`, `AudioObject.encodingFormat`, `ImageObject.url/width/height/caption` |

### Erlaubte schema.org-Properties (verifiziert)

**`DefinedTerm`** (erbt von `Thing`):
- `name`, `description`, `url`, `identifier`, `sameAs`, `alternateName` ✓ (bereits genutzt)
- `inDefinedTermSet`, `termCode`, `inLanguage` ✓ (bereits genutzt)
- `dateCreated`, `dateModified` — via `Thing`-Erbschaft
- `mainEntityOfPage` — via `Thing`
- `image` — akzeptiert `ImageObject` oder URL
- `subjectOf` — für verknüpfte Inhalte

**`ImageObject`** (für `image`-Property):
- `url` / `contentUrl` — Bild-URL
- `width`, `height` — Pixelmaße
- `caption`, `description`, `name`
- `encodingFormat` — z. B. `"image/jpeg"`

**`AudioObject`** (für Audio-Aussprache):
- `contentUrl` — MP3-URL *(verifiziert: schema.org AudioObject Beispiel)*
- `encodingFormat` — `"audio/mpeg"` *(verifiziert)*
- `name` — z. B. `"Aussprache: Kodderschnauze"`
- `description`, `inLanguage`

**Anti-Patterns:**
- `DefinedTerm` hat kein eigenes `audio`-Property — Audio über `subjectOf` oder direkt als `associatedMedia` einbinden
- `alternateName` als Array korrekt ✓ (kein String)
- `identifier` = interne WP-ID, nicht die öffentliche URL → korrekter als `@id` oder beides

### Aktuell ungenutzte verfügbare Daten

| Feld | Quelle | schema.org-Ziel |
|------|--------|-----------------|
| `word.dateGmt` | BerlinerWord | `dateCreated` |
| `word.modifiedGmt` | BerlinerWord | `dateModified` |
| `wordProps.images.nodes[0]` | WordProperties | `image` → `ImageObject` |
| `wordProps.berlinerischAudio[0]` | WordProperties | `subjectOf` → `AudioObject` |
| `wordProps.article` | WordProperties | `disambiguatingDescription` |
| `wordProps.examples[]` | WordProperties | `comment` → `Comment[]` |
| `wordDescription` (berechnet) | Zeile 66–75 | `description` (statt raw join) |

---

## Phase 1: P1 — Sofort-Wins (description, Daten, mainEntityOfPage)

**Aufwand:** ~30 Min | **SEO-Wert:** Hoch

### Aufgaben

1. **`description` verbessern**
   - Aktuell (Zeile 113): `(wordProps?.translations ?? []).map(t => t?.translation).join("; ")`
   - Fix: Die bereits berechnete Variable `wordDescription` (Zeile 66–75) verwenden
   - `wordDescription` hat bereits das Format: `„Kodderschnauze" ist Berliner Dialekt für Großes Mundwerk.`
   - Fallback: wenn `wordDescription` undefined → alten Join behalten

2. **`dateCreated` / `dateModified` hinzufügen**
   - Quelle: `word.dateGmt` → `dateCreated`
   - Quelle: `word.modifiedGmt` → `dateModified`
   - Beide sind ISO 8601 strings (z. B. `"2023-05-10T14:32:00"`) — direkt verwendbar
   - Nur setzen wenn vorhanden: `...(word.dateGmt && { dateCreated: word.dateGmt })`

3. **`mainEntityOfPage` hinzufügen**
   - Standard: `mainEntityOfPage: removeFileExtension(Astro.url.href)`
   - Verknüpft das Markup explizit mit der Seite

### Ziel-Output nach Phase 1

```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Kodderschnauze",
  "description": "„Kodderschnauze" ist Berliner Dialekt für Großes Mundwerk.",
  "dateCreated": "2023-05-10T14:32:00",
  "dateModified": "2024-01-15T09:20:00",
  "mainEntityOfPage": "https://berliner-schnauze.wtf/wort/kodderschnauze",
  "url": "https://berliner-schnauze.wtf/wort/kodderschnauze",
  "inLanguage": "de-DE",
  "identifier": "cG9zdDo0Mg==",
  "termCode": "kodderschnauze",
  "alternateName": ["Schnauze", "Klappe"],
  "sameAs": "https://de.wikipedia.org/wiki/...",
  "inDefinedTermSet": { ... }
}
```

### Verifikation Phase 1

```bash
# Nach Build: JSON-LD im HTML prüfen
pnpm build && grep -A 30 'application/ld+json' dist/wort/kodderschnauze.html
# Google Rich Results Test: https://search.google.com/test/rich-results
```

---

## Phase 2: P2 — `image` als `ImageObject`

**Aufwand:** ~20 Min | **SEO-Wert:** Mittel–Hoch (Rich Results)

### Aufgaben

Wenn `wordProps.images?.nodes?.length > 0` → erstes Bild als `ImageObject` einbinden.

Verfügbare Felder aus GraphQL:
- `images.nodes[0].sourceUrl` → `contentUrl` + `url`
- `images.nodes[0].altText` → `name` (Fallback: Wortname)
- `images.nodes[0].caption` → `caption`
- `images.nodes[0].mediaDetails.width` → `width`
- `images.nodes[0].mediaDetails.height` → `height`

### Ziel-Snippet

```ts
const firstImage = wordProps?.images?.nodes?.[0];

// In schemaJson():
...(firstImage?.sourceUrl && {
  image: {
    "@type": "ImageObject",
    url: firstImage.sourceUrl,
    contentUrl: firstImage.sourceUrl,
    ...(firstImage.altText && { name: firstImage.altText }),
    ...(firstImage.caption && { caption: firstImage.caption }),
    ...(firstImage.mediaDetails?.width && { width: firstImage.mediaDetails.width }),
    ...(firstImage.mediaDetails?.height && { height: firstImage.mediaDetails.height }),
  },
}),
```

### Verifikation Phase 2

```bash
# Wort mit Bild finden:
grep -r "images" src/pages/wort/ --include="*.astro"
# Im Build-Output prüfen:
grep -A 10 '"ImageObject"' dist/wort/[slug-mit-bild].html
```

---

## Phase 3: P3 — `subjectOf` als `AudioObject` (Aussprache)

**Aufwand:** ~20 Min | **SEO-Wert:** Mittel (Sprachassistenten, Google SGE)

### Aufgaben

Wenn `wordProps.berlinerischAudio?.length > 0` → Audio als `AudioObject` unter `subjectOf`.

Verfügbare Felder:
- `berlinerischAudio[0].audio.node.mediaItemUrl` → `contentUrl` (MP3-URL)
- `berlinerischAudio[0].gender` → für `name`-Konstruktion

**Wichtig:** `DefinedTerm` hat kein direktes `audio`-Property in schema.org.  
Korrekte Einbindung über `subjectOf` (Thing → `subjectOf` → `CreativeWork`).

### Ziel-Snippet

```ts
const firstAudio = wordProps?.berlinerischAudio?.[0];

// In schemaJson():
...(firstAudio?.audio?.node?.mediaItemUrl && {
  subjectOf: {
    "@type": "AudioObject",
    name: `Aussprache: ${wordProps?.berlinerisch}`,
    description: `Berliner Aussprache von „${wordProps?.berlinerisch}"`,
    contentUrl: firstAudio.audio.node.mediaItemUrl,
    encodingFormat: "audio/mpeg",
    inLanguage: "de-DE",
  },
}),
```

### Verifikation Phase 3

```bash
grep -A 10 '"AudioObject"' dist/wort/[slug-mit-audio].html
# Schema Markup Validator:
# https://validator.schema.org/
```

---

## Phase 4: P4 — Nice-to-Have (Artikel, Beispiele)

**Aufwand:** ~20 Min | **SEO-Wert:** Gering–Mittel

### 4a: Grammatikalischer Artikel in `disambiguatingDescription`

```ts
...(wordProps?.article && {
  disambiguatingDescription: `Berliner Dialektwort, ${wordProps.article}`,
}),
```

### 4b: Verwendungsbeispiele als `comment[]`

```ts
const exampleComments = (wordProps?.examples ?? [])
  .filter(e => e?.example)
  .map(e => ({
    "@type": "Comment",
    text: e!.example,
    ...(e?.exampleExplanation && { description: e.exampleExplanation }),
  }));

...(exampleComments.length > 0 && { comment: exampleComments }),
```

**Hinweis:** `comment` ist eine valide `Thing`-Property in schema.org.

### Verifikation Phase 4

```bash
grep -A 5 '"Comment"' dist/wort/[slug-mit-beispielen].html
```

---

## Finale Phase: Vollständige Verifikation

```bash
# 1. Build
pnpm build

# 2. JSON-LD aus einer Wortseite extrahieren
node -e "
  const fs = require('fs');
  const html = fs.readFileSync('dist/wort/kodderschnauze.html', 'utf8');
  const match = html.match(/<script type=\"application\/ld\+json\">(.*?)<\/script>/s);
  if (match) console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
"

# 3. Keine leeren Felder
# Erwartete Properties: name, description (lesbarer Satz), dateCreated,
# dateModified, mainEntityOfPage, url, inLanguage, inDefinedTermSet,
# termCode, alternateName (wenn vorhanden), sameAs (wenn vorhanden),
# image (wenn vorhanden), subjectOf/AudioObject (wenn vorhanden)

# 4. Lint
pnpm lint

# 5. Tests
pnpm test:unit
```

**Externe Validierung:**
- https://validator.schema.org/ — JSON-LD auf Fehler prüfen
- https://search.google.com/test/rich-results — Rich Results Vorschau

---

## Zusammenfassung: Erwartetes Endresultat

```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Kodderschnauze",
  "description": "„Kodderschnauze" ist Berliner Dialekt für Großes Mundwerk.",
  "disambiguatingDescription": "Berliner Dialektwort, die",
  "dateCreated": "2023-05-10T14:32:00",
  "dateModified": "2024-01-15T09:20:00",
  "mainEntityOfPage": "https://berliner-schnauze.wtf/wort/kodderschnauze",
  "url": "https://berliner-schnauze.wtf/wort/kodderschnauze",
  "inLanguage": "de-DE",
  "identifier": "cG9zdDo0Mg==",
  "termCode": "kodderschnauze",
  "alternateName": ["Schnauze"],
  "sameAs": "https://de.wikipedia.org/wiki/Berliner_Schnauze",
  "image": {
    "@type": "ImageObject",
    "url": "https://cms.berliner-schnauze.wtf/wp-content/uploads/kodderschnauze.jpg",
    "contentUrl": "https://cms.berliner-schnauze.wtf/wp-content/uploads/kodderschnauze.jpg",
    "width": 1200,
    "height": 800
  },
  "subjectOf": {
    "@type": "AudioObject",
    "name": "Aussprache: Kodderschnauze",
    "contentUrl": "https://cms.berliner-schnauze.wtf/wp-content/uploads/kodderschnauze.mp3",
    "encodingFormat": "audio/mpeg",
    "inLanguage": "de-DE"
  },
  "comment": [
    {
      "@type": "Comment",
      "text": "Hör ma, du hast ja 'ne echte Kodderschnauze!",
      "description": "Du redest sehr frech und laut."
    }
  ],
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Berliner Schnauze Wörterbuch",
    "description": "Wörterbuch für den Berliner Dialekt und Berliner Schnauze",
    "inLanguage": "de-DE",
    "url": "https://berliner-schnauze.wtf/wort"
  }
}
```
