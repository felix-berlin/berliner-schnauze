---
name: Berliner Schnauze
description: Berlin-dialect translator and lexicon — fast word lookup with a hand-stamped postcard texture
colors:
  currywurst-400: "#e28964"
  currywurst-500: "#cf5736"
  currywurst-600: "#b23b27"
  currywurst-100: "#fcead7"
  currywurst-200: "#fad0b0"
  berlin-red-500: "#cf3018"
  berlin-red-berlin-500: "#f2391d"
  ink-base: "#2b333b"
  grey-100: "#4e545a"
  grey-200: "#373c40"
  white-100: "#f9f9f9"
  white-200: "#f5f5f5"
  cream-500: "#e3e3d2"
  gold-500: "#e1b125"
  danger: "hsl(8deg 89% 53%)"
  success: "#35a672"
typography:
  display:
    fontFamily: "Berliner, var(--font-berliner)"
    fontWeight: "normal"
    lineHeight: 1.1
  body:
    fontFamily: "Berlin, var(--font-berlin)"
    fontWeight: 400
    letterSpacing: "1px"
  body-bold:
    fontFamily: "Berlin, var(--font-berlin)"
    fontWeight: 700
  label:
    fontFamily: "Berlin, var(--font-berlin)"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  none: "0px"
  sm: "4px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
components:
  button-theme:
    backgroundColor: "{colors.ink-base}"
    textColor: "{colors.white-100}"
    rounded: "{rounded.none}"
    padding: "0.25rem"
  button-default:
    backgroundColor: "{colors.currywurst-100}"
    textColor: "{colors.ink-base}"
    rounded: "{rounded.none}"
    padding: "0.25rem"
  section-card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.sm}"
  badge:
    backgroundColor: "{colors.currywurst-200}"
    textColor: "{colors.ink-base}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
---

# Design System: Berliner Schnauze

## 1. Overview

**Creative North Star: "The Postcard Rule"**

Every raised surface in this system carries the same texture: a dashed hand-stamped line. It shows up as the underline beneath a headword, the divider between a section-card's header and body, the hover border on a button, the underline on an inline link. That one repeated stroke is doing the work most design systems spend a whole "personality" section trying to fake — it reads as annotated, postcard-stamped, a little scrappy. Cheeky (schnodderig) and warm (heimatlich) at once, the way the Berlin dialect itself is blunt but affectionate.

The palette sits a dark navy-ink base (`#2b333b`) against a Currywurst-orange family that carries almost every accent, badge, border, and stat highlight, with Berlin Red reserved as the rarer, more declarative color — secondary role, alert-adjacent, the brand's own name-color. This is a **product** register: the job is fast lookup, so decoration never gets between a search and its answer. Warmth and cheek live in the dashed-line texture and in copy voice, not in ornamental UI weight.

This system explicitly rejects generic SaaS/dictionary-app neutrality — flat corporate blue-on-white, no personality in empty/error states, decoration for its own sake. If a screen could belong to any dictionary app, it's failed the brief.

**Key Characteristics:**
- Dashed-line texture as the one recurring signature (borders, underlines, dividers)
- Currywurst orange dominant; Berlin Red rare and declarative
- Dark navy-ink (`#2b333b`) carries text and dark-mode surfaces, never used as a bright accent
- Flat, square-cornered buttons (0 radius); soft 4px radius everywhere else
- One consistent "Paper Lift" shadow for every raised card/hero, no ad hoc shadows

## 2. Colors

The palette reads as a hand-labeled dossier: warm orange annotations and a rare red stamp against dark navy ink, on off-white paper.

### Primary
- **Currywurst Orange** (`#cf5736` core, ramp `#fcead7` → `#781111`): the dominant accent. Badges, borders, stat highlights, button fills, the word-of-the-day marker, the dashed underline beneath headwords. Carries most of the system's color weight.

### Secondary
- **Berlin Red** (`#cf3018`, brand mark variant `#f2391d`): rare and declarative — the `--secondary` role, used where the system needs to speak with its own name rather than a generic accent. In dark mode this role hands off to a blue tint instead, keeping red reserved rather than doubled up.

### Neutral
- **Ink Base** (`#2b333b`): the structural dark. Body text ink in light mode, and the source color for every dark-mode surface tint (`--new-blue-200` … `--new-blue-600` are `color-mix` steps off this same value). Never used as a bright UI accent — it's the paper's ink, not a highlight.
- **Grey** (`#4e545a` / `#373c40`): secondary text, dashed border color on hero/card containers.
- **White** (`#f9f9f9` / `#f5f5f5` / `#faf6fa`): page and card backgrounds.
- **Cream** (`#e3e3d2`): dark-mode body text color — a warm off-white standing in for pure white, keeping dark mode from feeling stark.

### Alert
- **Danger** (`hsl(8deg 89% 53%)`): form/validation errors only.
- **Success** (`#35a672`): confirmation states.
- **Gold** (`#e1b125`): a fourth, sparingly-used accent — reserve for singular highlight moments (do not let it compete with Currywurst Orange for the same job).

### Named Rules
**The Ink Stays Structural Rule.** The navy-ink base (`#2b333b`) is text and dark-mode surface only. If it starts appearing as a button fill or badge background in light mode, that's the accent system leaking into the ink system — stop and re-route to orange or red.

**The One Red Rule.** Berlin Red is the brand's own color, not a general-purpose accent. It shows up rarely — logo, brand marks, one or two declarative UI moments — so that when it appears, it still reads as *the* color, not *a* color.

## 3. Typography

**Display Font:** Berliner (`var(--font-berliner)`)
**Body Font:** Berlin (`var(--font-berlin)`)

