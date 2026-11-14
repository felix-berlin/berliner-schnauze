# Wortseite v3

Implemented: the word page (`website/src/pages/wort/[...wordSlug].astro` and the components named in the "Word page v3" bullet of `website/CLAUDE.md`) follows `SPEC.md` (v3.1, second version, 9 Nov 2026: poll starts directly, like and dislike always side by side on the word and on comments, comment ⋯ menu and Strg+Enter, Themen row, compact book cards from 808px). Header, footer, the index pages and spec §15 are out of scope; the header's hide-on-scroll (§3, §16.4) is not built, the tab bar sticks below the header via `--word-tabbar-top`.

`design/` holds the design hand-off, kept as reference only (not served, not imported):

- `Mobile2.dc.html`, `Desktop3.dc.html`, `Poll.dc.html`: the mocks the page was compared against (390px, 1280px, the "Sagste det noch?" card). Open them in a browser.
- `design/ds/`: tokens (`tokens.css`, `colors_and_type.css`), component CSS (`components/bundle.css`) and `components-v3.md`. The live tokens are in `website/tokens/*.tokens.json` (generated into `website/src/styles/tokens/_tokens.generated.scss`); where the app differs from the mock (derived copy, orange budget, missing photo credits) the PR description lists the deviations.
- `generate-desktop.py`: produces the desktop mock from the mobile one.

Checks: `website/src/tests/e2e/word-v3.spec.ts` (sweep), `word-detail.spec.ts`, `word-feedback.spec.ts`, `word-comments.spec.ts`.
