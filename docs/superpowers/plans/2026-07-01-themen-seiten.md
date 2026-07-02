# Plan: Kategorie-Seiten (berlinerischThemen) + Kategorie-Badge auf Wort-Seite

**Ziel**: Für jeden der 12 Themen-Slugs eine statische Astro-Seite (`/themen/[slug]`) generieren mit Beschreibung, SEO-Metadaten aus WP und Wort-Liste. Außerdem Themen-Badges mit Links auf der Wort-Detail-Seite (`/wort/[slug]`) einblenden.

---

## Architektur-Entscheidungen

| Frage | Entscheidung | Begründung |
|---|---|---|
| Wort-zu-Thema-Mapping | `fetchAllWords()` + gruppieren | Bereits in `BerlinerWord`-Fragment, kein extra GQL |
| Thema-Metadaten (description, SEO) | Neues Root-Query `berlinerischThemen` | `description` + `seo` nur über Root-Term-Query verfügbar |
| SEO-Typ für Taxonomy Terms | Neues Fragment `TaxonomySeoFragment on TaxonomySEO` | Taxonomy terms verwenden `TaxonomySEO`, nicht `PostTypeSEO` |
| Route | `/themen/[themaSlug].astro` | Spiegelt WP `rewrite slug: 'themen'` wider |
| Wort-Seite Kategorie-Anzeige | `word.berlinerischThemen.nodes` direkt nutzen | Bereits im Fragment gefetcht — kein extra GQL |

---

## Phase 0 — Voraussetzungen checken

**0a. Codegen ausführen** (falls noch nicht nach Taxonomie-Setup):

```bash
pnpm gql:generate
```

Prüfen: `src/gql/graphql.ts` enthält `berlinerischThemen` in `BerlinerWordFragment` mit `name` und `slug`.

**0b. WP GraphQL Schema — TaxonomySEO verfügbar?**

```bash
infisical run -- bash -c 'curl -s -X POST "$WP_API" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ berlinerischThemen(first: 1) { nodes { slug description seo { title metaDesc } } } }\"}" | python3 -m json.tool'
```

Erwartet: JSON mit `nodes[0].description` und `nodes[0].seo.title`. Falls `seo` null oder Error → Yoast SEO Plugin muss für diese Taxonomie aktiviert werden (WP Admin → SEO → Search Appearance → Taxonomies → Themen).

**0c. `berlinerischThemen` in Fragment verifizieren**

```bash
grep -n "berlinerischThemen" src/services/fragments/fragments.ts
```

Erwartet: Zeile mit `berlinerischThemen { nodes { name slug } }` im `BerlinerWord` Fragment.

---

## Phase 1 — GQL: Neues Query + TaxonomySEO Fragment

**Ziel**: Neue Service-Funktion `fetchAllThemen()` + Codegen für typisierte Dokumente.

### 1a. Fragment hinzufügen — `src/services/fragments/fragments.ts`

Neues Fragment nach `PostTypeSeoFragment` einfügen (Zeile ~10, nach dem ersten Fragment):

```graphql
fragment TaxonomySeoFragment on TaxonomySEO {
  title
  metaDesc
  canonical
  opengraphDescription
  opengraphTitle
  opengraphType
  opengraphUrl
  opengraphImage {
    sourceUrl
  }
  twitterDescription
  twitterTitle
  metaRobotsNofollow
  metaRobotsNoindex
}
```

Export-Variable: `export const TaxonomySeoFragment = graphql(\`...\`)`

Pattern: Copy von `PostTypeSeoFragment` in `src/services/fragments/fragments.ts:3-26`, Typ-Name ändern zu `TaxonomySEO`, Felder anpassen (keine `readingTime`, kein `opengraphSiteName`/`opengraphAuthor`/`opengraphPublisher`/`opengraphPublishedTime`/`opengraphModifiedTime` — taxonomy terms haben diese nicht).

**Anti-Pattern**: NICHT `PostTypeSeoFragment` für Taxonomy Nodes spreaden — falscher GQL-Typ, baut nicht.

### 1b. Neue Query + Service-Funktion — neues File `src/services/queries/getThemen.ts`

Pattern: Copy von `src/services/queries/getPage.ts` (einfachste Query ohne Pagination).

