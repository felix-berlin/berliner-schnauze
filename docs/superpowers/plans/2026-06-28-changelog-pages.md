# Plan: Changelog-Seiten

## Ziel

Zwei neue Seitenbereiche erstellen:

1. **User-Changelog** — `/changelog/` (Übersicht) + `/changelog/3.35.0` (Detailseite pro Version)
   - Quellformat: `docs/user-changelog/v{VERSION}.md` (Markdown mit Frontmatter)
   - User-facing, Deutsch, non-technical
2. **Technischer Changelog** — `/technischer-changelog`
   - Rendert `CHANGELOG.md` direkt als HTML
   - Für Entwickler/technisch interessierte

---

## Phase 0: Discovery (abgeschlossen)

### Erlaubte APIs

| API | Quelle | Verwendung |
|-----|--------|------------|
| `Layout.astro` | `src/layouts/Layout.astro:12–19` | Einziges Layout, Props: `{ bodyClasses?, content: { title, seo? }, contentClasses? }` |
| `Astro.glob()` | Astro built-in | Alle `.md`-Dateien aus `docs/user-changelog/` laden |
| Markdown-Import | Astro built-in | `import { Content } from '../../CHANGELOG.md'` — gibt `Content`-Komponente |
| `SeoProps` | `@/types/seo` | Optional in `content.seo` für Meta-Tags |
| `getStaticPaths()` | Astro built-in | Statische Routen für `[version].astro` generieren |

### Antipatterns

- **NICHT** `scoped` CSS in Astro-Files — BEMIT-Naming stattdessen
- **NICHT** relative Imports für Komponenten — immer `@layouts/`, `@styles/` etc.
- **NICHT** Styles global in `app.scss` — eigene SCSS-Datei pro Seite
- **NICHT** `@stores/index` importieren (hat Seiteneffekte via `wordList.ts`)

### Bestehende Struktur

```
src/pages/
  index.astro           → Layout.astro
  wort/[...wordSlug].astro
  games/berliner-oder-nicht.astro
  settings/index.astro
  # kein changelog/ Verzeichnis vorhanden
docs/user-changelog/
  v3.35.0.md            → existiert bereits, 54 Zeilen, KEIN Frontmatter
```

---

## Phase 1: Frontmatter zu User-Changelog-Dateien hinzufügen

Astro braucht YAML-Frontmatter um Metadaten aus `.md`-Dateien per `Astro.glob()` zu lesen.

### Aufgaben

**1.1** `docs/user-changelog/v3.35.0.md` — Frontmatter an Dateianfang einfügen (vor dem bestehenden `# Was ist neu...`-Heading):

```yaml
---
version: "3.35.0"
releaseDate: "2026-06-27"
title: "Was ist neu in Version 3.35.0?"
description: "Berliner oder Nicht-Spiel, komplettes Redesign der Wortseiten und neue Buchempfehlungen."
---
```

> Bestehenden Markdown-Content (ab `# Was ist neu...`) **nicht anfassen**.
> Das `# Was ist neu...`-Heading kann danach entfernt werden, da der Titel im Frontmatter steht und auf der Detailseite als `<h1>` gerendert wird — oder belassen, wenn es als Seiteninhalt-Heading gebraucht wird.

### Verification

```bash
grep -n "version:" docs/user-changelog/v3.35.0.md   # → version: "3.35.0"
grep -n "releaseDate:" docs/user-changelog/v3.35.0.md  # → releaseDate: "2026-06-27"
```

---

## Phase 2: User-Changelog — Detailseite pro Version

**Neue Datei:** `src/pages/changelog/[version].astro`

### Glob-Pfad (von dieser Datei aus)

```
src/pages/changelog/[version].astro
   ../       → src/pages/
   ../../    → src/
   ../../../  → Projektroot
../../../docs/user-changelog/*.md  ✓
```

### Implementierung

```astro
---
import Layout from '@layouts/Layout.astro';

export async function getStaticPaths() {
  const pages = await Astro.glob('../../../docs/user-changelog/*.md');
  return pages.map((page) => ({
    params: { version: page.frontmatter.version },
    props: { page },
  }));
}

const { page } = Astro.props;
const { Content, frontmatter } = page;
---

<Layout
  content={{
    title: frontmatter.title,
    seo: {
      opengraphTitle: frontmatter.title,
      opengraphDescription: frontmatter.description,
    },
  }}
>
  <article class="o-container c-user-changelog">
    <header class="c-user-changelog__header">
      <h1 class="c-user-changelog__title">{frontmatter.title}</h1>
      <time class="c-user-changelog__date" datetime={frontmatter.releaseDate}>
        Veröffentlicht am {new Date(frontmatter.releaseDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
      </time>
    </header>
    <div class="c-user-changelog__content">
      <Content />
    </div>
  </article>
</Layout>

<style lang="scss">
  @use "@styles/pages/changelog-detail";
</style>
```

> Falls das `.md` bereits ein `# Was ist neu...` H1 enthält: das Heading aus dem `.md` entfernen (Phase 1) oder im `<Content />`-Bereich per CSS das erste `h1` ausblenden.

### Verification

```bash
pnpm build:local 2>&1 | grep -E "error|Error"   # keine Fehler
# Build-Output prüfen:
grep -r "changelog/3.35.0" dist/ | head -5       # Route existiert im Build
```

---

## Phase 3: User-Changelog — Übersichtsseite

**Neue Datei:** `src/pages/changelog/index.astro`

