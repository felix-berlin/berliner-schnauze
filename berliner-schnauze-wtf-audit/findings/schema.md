# Schema / Structured Data Audit — berliner-schnauze.wtf

Audit date: 2026-06-29
Pages sampled: Homepage (`/`), Wort-Index (`/wort`), 15 word pages (`/wort/*`), Games (`/games/berliner-oder-nicht`)

---

## Detected Schema

| Page | Schema types present |
|------|----------------------|
| `/` | `WebSite`, `Organization` |
| `/wort` | `DefinedTermSet`, `BreadcrumbList` |
| `/wort/[slug]` | `DefinedTerm`, `BreadcrumbList` |
| `/games/berliner-oder-nicht` | none |

All schema is emitted as JSON-LD via `<script type="application/ld+json">`. `@context` uses `https://schema.org` throughout. Dates use ISO 8601. These baseline requirements pass.

---

## Finding 1 — BreadcrumbList: relative `@id` paths and spurious `.html` suffix

**Severity: Critical**
**Affected pages: ~917 (all `/wort/*` and `/wort`)**

### What is wrong

Every `BreadcrumbList` block emitted by `astro-breadcrumbs` uses relative paths for `item.@id` and appends a `.html` extension to the last segment:

```json
{"@type":"ListItem","position":1,"item":{"@id":"/","name":"Start"}},
{"@type":"ListItem","position":2,"item":{"@id":"/wort","name":"Wort"}},
{"@type":"ListItem","position":3,"item":{"@id":"/wort/aalen.html","name":"Aalen"}}
```

Google's Rich Results documentation for Breadcrumb explicitly requires `item.@id` to be an **absolute URL**. Relative paths are invalid and cause the breadcrumb rich result to be silently suppressed across all word and index pages. The `.html` suffix on the leaf item is an additional defect: the canonical URL for that page is `https://berliner-schnauze.wtf/wort/aalen`, not `.../aalen.html`, so the `@id` does not resolve to a real page and violates the requirement that `@id` must be the URL of the page the item represents.

The root cause is that `astro-breadcrumbs` derives its schema from `Astro.url` which, during static build, carries the internal `.html` file extension before the rewrite layer strips it. The `canonicalUrl()` helper in `src/utils/helpers.ts` already strips `.html` via `.replace(/\.html$/, "")`, but it is not applied to breadcrumb schema — the library generates the JSON-LD itself without going through that helper.

### Fix

Pass `customBaseUrl` (or equivalent prop, depending on the `astro-breadcrumbs` version in use) set to `Astro.site` so the library produces absolute URLs. Alternatively, generate the `BreadcrumbList` block manually — this is the more robust option because it gives full control over the output:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@id": "https://berliner-schnauze.wtf/",
        "name": "Start"
      }
    },
    {
      "@type": "ListItem",
      "position": 2,
      "item": {
        "@id": "https://berliner-schnauze.wtf/wort",
        "name": "Wort"
      }
    },
    {
      "@type": "ListItem",
      "position": 3,
      "item": {
        "@id": "https://berliner-schnauze.wtf/wort/aalen",
        "name": "Aalen"
      }
    }
  ]
}
```

In `[...wordSlug].astro`, build this programmatically using `canonicalUrl()` which already handles the `.html` strip:

```ts
const breadcrumbSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, item: { '@id': canonicalUrl('/', Astro.site), name: 'Start' } },
    { '@type': 'ListItem', position: 2, item: { '@id': canonicalUrl('/wort', Astro.site), name: 'Wort' } },
    { '@type': 'ListItem', position: 3, item: { '@id': canonicalUrl(Astro.url.pathname, Astro.site), name: wordProps?.berlinerisch ?? word.slug } },
  ],
});
```

Apply the same pattern in `wort/index.astro` (two-item breadcrumb).

---

## Finding 2 — WebSite: missing `potentialAction` SearchAction

**Severity: High**
**Affected pages: `/` (homepage)**

### What is wrong

The `WebSite` schema is present and structurally valid, but it omits `potentialAction`, which is the property Google uses to render a **Sitelinks Search Box** in search results. For a dictionary with 916 searchable entries and an Orama-powered in-browser search, this is the highest-value missing opportunity on the site.

### Current schema

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "description": "Berliner Dialekt Wörterbuch - Berlinerisch zu Hochdeutsch",
  "inLanguage": "de-DE",
  "name": "Berliner Schnauze",
  "url": "https://berliner-schnauze.wtf"
}
```

