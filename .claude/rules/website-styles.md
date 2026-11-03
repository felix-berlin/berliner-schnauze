---
paths:
  - "website/**/*.scss"
  - "website/**/*.vue"
  - "website/src/styles/**"
---

# Styles: SCSS, BEMIT, breakpoints (website/)

**Vue styles**: NOT scoped — BEMIT class naming provides isolation instead. Use `<style lang="scss">` without `scoped`. Each component owns its SCSS file at `src/styles/components/_name.scss` and loads it via `@use "@styles/components/name"` inside its own `<style>` block — not globally.

**BEMIT naming** ([BEMIT](https://gist.github.com/stephenway/a6145d9b4430e8c55a77) — BEM with namespaces):

| Prefix           | Purpose                    | Example                       |
| ---------------- | -------------------------- | ----------------------------- |
| `.c-`            | Components (reusable UI)   | `.c-word-card__title--active` |
| `.o-`            | Objects (structural)       | `.o-grid__item`               |
| `.u-`            | Utilities (single-purpose) | `.u-hidden`                   |
| `.is-` / `.has-` | State                      | `.is-active`, `.has-dropdown` |
| `.js-`           | JS hooks (no styling)      | `.js-scroll-target`           |

Pattern: `.c-block__element--modifier`. Hyphens separate words within each part (`c-my-component`, not `c-myComponent`). Never use plain BEM without a namespace prefix.

**SCSS imports**: Use `@use "@styles/path"` — not `@import`. Global styles (base resets, typography, utilities) belong in `src/styles/app.scss`.

**Breakpoints & container queries**: Never write raw `@media (width >= vars.$sm)` queries. Fixed viewport breakpoints always go through the sass-butler mixin: `@use "@styles/mixins" as mx;` then `@include mx.breakpoint("sm") { ... }` (direction defaults to `min`; pass `"max"` for a max-width query). The breakpoint map lives in `src/styles/variables/_layout.scss`. Wherever the responsive behavior is really about a component's own available space rather than the viewport, prefer a **container query**: `container-type: inline-size; container-name: x;` on the ancestor, then `@container x (inline-size >= Yrem) { ... }` on the descendant — see `src/styles/components/_word-page-layout.scss` and `_word-gallery-col.scss`.

**Shared SCSS**: raised cards use `@include mx.paper-card` / `mx.paper-card-title` (`src/styles/mixins/_paper-card.scss`); orange CTA = `.c-button--primary`; muted secondary text = `var(--color-muted)`. Word page controls (`docs/design/wortseite/SPEC.md`): selection = `.c-choice` (state via `aria-pressed`), text action = `.c-link`, framed-on-hover icon = `.c-icon-button`, only the submit is `.c-button--primary`. They are global and wrapped in `:where()`, so a component class overrides display/margin/padding without a specificity fight.

Design rules (palette, Postcard Rule, light + dark check): `DESIGN.md` and `website/CLAUDE.md`.
