# Berliner Schnauze DS — Wortseiten-Kanon (v2 + v3)

## Word-page canon (v2 — the reference for everything)

The live site is inconsistent: list pages, magazine, games and settings each grew their own card, badge and button styles. **The single-word page (`/wort/<slug>`) is the reference.** When two parts of the product disagree, the word page wins. `components.css` is a direct lift of its SCSS; new screens should be built from these parts:

- **Surfaces** — three only: `.c-word-hero` (orange-tinted `--surface-hero`), `.c-section-card` (white `--surface-sheet`, top-only 4px radius), `.c-paper` / `.c-sidebar` (`--surface-paper`). All share the 1px dashed `--rule-card` border and `--paper-lift`.
- **Inner rules** — dividers inside a surface are 1px dashed `--rule-inner` (orange-200). Never solid.
- **Titles** — card titles are Berlin 700 1.25rem; the headword is Berlin 700 `clamp(2rem,5cqi,3.75rem)` with the `.c-headword` dashed underline. Berliner is for page-level display headings and the quote glyph only.
- **Labels** — `.c-eyebrow` (0.7rem / 700 / uppercase / `--color-muted`) for dt, stat labels, group labels. Never above a section as decoration.
- **Metadata** — `.c-badge` (word type, WdT, Berolinismus) · `.c-tag` (grammar values) · `.c-chip-link` (links to other words). Don't invent a fourth chip.
- **Buttons** — `.c-button` square; `--control` 4px for header; `--primary` orange-600 for white text. Hover = dashed border + glow, everywhere.
- **Side stripes** — exactly two: `.c-infotext` (source/history) and the `.c-sidebar__link.is-active` marker.
- **Radius** — 0 / 2 / 3 / 4px. Nothing larger (the old 8px audio chip and 0.25em badge are retired).
- **Text colours** — `--color-ink-strong` for titles/values, `--color-body` for prose, `--color-muted` for secondary, `--color-accent-text` for orange text. All AA in both modes.

When porting another screen (word list, magazine, settings), replace its local card/badge/button styles with these classes rather than carding the inconsistency.

## Word-page v2 parts (v3)

The mobile-first word page (v2) added parts the canon did not have. They are in `bundle.css` under "v3" and carded in the **Wortseite v3** group:

- **Controls, quiet by default** — `.c-choice` is the one outlined control (answers, audio voice, Bezirk, sort); selected = orange-600 fill. `.c-reaction` (thumbs), `.c-icon-button` (⋮) and `.c-textlink` have no border at rest. A view has at most **one filled control**: `.c-button--primary` or the selected `.c-choice`.
- **Composites** — `.c-choice--tile` (poll answer), `.c-menu` (overflow), `.c-tabbar` (mobile nav; desktop keeps `.c-sidebar`), `.c-image-strip` + `.c-lightbox`, `.c-shelf` + `.c-book` (affiliate, always „Anzeige“), `.c-trend`, `.c-comment`, `.c-letters`, `.c-next-link`, `.c-field`.
- **States** — `.c-skeleton`, `.c-state--error|offline|done`, `.c-empty`. Every interactive block ships all five.
- **Type** — `.t-label` 0.75 · body 1 · `.t-em` 1.25 · `.t-small` 0.75 · `.c-band` (Berliner 1.6rem, page-level bands only). Headings: h1 headword, h2 card or band, h3 inside a card.
- **Chips** — `.c-badge` lost its border; `.c-badge--strong` for Trend only. `.c-tag` is a borderless 16% orange wash.
- **Orange budget** — fills only for the selected choice, the primary button and the Trend badge. Washes (14–16%) for pressed reactions, tags, avatars and the trend box. Everything else is ink, body or muted.
- **Layout** — mobile: tab bar, single column, images as a strip below the hero. Desktop (≥ 1000px): `.c-sidebar` + one content column (max 1160px), images in the hero's right column.


## Choice

Choice: the single outlined control on v3 screens, for anything the reader picks — poll answers, Bezirk, audio voice, sort order.

Classes are in `bundle.css`.

- `.c-choice`: transparent ground, 1px solid `--control-border`, square corners, min-height 44px.
- Hover: dashed border plus warm glow (the system-wide hover).
- Selected: `aria-pressed="true"` (toggle) or `aria-checked="true"` (radio role) fills orange-600 with white 700 text. This is one of only two orange fills on a page; the other is `.c-button--primary`.
- `:disabled`: dotted border, muted text.
- `.c-choice-group`: wrapping flex row, 0.5rem gap.
- Replaces the old mix of `.c-button`, `--filter` and pill styles inside content. `.c-button--filter` stays for list-page filters only.