**Character:** Berliner carries every heading at normal weight — a handwritten, headline-only face. Berlin carries body copy and buttons at a deliberate `letter-spacing: 1px`, giving even plain paragraph text a slightly stamped, spaced-out rhythm rather than default-tight body type.

### Hierarchy
- **Display / Headline** (Berliner, normal weight, clamp `2rem`–`3.75rem` on word titles, line-height 1.1): headword titles, all `h1`–`h6`. Always Berliner, never Berlin.
- **Body** (Berlin, 400, `letter-spacing: 1px`, 1rem): paragraph and list copy inside section cards. Cap prose at 65–75ch.
- **Body Bold** (Berlin, 700): section-card titles (1.25rem), stat values, grammar entries.
- **Label** (Berlin, 700, 0.7rem, `letter-spacing: 0.05em`, uppercase): badges, stat labels, grammar tags — small, dense, functional, never decorative eyebrows above sections.

### Named Rules
**The Handwritten Headline Rule.** Headings are always Berliner; body is always Berlin. The two fonts never trade places — Berliner never sets a paragraph, Berlin never sets a headword title.

## 4. Elevation

**Paper Lift** — the system's only shadow. Every card and hero container gets the identical two-layer soft shadow: a tight near-black hairline plus a soft ambient spread. It reads as a card resting on a table, not a hovering app panel. No component invents its own shadow value.

### Shadow Vocabulary
- **Paper Lift** (`box-shadow: 0 0.5px 0.6px rgb(0 0 0 / 8%), 0 4px 5px rgb(0 0 0 / 16%)`): section-cards, word-hero. The default and only elevation state for raised surfaces.

### Named Rules
**The One Shadow Rule.** If a new component needs to feel "raised," it uses Paper Lift exactly as specified above — not a lighter or heavier variant. Depth is uniform across the system, not a scale.

## 5. Components

### Buttons
- **Shape:** square corners, 0 radius (`.c-button`) — flat and stamped, not soft.
- **Default:** Currywurst-100 background (`#fcead7`), Currywurst-600 border (`#b23b27`), ink-colored text.
- **Themed variant** (`--theme`): ink-base background, white text, Berliner font — the "declarative" button used for primary actions.
- **Hover:** border style flips from solid to **dashed**, plus a soft orange glow (`box-shadow: 0 0 12px color-mix(orange-500, white 60%)`). The dashed flip is the interaction signature — do not replace it with a color-only hover.
- **Filter variant:** active/current state fills Currywurst-500 with a dashed gold border and black text — the loudest state in the system, reserved for "this filter is on."

### Section Cards
- **Corner Style:** 4px radius on the top corners only (`4px 4px 0 0`) — a tab/label feel, not a fully rounded card.
- **Background:** white in light mode, ink-tint (`--new-blue-400`) in dark mode.
- **Shadow Strategy:** Paper Lift (see Elevation).
- **Border:** 1px **dashed** grey border; header/footer dividers are also dashed, never solid.
- **Distinctive behavior:** CSS `counter()` auto-numbers cards (`decimal-leading-zero`); an `--unnumbered` modifier swaps the number for an em dash.

### Badges / Tags
- **Style:** Currywurst-200 background, Currywurst-300 border, 4px radius, uppercase label type (0.7rem, `letter-spacing: 0.05em`). Used for word-of-the-day marker, word-type (Wortart), and grammar tags — functional metadata chips, not decorative eyebrows.

### Stat Boxes / Callouts
- **Stat box:** Currywurst-tinted background, dashed Currywurst-200 border, 4px radius.
- **Infotext callout:** the one deliberate exception to "no colored side-stripes" — a 3px solid Currywurst-300 `border-inline-start` marks source/citation blocks specifically. This is a single, named, intentional use; it is not a general card-border pattern (see Do's and Don'ts).

### Links
- Dashed underline (`text-decoration: underline dashed from-font`) inside content bodies — same texture as button hover and card dividers, extending the Postcard Rule into inline text.

### Signature Component: The Headword Underline
The word-hero title's `<dfn>` gets a dashed repeating-linear-gradient underline (`5px` dash, `4px` gap, Currywurst-300) instead of a plain `text-decoration`. This is the single most visible expression of the Postcard Rule and should not be replaced with a solid underline.

## 6. Do's and Don'ts

### Do:
- **Do** use the dashed-line texture (borders, underlines, dividers) as the system's one recurring signature — buttons, section-cards, links, the headword underline.
- **Do** keep Currywurst Orange as the dominant accent family; reserve Berlin Red for rare, declarative brand moments only.
- **Do** apply Paper Lift (`0 0.5px 0.6px rgb(0 0 0/8%), 0 4px 5px rgb(0 0 0/16%)`) as the only shadow for raised surfaces.
- **Do** set headings in Berliner and body copy in Berlin, with the 1px body letter-spacing intact.
- **Do** keep functional metadata (badges, tags, stat labels) uppercase and small — but never stretch that into a decorative section eyebrow.
- **Do** hold WCAG AA contrast (≥4.5:1 body text) even where the palette leans warm/orange on cream.

### Don't:
- **Don't** flatten the Schnauze voice into generic SaaS/dictionary-app neutrality — no flat corporate blue-on-white, no personality-free empty/error states.
- **Don't** add new colored `border-left`/`border-inline-start` accent stripes beyond the one named exception (the infotext citation callout). One more and it stops being a deliberate signal.
- **Don't** use the ink-base navy (`#2b333b`) as a bright UI accent — it's structural ink and dark-mode surface only.
- **Don't** invent a new shadow value for a "raised" component — reuse Paper Lift exactly.
- **Don't** round button corners — flat/square is the button shape; reserve the 4px radius for cards, badges, and stat boxes.
- **Don't** swap Berliner and Berlin between roles — Berliner never sets body copy, Berlin never sets a headword title.
