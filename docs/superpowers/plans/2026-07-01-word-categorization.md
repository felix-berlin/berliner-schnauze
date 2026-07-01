# Plan: Thematische Kategorisierung aller Wörter + WordPress-Import

**Ziel**: ~919 Berliner-Dialect-Wörter in semantische Themen-Kategorien einteilen, als JSON zwischenspeichern und vollautomatisch als neue WordPress-Taxonomie (`berlinerischThemen`) eintragen.

---

## Scope & Entscheidungen

| Frage | Entscheidung | Begründung |
|---|---|---|
| Neue oder bestehende Taxonomie? | **Neue**: `berlinerischThemen` | `berlinerischWordTypes` = Grammatik-Typen; nicht vermischen |
| Wo registrieren? | WP PHP-Plugin / functions.php | Taxonomie muss serverseitig registriert sein bevor REST-API-Terme angelegt werden |
| Kategorisierungs-Tool | Claude API (claude-sonnet-4-6), Batch-Mode | ~919 Wörter; Batches à 50 für Token-Effizienz |
| Zwischenspeicher | `data/word-categories.json` im Repo | Manuell korrigierbar vor WP-Import; Wiederholbarkeit |
| WP-Import-Methode | WP REST API (Basic Auth) | Einfacher als WPGraphQL-Mutations für Bulk-Termine; Auth-Credentials bereits als Env-Vars vorhanden |
| Kategorien-Anzahl | ~15–20 Themen-Kategorien | Breit genug für Navigation, eng genug für Sinn |

---

## Themen-Kategorien (finale Struktur)

| Slug | Label (DE) | Notiz |
|---|---|---|
| `essen-trinken` | Essen & Trinken | Kern-Cluster, stark befüllt |
| `alkohol-kneipe` | Alkohol & Kneipe | Eigener Cluster — Molle, Destille, Kaschemme, blau sein; starke Berlin-Identität |
| `schimpfwoerter-beleidigungen` | Schimpfwörter & Beleidigungen | Kern-Cluster, stark befüllt |
| `charakter-eigenschaften` | Charakter & Eigenschaften | Absorbs: Kleidung & Aussehen |
| `gefuehle-emotionen` | Gefühle & Emotionen | Nur befüllen wenn ≥ 10 Wörter vorhanden |
| `koerper` | Körper | Ohne Gesundheit — kaum Berliner Dialektwörter für Gesundheitsthemen |
| `geld` | Geld | Ohne Arbeit — Penunse/Kröten/blechen als eigener Cluster |
| `orte-spitzname` | Berliner Orte & Spitznamen | Eigener Cluster — stärkster Unique Content |
| `stadtleben` | Berliner Stadtleben | Kiez, Späti, JWD, etc. |
| `beziehungen-soziales` | Beziehungen & Soziales | Absorbs: Kinder & Familie |
| `alltag-wohnen` | Alltag & Wohnen | Nur befüllen wenn ≥ 10 Wörter vorhanden |
| `unterhaltung-freizeit` | Unterhaltung & Freizeit | Bleibt |

**Gestrichen**: `bewegung-fortbewegung` (kein Search Intent), `natur-wetter` (zu dünn), `sonstiges` (nie verwenden — verwässert Taxonomie)

**Integriert**: `kleidung-aussehen` → `charakter-eigenschaften`; `kinder-familie` → `beziehungen-soziales`

---

## Phase 0 — Dokumentation & WP-Taxonomie-Setup prüfen

**Ziel**: Sicherstellen dass die neue Taxonomie in WP existiert und REST-API-Endpunkte verfügbar sind.

### Aufgaben

**0a. WP-Taxonomie registrieren** (manuell in WordPress)

Taxonomie `berlinerisch_word_themen` muss registriert sein **bevor** der Import-Script läuft. Via Code Snippet Plugin eintragen:

```php
function create_berlinerisch_themen_taxonomy() {
    $labels = [
        'name'              => _x( 'Themen', 'taxonomy general name', 'berlinerisch' ),
        'singular_name'     => _x( 'Thema', 'taxonomy singular name', 'berlinerisch' ),
        'search_items'      => __( 'Themen durchsuchen', 'berlinerisch' ),
        'all_items'         => __( 'Alle Themen', 'berlinerisch' ),
        'parent_item'       => __( 'Übergeordnetes Thema', 'berlinerisch' ),
        'parent_item_colon' => __( 'Übergeordnetes Thema:', 'berlinerisch' ),
        'edit_item'         => __( 'Thema bearbeiten', 'berlinerisch' ),
        'update_item'       => __( 'Thema aktualisieren', 'berlinerisch' ),
        'add_new_item'      => __( 'Neues Thema hinzufügen', 'berlinerisch' ),
        'new_item_name'     => __( 'Thema Name', 'berlinerisch' ),
        'menu_name'         => __( 'Themen', 'berlinerisch' ),
    ];
    $args = [
        'hierarchical'        => false,
        'public'              => true,
        'labels'              => $labels,
        'show_admin_column'   => true,
        'show_in_rest'        => true,
        'rest_base'           => 'berlinerisch-themen',
        'query_var'           => true,
        'rewrite'             => [ 'slug' => 'themen' ],
        'show_in_graphql'     => true,
        'graphql_single_name' => 'berlinerischThema',
        'graphql_plural_name' => 'berlinerischThemen',
    ];
    register_taxonomy( 'berlinerisch_word_themen', 'berlinerisch', $args );
}
add_action( 'init', 'create_berlinerisch_themen_taxonomy' );
```

Wichtig: `show_in_graphql: true` — macht Taxonomie in WPGraphQL und Astro-Codegen sichtbar.

**0b. REST-Endpunkte verifizieren**

Nach Registrierung prüfen:
```bash
# Taxonomie-Endpunkt erreichbar?
curl -u "$WP_AUTH_USER:$WP_AUTH_PASS" "$WP_REST_API/berliner-word-themen"

# Post-Type-Endpunkt für berliner-word prüfen (muss berliner-word-themen-Feld haben)
curl -u "$WP_AUTH_USER:$WP_AUTH_PASS" "$WP_REST_API/berliner-word/1"
```

**Verification**: Endpunkte antworten mit 200; Post-Objekt enthält `berliner-word-themen` Feld.

---

## Phase 1 — Alle Wörter fetchen + LLM-Kategorisierung

**Ziel**: JSON-Datei `data/word-categories.json` mit `{ wordId, slug, berlinerisch, translations, themen: string[] }[]`.

### Aufgaben

**1a. Fetch-Script schreiben** (`scripts/categorize-words.ts`)

Script-Struktur:
```typescript
// 1. WP GraphQL → fetchAllWords() (bereits vorhanden in src/services/queries/getWords.ts)
// 2. Extrahiere pro Wort: berlinerWordId, slug, berlinerisch, translations[], examples[]
// 3. Batchweise (50 Wörter) an Claude API senden
// 4. Antwort parsen → { id: string, themen: string[] }[]
// 5. In data/word-categories.json schreiben (merge mit existierendem Stand)
```

Wiederholbar: Bereits kategorisierte IDs überspringen (merge-Logik).

**Wichtige Imports**:
- `fetchAllWords` aus `src/services/queries/getWords.ts` (wiederverwendbar — kein neues GQL nötig)
- `@anthropic-ai/sdk` für Claude API (ggf. installieren: `pnpm add -D @anthropic-ai/sdk`)
- Env-Vars: `WP_API` (GraphQL endpoint) + Infisical für Auth

**Claude-Prompt-Struktur** (pro Batch):
```
Du bist ein Experte für Berliner Dialekt. Kategorisiere die folgenden Berliner Mundart-Wörter
in eine oder mehrere der folgenden Themen-Kategorien. Gib für jedes Wort seine ID und die
passenden Kategorie-Slugs zurück.

Erlaubte Kategorien: [liste der Slugs]

Wörter (JSON-Array):
[{ "id": "...", "berlinerisch": "...", "translations": [...], "examples": [...] }]

Antworte NUR mit validem JSON: [{ "id": "...", "themen": ["slug1", "slug2"] }]
```

**Claude-Modell**: `claude-haiku-4-5-20251001` (günstig für Bulk-Klassifizierung)
**Batches**: 50 Wörter pro Request → ~19 API-Calls für ~919 Wörter

**Output-Format** (`data/word-categories.json`):
```json
[
  {
    "berlinerWordId": "123",
    "slug": "wat",
    "berlinerisch": "wat",
    "translations": ["was"],
    "themen": ["alltag-wohnen", "beziehungen-soziales"]
  }
]
```

**Verification**:
- JSON valide und vollständig (alle ~919 Wörter vorhanden)
- Jeder Eintrag hat mindestens 1 Thema
- Kein Thema außerhalb der erlaubten Slugs
- `pnpm tsx scripts/categorize-words.ts --dry-run` → zeigt Batch-Preview ohne API-Call