## PollTile

Poll tile: the big answer button of the „Sagste det noch?“ poll. It is a `.c-choice` with the `--tile` modifier, so it shares hover and selected states.

- `.c-choice--tile`: full width, min-height 72px, `--surface-chip` ground, left-aligned.
- `.c-choice__icon`: 40px dashed square holding a Lucide icon; on hover it tilts −8° and grows 8% (off under reduced motion).
- `.c-choice__text`: `<b>` answer plus a `<span>` hint in 0.75rem muted.
- Stack tiles vertically on mobile; on desktop three in a row is fine.
- One tile per answer, no extra confirm button: picking a tile casts the vote.

## Reaction

Reaction: the quiet thumb used for word likes, the poll's „Und jefällt dir ditt Wort?“ and „hilfreich“ on comments.

- `.c-reaction`: no border at rest, dashed `--rule-card` border on hover, muted icon. 44×44 minimum.
- Pressed: `aria-pressed="true"` gives accent text on a 15% orange wash. Never a solid fill — reactions are not the primary action.
- `.c-reaction-group` wraps like plus dislike. Desktop: only like is shown; hovering or focusing the group reveals the dislike (`.c-reaction-group__more`, slides in 0.2s). Touch: dislike shows once the reader has disliked, and is reachable from the ⋮ menu.
- Counts sit inside the button as a `<span>`.

## Menu

Menu: the ⋮ overflow on the word hero. Secondary actions live here so the hero keeps one visible action (like).

- `.c-icon-button`: 44×44, borderless at rest, dashed border on hover and while `aria-expanded="true"`.
- `.c-menu-anchor` positions `.c-menu` below-right. `.c-menu`: `--surface-sheet`, dashed `--rule-card` border, paper shadow.
- `.c-menu__item`: 44px rows, orange-400 Lucide icon, 14% orange wash on hover/focus.
- Done feedback: swap icon to `check`, label to „Link kopiert“ / „Wort kopiert“, set `data-done="true"`; revert after 2s. No separate toast for copy.
- Keyboard: Enter/Space opens, arrow keys move, Esc closes and returns focus to the button.

## TextLink

Text link: any secondary action that should not look like a button.

- `.c-textlink`: muted text, dashed `from-font` underline, accent colour on hover, 44px tall hit area.
- `.c-textlink--inline` for links inside running text (no min-height, inherits colour).
- Use it instead of a second outlined button next to a primary one. A view has at most one `.c-button--primary`; everything else beside it is a text link.

## TabBar

Tab bar: sticky, horizontally scrolling in-page nav for the word page below 808px. From 808px the same links render as `.c-sidebar`.

- `.c-tabbar`: sticky top, `--surface-sheet`, dashed bottom rule.
- `.c-tabbar__tab`: 48px tall, 0.85rem 700 muted; current = `aria-current="true"`, ink text plus 3px orange-600 underline.
- Links are anchors to section ids; the current tab follows scroll (scroll-spy) and scrolls itself into view.
- Only sections that exist get a tab.

## BookCard

Book card: affiliate recommendations on the word page. Built to be inviting (cover, title, a clear CTA) and honest (always labelled).

- `.c-shelf`: horizontal snap scroller on mobile (cards 64% wide so the next one peeks), 3-column grid from 808px.
- `.c-book`: `--surface-paper` with paper shadow, glow on hover. Inside: `.c-book__cover` (3:4), `.c-book__title`, a `.t-small` format line, `.c-book__cta` („Bei Amazon ansehen ↗“, accent 700, dashed top rule).
- The section heading carries a `.c-badge` „Anzeige“. Links get `rel="sponsored noopener"`.
- Max three books; hide the section when there are none.

## TrendBox

Trend box: appears under the hero while a word is in the trend list, paired with a `.c-badge--strong` „Im Trend · Platz N“ in the hero that links to it.

- `.c-trend`: 14% orange wash over `--surface-paper`, paper shadow, two columns (text, sparkline), last child spans both.
- Text: `.t-label` in accent, `.t-em` rank, `.t-small` views and change.
- `.c-trend__bars`: 7 bars (one per day), heights in %, today in orange-600. Decorative (`aria-hidden`); the numbers are in the text.
- Metric and period are a product decision still open (views in 7 days vs. week-over-week growth).

## Comment

Comment: one entry in the Kommentare section.

