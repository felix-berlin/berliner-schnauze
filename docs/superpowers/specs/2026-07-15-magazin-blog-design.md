# Magazin (Blog) für Berlinerisch-Wissensartikel

**Date:** 2026-07-15  
**Branch:** feature/blog  
**Status:** Approved

## Problem

13 fertige Draft-Posts liegen im nativen WordPress-Post-Typ (Gutenberg-Blocks) und sollen im Frontend anzeigbar gemacht werden. Es gibt aktuell keine Anzeige-Pipeline für native WP-Posts — nur für den custom `BerlinerWord`-Typ (`getWords.ts`) und die `berlinerischThemen`-Taxonomie (`getThemen.ts`).

## Goals

- Listing- und Detailseite für WP-Posts unter `/magazin/`
- SEO/Content-Marketing als Zweck: Article-Schema, Yoast-SEO-Daten (`PostTypeSeoFragment`), `ItemList`
- Sichere Trennung DRAFT/PUBLISH — das Feature muss gebaut/gemerged werden können, ohne dass eine der 13 Drafts vorzeitig live erscheint
- Block-für-Block-Rendering mit garantiertem Fallback für unbekannte/zukünftige Blocktypen — kein Inhalt darf durch einen fehlenden Fall verschwinden

## Non-Goals