### Recommended addition

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "description": "Berliner Dialekt Wörterbuch - Berlinerisch zu Hochdeutsch",
  "inLanguage": "de-DE",
  "name": "Berliner Schnauze",
  "url": "https://berliner-schnauze.wtf",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://berliner-schnauze.wtf/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

The `urlTemplate` must point to a URL that actually performs a search when `q` is set. If the current site loads the search modal via a hash or query param, use that. If no deep-link URL exists today, the `potentialAction` should be deferred until the URL structure for search is established — Google will ignore a template that leads to a 404 or empty page.

---

## Finding 3 — Organization: missing `@id` and `contactPoint`

**Severity: Medium**
**Affected pages: `/` (homepage)**

### What is wrong

The `Organization` block has no `@id` property. The `@id` on an `Organization` serves as the canonical IRI for the entity in Google's Knowledge Graph and enables other schema blocks (e.g., `publisher` references in `DefinedTerm`) to link to the same entity by IRI rather than repeating the object inline. Without `@id`, Google cannot merge the two separate schema blocks across pages into a single coherent entity.

Additionally, `contactPoint` is a recommended property for organizations where user contact is possible (e.g., word suggestion form at `/wort-vorschlagen`).

### Current schema (relevant excerpt)

```json
{
  "@type": "Organization",
  "name": "Berliner Schnauze",
  "url": "https://berliner-schnauze.wtf"
}
```

### Recommended addition

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://berliner-schnauze.wtf/#organization",
  "name": "Berliner Schnauze",
  "url": "https://berliner-schnauze.wtf",
  "founder": {
    "@type": "Person",
    "name": "Felix Scholze",
    "url": "https://webshaped.de/"
  },
  "logo": {
    "@type": "ImageObject",
    "url": "https://berliner-schnauze.wtf/favicons/favicon.svg"
  },
  "sameAs": [
    "https://mastodon.social/@berliner_schnauze",
    "https://www.facebook.com/Berliner.Schnauze030",
    "https://github.com/felix-berlin/berliner-schnauze"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "url": "https://berliner-schnauze.wtf/wort-vorschlagen",
    "availableLanguage": "de"
  }
}
```

Once `@id` is added to `Organization`, update the `publisher` inline object in `DefinedTerm` to reference it:

```json
"publisher": { "@id": "https://berliner-schnauze.wtf/#organization" }
```

---

## Finding 4 — DefinedTerm: `comment` property validity

**Severity: Info**

### Assessment

The word pages use `comment` to attach usage examples as `Comment` objects:

```json
"comment": [
  { "@type": "Comment", "text": "Inne Ferien wer' ick ma richtich ausaal'n." }
]
```

`comment` is a valid `schema.org` property on `Thing` (and therefore on `DefinedTerm`) and `Comment` is a valid `schema.org` type. This is not invalid markup. Google does not surface `Comment` nodes as a dedicated rich result, but the data is structurally correct and benefits AI/LLM citation and entity resolution.

The overall `DefinedTerm` block is well-formed. Notable strengths:

- `termCode` populated from the slug
- `inDefinedTermSet` links back to the parent `DefinedTermSet`
- `mainEntityOfPage` uses absolute URL via `canonicalUrl()`
- `dateCreated` / `dateModified` in ISO 8601
- `subjectOf` with `AudioObject` when audio is available
- `image` with `ImageObject` and dimensions when an image is available
- `inLanguage: "de-DE"` declared
- `disambiguatingDescription` populated when article (der/die/das) is known

No required properties are missing. The `identifier` field carries the WordPress base64 node ID (`cG9zdDo1NzAz`) — this is valid as a unique identifier but consider whether a more human-readable or stable identifier (e.g., the slug itself) would be preferable for `identifier`; `termCode` already carries the slug so the current split is consistent.

---

## Finding 5 — Games page: no schema at all

**Severity: Medium**
**Affected pages: `/games/berliner-oder-nicht`**

### What is wrong

`/games/berliner-oder-nicht.astro` renders a Vue island with no `<script type="application/ld+json">` at all. The page has a title and description but zero structured data, missing both rich result eligibility and entity signal for the game.

### Recommended schema

`VideoGame` is the most precise match. `SoftwareApplication` with `applicationCategory: "Game"` is the fallback if the page is not considered a true video game.

```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "@id": "https://berliner-schnauze.wtf/games/berliner-oder-nicht#game",
  "name": "Berliner oder nicht?",
  "description": "Echtes Berlinerisch oder erfunden? Swipe-Game mit Streak-Multiplikator und Highscore.",
  "url": "https://berliner-schnauze.wtf/games/berliner-oder-nicht",
  "inLanguage": "de-DE",
  "genre": "Quiz",
  "playMode": "SinglePlayer",
  "applicationCategory": "Game",
  "operatingSystem": "Web Browser",
  "publisher": {
    "@id": "https://berliner-schnauze.wtf/#organization"
  }
}
```

Also add a two-item `BreadcrumbList` for the games page:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@id": "https://berliner-schnauze.wtf/",
        "name": "Start"
      }
    },
    {
      "@type": "ListItem",
      "position": 2,
      "item": {
        "@id": "https://berliner-schnauze.wtf/games/berliner-oder-nicht",
        "name": "Berliner oder nicht?"
      }
    }
  ]
}
```