- `.c-comment-list` > `.c-comment`: grid of a 36px avatar column and content; entries separated by dashed `--rule-inner`.
- `.c-comment__avatar`: initial on a 16% orange wash, 4px radius (no circles in this system).
- `.c-comment__meta`: name in ink 700, then relative date, 0.75rem muted.
- `.c-comment__actions`: a `.c-reaction` „hilfreich · N“ and a `.c-textlink` „Antworten“.
- `.c-comment--reply`: indented 48px, one level only.
- Show 3, then „Alle N Kommentare zeigen“ (text link). Sort tabs (`.c-choice`) appear from 2 comments.

## ImageStrip

Image strip and lightbox: word images are their own block, never mixed into text cards.

- Mobile: `.c-image-strip` snap scroller under the hero, figures 82% wide so the next peeks. Desktop (2-column layout): the same figures move into the hero's right column, first image large, the rest as thumbs.
- `.c-image-strip__btn` wraps the image (4:3 cover) and opens the lightbox; caption with credit is `.t-small`.
- `.c-lightbox`: fixed, 82% black with 4px blur, image max 75vh, a bar with „1 / N“ and a close `.c-icon-button`. Esc closes, arrows page, focus is trapped and returns to the thumbnail.
- Credits are required for every image.

## LetterTiles

Letter tiles: the word spelled as tiles; each tile's fill height shows how common that letter is in German.

- `.c-letters` > `.c-letters__tile` with `--fill: <0–100>%` inline. 44×52 on mobile, 64×72 from 808px.
- Always pair with a `.t-small` legend and a „Häufigkeiten als Zahlen zeigen“ text-link toggle, so the data is not colour/height-only.
- Long words wrap; tiles shrink to 28px minimum.

## NextLinks

Next links: the „Und nu?“ block that ends a word page and offers the next step.

- `.c-next-link`: 60px row on `--surface-paper` with paper shadow; icon (orange-400), label, arrow. Glow on hover.
- Stack on mobile, 3 columns on desktop.
- Three to four links: Ooch im Trend, Zufälliges Wort, Wort-Index, Wort vorschlagen.

## States

States: every interactive block (poll, comments, reactions, word of the day) needs these five.

- Loading: `.c-skeleton` with `--title` / `--line` shapes matching the final layout; shimmer stops under reduced motion. Show after 300ms, never for cached content.
- Error: `.c-state--error` (`role="alert"`), danger stripe and icon, a dialect headline („Ditt hat nich jeklappt.“) and a retry text link. Keep what the reader typed.
- Offline (PWA): `.c-state--offline` (`role="status"`), dashed muted stripe. Disable submit actions and say why; reading still works.
- Done: `.c-state--done`, success stripe, for submitted comments and votes. Copy feedback uses the menu's in-place „kopiert“ instead.
- Empty: `.c-empty`, display-face line plus one muted sentence; no illustration needed.
- Text stays `--color-body` / `--color-ink-strong`; red and green only on stripe and icon, so contrast holds in both themes.

## TypeScale

Type scale: the five sizes a word page uses besides the headword.

- `.c-band`: Berliner display face, 1.6rem. Only for the page-level band that groups several cards („Sprachliche Analyse“). Never inside a card.
- `.t-label`: 0.75rem, 700, uppercase, muted. Row labels („Anhören“, „Trendet jerade“). Replaces ad-hoc eyebrows on v3 screens.
- body: 1rem / 1.5, `--color-body`.
- `.t-em`: 1.25rem, `--color-ink-strong`. One emphasised value per block (rank, count).
- `.t-small`: 0.75rem, muted. Meta lines, captions, footers.

Heading levels: h1 = headword, h2 = section card title or band, h3 = sub-block inside a card. Visual size follows the class, not the level.

## Badge

Badge: the metadata chip for word type, Wort des Tages, Berolinismus and Trend; `.c-tag` carries grammar values.

The consumer provides short text. Classes are in `bundle.css`.

- `.c-badge`: uppercase, 0.7rem, 700, `--surface-badge` ground, no visible border (v3). Can be an `<a>` (glow on hover).
- `.c-badge--strong`: orange-600 fill, white text. Only for „Im Trend · Platz N“; at most one per page.
- `.c-badge--auto`: dashed inner outline; marks a value that is not confirmed („Verb (geraten)").
- `.c-tag`: 0.8rem, no border, 16% orange wash, `--color-body` text. For grammar values (Nominativ, Singular, feminin).
- The word type in the hero badge and in the Grammatik card come from the same field and must read the same.
- Don't invent a fourth chip: links to other words are `.c-chip-link` (see RelatedWords).
