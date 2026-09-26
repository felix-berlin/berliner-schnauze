# Accordion

Thin Vue wrappers around native `<details>` / `<summary>`. No state, no JS required: rendered without a
`client:*` directive (e.g. from an `.astro` page) the markup works fully static; inside a hydrated
island it behaves the same.

## Components

| Component          | Renders                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `BaseAccordion`    | `<div class="c-accordion">` wrapper + the accordion styles.                    |
| `AccordionItem`    | `<details>`. Props: `name` (exclusive group), `open` (initially open).         |
| `AccordionTrigger` | `<summary>`. Prop `level` wraps the label in `h1`–`h6`. Slot `icon` (chevron). |
| `AccordionContent` | Content panel (everything in `<details>` after the `<summary>`).               |

```ts
import {
  BaseAccordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@components/accordion";
```

## Usage

### Only one open at a time

Items with the same `name` form an exclusive group (native `<details name>`):

```html
<BaseAccordion>
  <AccordionItem v-for="(faq, idx) in faqs" :key="faq.q" name="faq" :open="idx === 0">
    <AccordionTrigger :level="3">{{ faq.q }}</AccordionTrigger>
    <AccordionContent>{{ faq.a }}</AccordionContent>
  </AccordionItem>
</BaseAccordion>
```

### Several open at once

Leave out `name`.

### Custom icon

```html
<AccordionTrigger>
  Label
  <template #icon><ChevronDown width="14" height="14" /></template>
</AccordionTrigger>
```

## Rules

- `<summary>` must stay the first child of `AccordionItem`, and it must not contain interactive
  elements (buttons, links). Place such controls next to the `<details>` — see
  `src/components/PwaCacheBucketList.vue` (delete button in a grid column beside the item).
- Everything except the `<summary>` is hidden while closed. Content that must stay visible belongs in
  the trigger.
- No "disabled" state exists natively: render a plain element instead of `AccordionItem` (see the empty
  buckets in `PwaCacheBucketList.vue`).

## Styling

Styles live in `src/styles/components/_accordion.scss`. Open state is `[open]`, not a class. The chevron
rotates, the content fades in via `@starting-style`. There is no height animation: animating `<details>`
height needs `interpolate-size`, which is not Baseline.