---

## Finding 6 — DefinedTermSet on `/wort`: missing `@id` and `numberOfItems`

**Severity: Low**
**Affected pages: `/wort`**

### What is wrong

The `DefinedTermSet` on the index page has no `@id`, preventing it from being referenced by `inDefinedTermSet` on word pages as a shared IRI. Currently, word pages embed the term set inline as an anonymous object. Adding a stable `@id` to the index page's `DefinedTermSet` and changing word pages to reference it by `@id` makes the graph richer and more compressible for crawlers.

`numberOfItems` (integer count of words) and `hasPart` (array of `DefinedTerm` references) are also missing. At 916 entries, `hasPart` is too large to inline, but `numberOfItems` is cheap and useful.

### Recommended update to `/wort` schema

```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "@id": "https://berliner-schnauze.wtf/wort#termset",
  "description": "Berliner Dialekt Wörterbuch - Berlinerisch zu Hochdeutsch.",
  "inLanguage": "de-DE",
  "name": "Berliner Schnauze Wörterbuch",
  "url": "https://berliner-schnauze.wtf/wort",
  "numberOfItems": 916,
  "publisher": {
    "@id": "https://berliner-schnauze.wtf/#organization"
  }
}
```

Update `inDefinedTermSet` on word pages to reference by `@id`:

```json
"inDefinedTermSet": { "@id": "https://berliner-schnauze.wtf/wort#termset" }
```

---

## Finding 7 — FAQPage not present (informational)

**Severity: Info**

Word pages do not include `FAQPage` markup. This is correct: Google retired FAQ rich results for all sites on 2026-05-07, so there is no SERP feature benefit. If GEO/AI citation visibility for Q&A-style content is a goal, `FAQPage` can still be added as it aids LLM entity resolution, but it is not a priority. Word pages do not have a genuine user Q&A structure, so `QAPage` is also not applicable.

---

## Validation Summary

| Schema block | Page | Required props | Absolute URLs | Valid types | Rich result eligible |
|---|---|---|---|---|---|
| `WebSite` | `/` | Pass | Pass | Pass | No (missing `potentialAction`) |
| `Organization` | `/` | Pass | Pass | Pass | Pass (Knowledge Panel) |
| `DefinedTermSet` | `/wort` | Pass | Pass | Pass | N/A |
| `BreadcrumbList` | `/wort`, `/wort/*` | **Fail** — `@id` relative + `.html` suffix | **Fail** | Pass | **Blocked** |
| `DefinedTerm` | `/wort/*` | Pass | Pass | Pass | Pass |
| (none) | `/games/*` | — | — | — | **Missing** |

---

## Priority Order for Fixes

1. **Critical** — Fix `BreadcrumbList` `@id` values (relative paths + `.html` suffix) across all ~917 pages. This is a single code change in `[...wordSlug].astro` and `wort/index.astro`. Unblocks breadcrumb rich results site-wide.
2. **High** — Add `potentialAction: SearchAction` to `WebSite` on homepage once a stable search URL exists.
3. **Medium** — Add `@id` to `Organization` and update `publisher` references to use IRI.
4. **Medium** — Add `VideoGame` + `BreadcrumbList` schema to the games page.
5. **Low** — Add `@id` and `numberOfItems` to `DefinedTermSet`; update `inDefinedTermSet` references to use IRI.
6. **Info** — `comment` property on `DefinedTerm` is valid; no action needed.
7. **Info** — No `FAQPage` gap; Google SERP feature is retired.