- Keine automatische Verlinkung von Berlinerisch-Wörtern im Artikeltext zum Glossar (v1) — Autoren verlinken manuell im WP-Editor
- Keine Kategorien-/Taxonomie-Filterung (v1) — `Post.categories` existiert im Schema als späterer Ausbauweg
- Kein Veröffentlichen der 13 Drafts als Teil dieser Arbeit — Publish-Entscheidung bleibt manuell in WP, gestaffelt möglich
- Keine Pagination im Listing (13 Posts reichen für eine Seite; nachrüsten wenn's wächst)

## Decision

**Block-für-Block-Rendering** (nicht `content(format: RENDERED)`), mit garantiertem Fallback auf `saveContent` für jeden nicht explizit behandelten Blocktyp.

Diese WP-Instanz nutzt eine Version des „WPGraphQL Content Blocks"-Plugins mit `Block`-Suffix-Typnamen (`CoreParagraphBlock`, `CoreHeadingBlock`, …). Wichtig: `CoreParagraphBlockAttributes` und `CoreHeadingBlockAttributes` haben **kein** `content`-Feld in diesem Schema — der Text ist nur über `saveContent`/`originalContent` (fertiges HTML) erreichbar. Nur `CoreImageBlock` (`url`/`width`/`height`/`alt`/`id`) und `CoreQuoteBlock` (`value`) liefern zusätzliche typisierte Daten, die `saveContent` nicht hätte — deshalb bekommen ausschließlich diese zwei Blocktypen dedizierte Komponenten. Alles andere fällt auf `saveContent` zurück.

## Design

### 1. Fragmente — `src/services/fragments/blockFragments.ts` (neu)

```graphql
fragment CoreImageBlockFields on CoreImageBlock {
  name
  order
  saveContent
  attributes {
    ... on CoreImageBlockAttributes {
      url
      width
      height
      alt
      id
    }
  }
}

fragment CoreQuoteBlockFields on CoreQuoteBlock {
  name
  order
  saveContent
  attributes {
    ... on CoreQuoteBlockAttributes {
      value
    }
  }
}
```

### 2. Query — `src/services/queries/getPosts.ts` (neu, mirrors `getThemen.ts`)

```graphql
query GetAllPosts {
  posts(first: 100, where: { status: PUBLISH }) {
    nodes {
      id
      slug
      title
      date
      excerpt(format: RENDERED)
      featuredImage {
        node {
          sourceUrl
          altText
          mediaDetails {
            height
            width
          }
        }
      }
      blocks {
        name
        order
        saveContent
        ...CoreImageBlockFields
        ...CoreQuoteBlockFields
      }
      seo {
        ...PostTypeSeoFragment
      }
    }
  }
}
```

`fetchAllPosts()` — gecachte Promise (`_postsCache`), wirft bei GraphQL-Fehlern (kein swallow), mirrors `fetchAllThemen()` 1:1.

**Sicherheitsgrenze:** `where: { status: PUBLISH }` ist zwingender Teil der Query, kein optionales Detail. Der `wpGraphqlClient` ist per HTTP-Basic-Auth authentifiziert und würde ohne diesen Filter auch DRAFT-Posts zurückliefern. Mit dem Filter kann dieses Feature sofort gebaut/gemerged werden, ohne dass eine der 13 Drafts vorzeitig auf der Live-Seite erscheint — sie taucht erst auf, sobald sie in WP manuell auf PUBLISH gesetzt wird.

### 3. Seiten

- `src/pages/magazin/index.astro` — Listing, mirrors `themen/index.astro`: Kartenraster (Titel, Excerpt, Datum, Featured Image), sortiert nach `date` absteigend, Breadcrumbs, `ItemList`-JSON-LD.
- `src/pages/magazin/[postSlug].astro` — Detail, mirrors `themen/[themaSlug].astro`: `getStaticPaths` aus `fetchAllPosts()`, Breadcrumbs, Header (Titel/Datum/Featured Image), `<ArticleBlocks blocks={post.blocks} />`, `Article`/`BlogPosting`-JSON-LD (statt `ItemList` — passender für das Content-Marketing-Ziel), SEO via `seoData()` + `post.seo`.

### 4. Block-Renderer — `src/components/magazin/ArticleBlocks.astro` (neu)

Reines Astro, keine Vue-Insel (Artikeltext ist statische Prosa ohne Interaktivität → kein unnötiger JS-Ballast).

```astro
---
import ArticleImage from './ArticleImage.astro';
import ArticleQuote from './ArticleQuote.astro';

interface ArticleBlock {
  name: string;
  order: number;
  saveContent?: string | null;
  attributes?: unknown;
}

interface Props {
  blocks: ArticleBlock[];
}

const { blocks } = Astro.props as Props;
const sorted = [...blocks].sort((a, b) => a.order - b.order);
---

<div class="c-magazin-article__body">
  {sorted.map((block) => {
    if (block.name === 'core/image') return <ArticleImage block={block} />;
    if (block.name === 'core/quote') return <ArticleQuote block={block} />;
    return <Fragment set:html={block.saveContent ?? ''} />;
  })}
</div>
```

- `ArticleImage.astro` — nutzt `attributes.url/width/height/alt` → Astro `<Image>` aus `astro:assets` (Domain `cms.berliner-schnauze.wtf` bereits in `astro.config.mjs:99` erlaubt, Präzedenzfall `BookRecommendations.astro`)
- `ArticleQuote.astro` — nutzt `attributes.value` → eigenes `<blockquote class="c-magazin-article__quote">` im Postcard-Look (gestrichelter Rahmen als Signatur)
- Fallback-Zweig (`Fragment set:html`) deckt ab: `core/paragraph`, `core/heading`, `core/list`, `core/separator` (WP rendert als `<hr>`, wird per CSS gestrichelt gestylt), `core/table`, Embeds, sowie jeden zukünftigen/unbekannten Blocktyp

### 5. Styling

- `src/styles/components/_magazin-overview.scss`, `_magazin-article.scss` — Frontmatter-Import in der jeweiligen `.astro`-Datei (Astro-Konvention, wie in `themen/index.astro`)
- Prose-Styling für den Fallback-HTML-Inhalt über Nachfahren-Selektoren statt Klassen-Injektion in WP-generiertes HTML: `.c-magazin-article__body :is(h2, h3) {}`, `.c-magazin-article__body p {}`, `.c-magazin-article__body hr {}` (gestrichelt)

### 6. SEO

- `post.seo` → `PostTypeSeoFragment` (bereits vorhanden, `fragments.ts:22`), identisch zum bestehenden `seoData()`-Helper genutzt
- Detailseite: `Article`/`BlogPosting`-JSON-LD

## Affected Files

| File | Change |
|---|---|
| `src/services/fragments/blockFragments.ts` | Neu — `CoreImageBlockFields`, `CoreQuoteBlockFields` |
| `src/services/queries/getPosts.ts` | Neu — `GetAllPosts` Query, `fetchAllPosts()` (cached, throws) |
| `src/services/api.ts` | Re-export `fetchAllPosts` |
| `src/pages/magazin/index.astro` | Neu — Listing |
| `src/pages/magazin/[postSlug].astro` | Neu — Detail, `getStaticPaths` |
| `src/components/magazin/ArticleBlocks.astro` | Neu — Block-Dispatcher mit Fallback |
| `src/components/magazin/ArticleImage.astro` | Neu — `core/image` → optimiertes Bild |
| `src/components/magazin/ArticleQuote.astro` | Neu — `core/quote` → Postcard-Zitat |
| `src/styles/components/_magazin-overview.scss` | Neu |
| `src/styles/components/_magazin-article.scss` | Neu |
| Codegen (`pnpm gql:generate`) | Regeneriert `src/gql/graphql.ts` mit `Post`/`Block`-Typen |

## Testing

- Unit-Test `getPosts.test.ts` (mirrors `getThemen.test.ts`): Cache-Verhalten, throw-on-error, `where: { status: PUBLISH }` in der Query
- Component-Test `ArticleBlocks.test.ts`: rendert Paragraph (Fallback), Image-Block, Quote-Block, und einen **unbekannten Blocktyp** (Regressionsschutz für den Fallback)
- Manuell: `pnpm dev`, einen Draft-Post temporär in WP auf PUBLISH setzen, `/magazin/` und `/magazin/[slug]` im Browser prüfen (Listing-Karte, Detail-Rendering, Bilder, Zitate, Dark Mode)