```typescript
// src/services/queries/getThemen.ts
import { graphql } from "@/gql/gql";
import { TaxonomySeoFragment } from "@services/fragments/fragments";
import { WP_API } from "astro:env/client";
import { Client, cacheExchange, fetchExchange } from "@urql/core";

const client = new Client({
  url: WP_API,
  exchanges: [cacheExchange, fetchExchange],
});

export const GetAllBerlinerischThemen = graphql(`
  query GetAllBerlinerischThemen {
    berlinerischThemen(first: 100) {
      nodes {
        name
        slug
        description
        count
        seo {
          ...TaxonomySeoFragment
        }
      }
    }
  }
`);

let _themenCache: ReturnType<typeof fetchAllThemen> | null = null;

export const fetchAllThemen = async () => {
  _themenCache ??= client
    .query(GetAllBerlinerischThemen, {})
    .toPromise()
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.berlinerischThemen?.nodes ?? [];
    });
  return _themenCache;
};
```

Pattern für urql Client: Copy von `src/services/queries/getWords.ts:14-24`.
Pattern für Cache: Copy von `src/services/queries/getWords.ts` (`_allWordsCache` Muster).

Exportiert in `src/services/api.ts` ergänzen:

```typescript
export { fetchAllThemen } from "./queries/getThemen";
```

### 1c. Codegen ausführen

```bash
pnpm gql:generate
```

**Verification**:
- `grep -n "GetAllBerlinerischThemen\|TaxonomySeoFragment" src/gql/graphql.ts` → beide vorhanden
- `grep -n "berlinerischThemen" src/gql/graphql.ts` → Fragment-Typ mit `description` und `seo`
- Kein TypeScript-Fehler: `pnpm exec vue-tsc --noEmit 2>&1 | grep getThemen`

---

## Phase 2 — Astro Kategorie-Seite (`/themen/[themaSlug].astro`)

**Ziel**: 12 statische Seiten, eine pro Thema-Slug, mit Wort-Liste und SEO.

### 2a. Seite erstellen — `src/pages/themen/[themaSlug].astro`

Pattern: Copy von `src/pages/wort/index.astro` für Grundstruktur, `src/pages/wort/[...wordSlug].astro` für `getStaticPaths`.

**`getStaticPaths`**:
```typescript
export const getStaticPaths = async () => {
  const [allThemen, allWords] = await Promise.all([
    fetchAllThemen(),
    fetchAllWords(),
  ]);

  // Wort-zu-Thema-Mapping aus bereits gefetchten Wörtern
  const wordsByThema = new Map<string, typeof allWords>();
  for (const { node } of allWords) {
    for (const thema of node.berlinerischThemen?.nodes ?? []) {
      if (!thema.slug) continue;
      if (!wordsByThema.has(thema.slug)) wordsByThema.set(thema.slug, []);
      wordsByThema.get(thema.slug)!.push({ node });
    }
  }

  return allThemen.map((thema) => ({
    params: { themaSlug: thema.slug },
    props: {
      thema,
      words: wordsByThema.get(thema.slug ?? "") ?? [],
    },
  }));
};
```

**Props**:
```typescript
const { thema, words } = Astro.props;
```

**SEO** (mapping von TaxonomySEO → SeoProps):
```typescript
const seoProps = seoData({
  seo: {
    title: thema.seo?.title ?? thema.name ?? "",
    opengraphDescription: thema.seo?.opengraphDescription ?? thema.seo?.metaDesc ?? thema.description ?? "",
    canonical: thema.seo?.canonical,
    opengraphType: "website",
  },
  title: thema.name ?? "",
});
```

`seoData()` importieren aus: `src/utils/helpers.ts` (gleiche Datei wie auf der Wort-Seite).

**Template**:
- `<Layout content={seoProps} contentClasses="o-thema">`
- `<h1>` mit Thema-Name
- Beschreibungstext: `thema.description` (HTML aus WP, mit `set:html`)
- Wort-Liste: Grid/Liste mit Links zu `/wort/[node.slug]`, Anzeige: `node.wordProperties.berlinerisch`
- Wort-Count: `{words.length} Wörter`

### 2b. Index-Seite `src/pages/themen/index.astro`

Übersicht aller 12 Kategorien mit Link-Liste. Pattern: `src/pages/changelog/index.astro`.

**Verification**:
- `pnpm build:local` erfolgreich
- `dist/themen/unterhaltung-freizeit/index.html` vorhanden
- Alle 12 Thema-Seiten generiert: `ls dist/themen/`
- SEO-Titel im HTML korrekt

---

## Phase 3 — Kategorie-Badges auf Wort-Seite

