# Legacy style files (detail)

Moved verbatim from `.claude/rules/website-styles.md`. Read when editing a file listed in `website/stylelint.legacy-files.mjs`.

## Legacy files

Applies only to files listed in `website/stylelint.legacy-files.mjs` (not yet migrated). Do not extend them with new features; migrate them whole instead.

- Vue styles: not scoped, `<style lang="scss">` with `@use "@styles/components/name"` only; each component owns `src/styles/components/_name.scss`.
- Every partial wraps its rules in `@layer legacy { ... }` below its `@use` lines.
- [BEMIT](https://gist.github.com/stephenway/a6145d9b4430e8c55a77) naming:

| Prefix           | Purpose                    | Example                       |
| ---------------- | -------------------------- | ----------------------------- |
| `.c-`            | Components (reusable UI)   | `.c-word-card__title--active` |
| `.o-`            | Objects (structural)       | `.o-grid__item`               |
| `.u-`            | Utilities (single-purpose) | `.u-hidden`                   |
| `.is-` / `.has-` | State                      | `.is-active`, `.has-dropdown` |
| `.js-`           | JS hooks (no styling)      | `.js-scroll-target`           |

Pattern `.c-block__element--modifier`, hyphens inside each part, never plain BEM without prefix.

- Old palette and aliases (`var(--orange-600)`) and `butler-mx.dark-mode-class` still work here (aliases in `src/styles/tokens/_legacy-aliases.scss`).
- Breakpoints: `mx.breakpoint`; container queries where the behaviour is about a component's own width (`objects/_word-v18.scss`).
- Shared: `mx.paper-card` / `mx.paper-card-title` (`mixins/_paper-card.scss`); `c-button` with `data-variant="primary"` = orange CTA; `var(--color-muted)` = secondary text. Word page controls (v18 handoff SPEC, not in the repo): `.c-choice` (`aria-pressed`), `c-link` (an `@scope` component), `.c-icon-button`, only the submit has `data-variant="primary"`. Focus ring: one global `:focus-visible` rule (`base/_global.scss`) reads the public, inherited `--focus-ring-style` (default `solid`) and `--focus-ring-color` (default `--color-text-accent`); `.o-word-v18` and `.c-lightbox` set `dashed` + `--color-focus-ring`, form fields set only the colour. Set these properties instead of re-declaring `outline`; a component may change `outline-offset`.
- `@use "@styles/path"`, never `@import`.