---

## Phase 2 — WordPress-Import via REST API

**Ziel**: Alle Kategorien als Terms anlegen + jedem Post die richtigen Terms zuweisen.

### Aufgaben

**2a. Import-Script schreiben** (`scripts/import-categories-to-wp.ts`)

```typescript
// 1. data/word-categories.json einlesen
// 2. Alle einzigartigen Themen-Slugs sammeln
// 3. Für jeden Slug: Term via REST POST anlegen (falls nicht vorhanden)
//    POST /wp-json/wp/v2/berliner-word-themen { name, slug }
//    → Term-ID merken
// 4. Für jeden BerlinerWord-Post: Term-IDs zuweisen
//    POST /wp-json/wp/v2/berliner-word/{id} { berliner-word-themen: [termId1, termId2] }
// 5. Fortschritt loggen (welcher Post, welche Terms)
```

**Auth**: HTTP Basic Auth via `Authorization: Basic base64(user:pass)` — Credentials aus Env-Vars.

**Rate-Limiting**: 
- 1 Request pro 100ms (kein WP-Rate-Limit aber höflich bleiben)
- Bei 429/503: Exponential Backoff

**Idempotenz**: 
- Existierende Terms per Slug prüfen (GET vor POST)
- `--dry-run` Flag für Vorschau ohne Änderungen

**CLI-Optionen**:
```bash
pnpm tsx scripts/import-categories-to-wp.ts             # Vollimport
pnpm tsx scripts/import-categories-to-wp.ts --dry-run   # Vorschau
pnpm tsx scripts/import-categories-to-wp.ts --slug wat  # Einzelner Post
```

**Verification**:
- WP Admin → Themen-Taxonomie zeigt alle ~15–20 Terms
- Stichproben: 5 zufällige Posts im WP Admin haben korrekte Themen gesetzt
- `curl "$WP_REST_API/berliner-word-themen"` → listet alle Terms

---

## Phase 3 — Astro-Frontend-Integration (optional, separater Schritt)

**Ziel**: Kategorien in Suche + Filter-UI verfügbar machen.

Dieser Phase ist **optional** und **unabhängig** von Phase 1+2. Erst angehen wenn die WP-Daten vollständig sind.

### Aufgaben

**3a. GQL-Fragment erweitern**

In `src/services/fragments/fragments.ts` → `BerlinerWord`-Fragment:
```graphql
berlinerischThemen {
  nodes {
    name
    slug
  }
}
```

**3b. Codegen laufen lassen**

```bash
pnpm gql:generate
```

**3c. Search-Index erweitern**

In `src/pages/api/search/index.json.ts` → `makeOramaSearchIndex()`:
```typescript
themen: node.berlinerischThemen?.nodes.map(n => n.slug) ?? [],
```

**3d. Filter-UI** (eigenes Future-Feature / separater Plan)

Verification: `pnpm build:local` erfolgreich; `data/api/search/index.json` enthält `themen`-Feld.

---

## Dateien die neu entstehen

| Datei | Zweck |
|---|---|
| `scripts/categorize-words.ts` | LLM-Kategorisierungs-Script |
| `scripts/import-categories-to-wp.ts` | WP REST API Import-Script |
| `data/word-categories.json` | Zwischenspeicher (commit ins Repo) |
| `scripts/lib/wp-rest.ts` | Shared WP REST Auth-Helper |

---

## Ausführungsreihenfolge

```
Phase 0 (manuell in WP):  Taxonomie registrieren → REST-Endpunkt testen
Phase 1:  pnpm tsx scripts/categorize-words.ts
          → data/word-categories.json reviewen + ggf. manuell korrigieren
Phase 2:  pnpm tsx scripts/import-categories-to-wp.ts --dry-run
          → pnpm tsx scripts/import-categories-to-wp.ts
Phase 3:  (optional) GQL-Fragment + Codegen + Search-Index
```

---

## Bekannte Risiken

| Risiko | Mitigation |
|---|---|
| Claude klassifiziert falsch | JSON-Zwischenspeicher → manuelle Korrektur vor Import |
| WP REST Auth schlägt fehl | Application Password in WP generieren (WP 5.6+) statt User-Pass |
| berliner-word Post-Type nicht in REST | `show_in_rest: true` beim CPT prüfen |
| Taxonomie fehlt in WPGraphQL | WPGraphQL-Plugin-Setting: "Show in GraphQL" aktivieren |
