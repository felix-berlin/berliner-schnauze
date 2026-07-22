# sitemap Specification

## Purpose

Define how the site's XML sitemap is generated: which routes it includes, which it
excludes, how dated content carries `lastmod` timestamps, and how content dates are
fetched at build time.

## Requirements

### Requirement: Dated content routes carry a lastmod date

The generated sitemap SHALL include a `lastmod` value for word detail pages and
magazine articles, derived from the backing content's `modifiedGmt` timestamp in
the WordPress backend, expressed as an ISO 8601 UTC string. Themen pages are
WordPress taxonomy archives with no modification timestamp and therefore carry no
`lastmod`.

#### Scenario: Word detail page has lastmod

- **WHEN** the sitemap is generated and a `/wort/<slug>` URL is emitted
- **THEN** its `<lastmod>` equals that word's `modifiedGmt` timestamp as ISO 8601

#### Scenario: Magazine article has lastmod

- **WHEN** the sitemap is generated and a `/magazin/<slug>` URL is emitted
- **THEN** its `<lastmod>` equals that post's `modifiedGmt` timestamp as ISO 8601

#### Scenario: Themen archive has no lastmod

- **WHEN** the sitemap is generated and a `/themen/<slug>` URL is emitted
- **THEN** the URL is present but carries no `<lastmod>` (taxonomy terms have no
  modification date)

#### Scenario: Missing timestamp does not break the build

- **WHEN** a route's slug has no resolvable modified timestamp (backend omitted it,
  or the route is a static page with no backing content)
- **THEN** the URL is still emitted in the sitemap, just without a `<lastmod>`

### Requirement: Every published magazine article appears in the sitemap

The sitemap SHALL contain a URL for every published magazine article, and the
sitemap `filter` SHALL NOT exclude `/magazin/` or `/themen/` routes.

#### Scenario: Newly published article is included

- **WHEN** a new post is published in the WordPress backend and the site is rebuilt
- **THEN** the sitemap contains its `/magazin/<slug>` URL

#### Scenario: Excluded routes stay excluded

- **WHEN** the sitemap is generated
- **THEN** `/settings*` and the BON `/games/berliner-oder-nicht/share` route are
  absent, and no magazine or themen route is excluded

### Requirement: Content dates are fetched once per build

Last-modified timestamps for each dated content type (words, posts) SHALL be
fetched from the backend at build time and cached for the duration of the build
process, so repeated `serialize` calls do not re-query the backend per URL.

#### Scenario: Repeated serialize calls reuse the cache

- **WHEN** the sitemap `serialize` step runs for many URLs of the same content type
- **THEN** the backend is queried at most once per content type for the whole build

### Requirement: Sitemap is a single index, not split by content type

The sitemap SHALL be emitted as the default `@astrojs/sitemap` index plus its
URL file(s), relying on the integration's automatic 45 000-URL split. It SHALL NOT
be manually partitioned into per-content-type sitemap files at the current corpus
scale.

#### Scenario: Corpus below the entry limit

- **WHEN** the total URL count is below the `@astrojs/sitemap` `entryLimit` (45 000)
- **THEN** a single `sitemap-index.xml` referencing one `sitemap-0.xml` is produced