**Ziel**: `berlinerischThemen`-Links auf `/wort/[slug]` anzeigen.

### 3a. Daten verfügbar prüfen

In `src/pages/wort/[...wordSlug].astro` — `word.berlinerischThemen?.nodes` ist bereits in `props.word` vorhanden (kommt aus `BerlinerWord` Fragment). **Kein extra GQL nötig.**

### 3b. Badge-Rendering einfügen

In `src/pages/wort/[...wordSlug].astro` — gute Position: nach der Berlinerisch-Überschrift / im Kopfbereich der Wort-Seite, vor den Sections.

```astro
{word.berlinerischThemen?.nodes?.length > 0 && (
  <div class="c-word-themen">
    {word.berlinerischThemen.nodes.map((thema) => (
      <a href={`/themen/${thema.slug}`} class="c-word-themen__badge">
        {thema.name}
      </a>
    ))}
  </div>
)}
```

SCSS in `src/styles/components/_word-themen.scss` (neues File), laden via `@use "@styles/components/word-themen"` im `<style>` Block der Seite oder in `app.scss`.

### 3c. SCSS für Badges

```scss
// src/styles/components/_word-themen.scss
.c-word-themen {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  &__badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: var(--font-size-sm);
    text-decoration: none;
    background-color: var(--color-surface-2, #f0f0f0);
    color: var(--color-text);

    &:hover {
      background-color: var(--color-surface-3, #e0e0e0);
    }
  }
}
```

**Anti-Pattern**: KEIN `scoped` auf `<style>` — BEMIT-Namenskonvention, kein Scoping.

**Verification**:
- `pnpm build:local` ohne Fehler
- Im HTML von `/wort/aalen/`: Link zu `/themen/unterhaltung-freizeit` vorhanden
- `grep -r "c-word-themen" dist/wort/aalen/` → Badge-HTML im Output

---

## Phase 4 — Sitemap

**Ziel**: `/themen/[slug]` in Sitemap aufnehmen.

Die Sitemap wird in `astro.config.mjs` konfiguriert (Astro Sitemap-Integration). Themen-Seiten werden automatisch aufgenommen da sie statisch generiert werden — **keine Änderung nötig** wenn Astro Sitemap `@astrojs/sitemap` mit `customPages` oder Auto-Discovery konfiguriert ist.

Prüfen nach Build:
```bash
grep "themen" dist/sitemap*.xml
```

Falls nicht automatisch: `customPages` in `astro.config.mjs` erweitern.

---

## Neue Dateien

| Datei | Zweck |
|---|---|
| `src/services/queries/getThemen.ts` | `fetchAllThemen()` + GQL-Query |
| `src/pages/themen/[themaSlug].astro` | Dynamische Kategorie-Seiten |
| `src/pages/themen/index.astro` | Übersicht aller Kategorien |
| `src/styles/components/_word-themen.scss` | Badge-Styling |

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/services/fragments/fragments.ts` | `TaxonomySeoFragment` hinzufügen |
| `src/services/api.ts` | `fetchAllThemen` re-exportieren |
| `src/pages/wort/[...wordSlug].astro` | Themen-Badges einblenden |
| `src/pages/api/search/index.json.ts` | `as Record<string, unknown>` Cast entfernen (nach Codegen) |

---

## Ausführungsreihenfolge

```
Phase 0: pnpm gql:generate + WP Schema Test (seo.title vorhanden?)
Phase 1: TaxonomySeoFragment + getThemen.ts + pnpm gql:generate
Phase 2: src/pages/themen/[themaSlug].astro + index.astro
Phase 3: Wort-Seite Badges + SCSS
Phase 4: Sitemap prüfen → pnpm build:local
```

## Bekannte Risiken

| Risiko | Mitigation |
|---|---|
| `TaxonomySEO` nicht im Schema (Yoast nicht für Taxonomie aktiviert) | Phase 0b verifizieren; Fallback: `seo`-Feld weglassen, `description` direkt nutzen |
| `berlinerischThemen` Root-Query nicht registriert | WPGraphQL Plugin-Version ≥ 1.x prüfen; `show_in_graphql: true` in Taxonomie-Registration (bereits gesetzt) |
| Fehlende `description` auf Themen | WP Admin → Berliner Schnauze → Themen → Beschreibung eintragen |
| Codegen-Fehler durch TaxonomySEO-Felder | Felder einzeln testen; ggf. auf `title metaDesc` reduzieren |