### Implementierung

```astro
---
import Layout from '@layouts/Layout.astro';

const pages = await Astro.glob('../../../docs/user-changelog/*.md');
const sorted = pages.sort((a, b) =>
  b.frontmatter.version.localeCompare(a.frontmatter.version, undefined, { numeric: true })
);
---

<Layout
  content={{
    title: 'Was ist neu?',
    seo: {
      opengraphTitle: 'Was ist neu? — Berliner Schnauze',
      opengraphDescription: 'Alle Neuigkeiten und Verbesserungen der Berliner Schnauze App.',
    },
  }}
>
  <section class="o-container c-changelog-overview">
    <h1 class="c-changelog-overview__title">Was ist neu?</h1>
    <ul class="c-changelog-overview__list">
      {sorted.map((p) => (
        <li class="c-changelog-overview__item">
          <a class="c-changelog-overview__link" href={`/changelog/${p.frontmatter.version}`}>
            {p.frontmatter.title}
          </a>
          <time class="c-changelog-overview__date" datetime={p.frontmatter.releaseDate}>
            {new Date(p.frontmatter.releaseDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </time>
          {p.frontmatter.description && (
            <p class="c-changelog-overview__description">{p.frontmatter.description}</p>
          )}
        </li>
      ))}
    </ul>
  </section>
</Layout>

<style lang="scss">
  @use "@styles/pages/changelog-overview";
</style>
```

### Verification

```bash
# Nach Build: Übersichtsseite im Output vorhanden
ls dist/changelog/index.html        # muss existieren
ls dist/changelog/3.35.0/index.html # muss existieren
```

---

## Phase 4: Technischer Changelog

**Neue Datei:** `src/pages/technischer-changelog.astro`

### Glob-Pfad (von dieser Datei aus)

```
src/pages/technischer-changelog.astro
   ../     → src/
   ../../  → Projektroot
../../CHANGELOG.md  ✓
```

### Implementierung

```astro
---
import Layout from '@layouts/Layout.astro';
import { Content } from '../../CHANGELOG.md';
---

<Layout
  content={{
    title: 'Technischer Changelog',
    seo: {
      opengraphTitle: 'Technischer Changelog — Berliner Schnauze',
      opengraphDescription: 'Vollständiger technischer Changelog mit allen Commits und Versionen.',
    },
  }}
>
  <article class="o-container c-technical-changelog">
    <Content />
  </article>
</Layout>

<style lang="scss">
  @use "@styles/pages/technical-changelog";
</style>
```

> **Hinweis:** Astro verarbeitet `.md`-Dateien beim Import zu HTML-Komponenten. `CHANGELOG.md` enthält GitHub-Markdown-Links — diese werden korrekt als `<a>`-Tags gerendert.

### Verification

```bash
ls dist/technischer-changelog/index.html   # muss nach Build existieren
```

---

## Phase 5: SCSS-Dateien

Drei neue SCSS-Dateien anlegen (Minimal-Skeleton, dann nach Bedarf ausbauen):

**`src/styles/pages/_changelog-overview.scss`**
```scss
.c-changelog-overview {
  &__title { }
  &__list {
    list-style: none;
    padding: 0;
  }
  &__item { }
  &__link { }
  &__date { }
  &__description { }
}
```

**`src/styles/pages/_changelog-detail.scss`**
```scss
.c-user-changelog {
  &__header { }
  &__title { }
  &__date { }
  &__content {
    // Prose-Styling für Markdown-Output
    h2 { }
    p { }
    ul { }
  }
}
```

**`src/styles/pages/_technical-changelog.scss`**
```scss
.c-technical-changelog {
  // Prose-Styling für CHANGELOG.md Markdown-Output
  h1, h2, h3 { }
  a { }
  ul { }
  code { }
}
```

> Imports in den jeweiligen `<style lang="scss">`-Blöcken der `.astro`-Dateien (bereits in Phase 2/3/4 eingebaut).

---

## Phase 6: Verifikation

### Build-Check

```bash
pnpm build:local
# Erwarteter Output enthält:
# ✓ /changelog/
# ✓ /changelog/3.35.0
# ✓ /technischer-changelog
```

### TypeScript

```bash
pnpm typechecking   # keine neuen Fehler
```

### Lint

```bash
pnpm lint           # keine neuen Fehler
```

### Browser-Checks (nach `pnpm server:preview`)

- [ ] `/changelog/` — Übersichtsseite lädt, v3.35.0 in der Liste, Link funktioniert
- [ ] `/changelog/3.35.0` — Detailseite lädt, Markdown korrekt als HTML gerendert, Datum korrekt formatiert
- [ ] `/technischer-changelog` — lädt, CHANGELOG.md-Content als HTML, Links klickbar
- [ ] Keine 404-Fehler in der Browser-Konsole
- [ ] Mobile-Ansicht (375px) — kein horizontales Overflow

---

## Dateiübersicht

| Aktion | Datei |
|--------|-------|
| Ändern | `docs/user-changelog/v3.35.0.md` — Frontmatter hinzufügen |
| Neu | `src/pages/changelog/index.astro` |
| Neu | `src/pages/changelog/[version].astro` |
| Neu | `src/pages/technischer-changelog.astro` |
| Neu | `src/styles/pages/_changelog-overview.scss` |
| Neu | `src/styles/pages/_changelog-detail.scss` |
| Neu | `src/styles/pages/_technical-changelog.scss` |
