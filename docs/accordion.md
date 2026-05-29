# Accordion

Reusable accordion component system. Compound component pattern with WAI-ARIA compliance.

## Components

| Component          | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `BaseAccordion`    | Root state provider. Controls open/close logic.            |
| `AccordionItem`    | Scoped wrapper for one item. Generates a11y IDs.           |
| `AccordionHeader`  | Optional semantic heading (`h1`–`h6`) wrapper.             |
| `AccordionTrigger` | The `<button>` element. Full ARIA wiring.                  |
| `AccordionContent` | Animated content panel. Works standalone via `:open` prop. |

Import from barrel:

```ts
import { BaseAccordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionContent } from "@components/accordion";
```

## Usage Patterns

### 1. Standard (single, collapsible)

```html
<BaseAccordion type="single" collapsible>
  <AccordionItem value="q1">
    <AccordionHeader :level="3">
      <AccordionTrigger>Was ist Berliner Schnauze?</AccordionTrigger>
    </AccordionHeader>
    <AccordionContent>Antwort hier...</AccordionContent>
  </AccordionItem>

  <AccordionItem value="q2">
    <AccordionHeader :level="3">
      <AccordionTrigger>Woher kommen die Übersetzungen?</AccordionTrigger>
    </AccordionHeader>
    <AccordionContent>Antwort hier...</AccordionContent>
  </AccordionItem>
</BaseAccordion>
```

### 2. Multiple open at once

```html
<BaseAccordion type="multiple">
  <AccordionItem value="a">
    <AccordionHeader><AccordionTrigger>Abschnitt A</AccordionTrigger></AccordionHeader>
    <AccordionContent>...</AccordionContent>
  </AccordionItem>
  <AccordionItem value="b">
    <AccordionHeader><AccordionTrigger>Abschnitt B</AccordionTrigger></AccordionHeader>
    <AccordionContent>...</AccordionContent>
  </AccordionItem>
</BaseAccordion>
```

### 3. Controlled (v-model)

```html
<BaseAccordion type="single" v-model="openItem">
  <AccordionItem value="settings">
    <AccordionHeader><AccordionTrigger>Einstellungen</AccordionTrigger></AccordionHeader>
    <AccordionContent>...</AccordionContent>
  </AccordionItem>
</BaseAccordion>
```

```ts
const openItem = ref<string | null>(null);
```

### 4. Custom trigger icon

```html
<AccordionTrigger>
  Kategorie
  <template #icon>
    <ChevronRight width="16" height="16" />
  </template>
</AccordionTrigger>
```

### 5. Custom header layout (v-slot)

For custom header content (extra buttons, metadata) — use `BaseAccordion` `v-slot` with `AccordionContent` standalone:

```html
<BaseAccordion type="multiple" v-slot="{ isOpen, toggle }">
  <ul>
    <li
      v-for="item in items"
      :key="item.id"
      :class="{ 'is-open': isOpen(item.id) }"
    >
      <div class="my-header" @click="toggle(item.id)">
        <span>{{ item.title }}</span>
        <span>{{ item.meta }}</span>
        <button @click.stop="deleteItem(item.id)">Löschen</button>
        <button
          @click.stop="toggle(item.id)"
          :aria-expanded="isOpen(item.id)"
          :aria-controls="`content-${item.id}`"
        >
          <ChevronDown />
        </button>
      </div>
      <AccordionContent :open="isOpen(item.id)">
        {{ item.content }}
      </AccordionContent>
    </li>
  </ul>
</BaseAccordion>
```

## Props

### BaseAccordion

| Prop           | Type                                | Default    | Description                                |
| -------------- | ----------------------------------- | ---------- | ------------------------------------------ |
| `type`         | `"single" \| "multiple"`            | `"single"` | Single or multiple panels open             |
| `modelValue`   | `string \| number \| array \| null` | —          | Controlled mode                            |
| `defaultValue` | `string \| number \| array`         | —          | Initial open value (uncontrolled)          |
| `collapsible`  | `boolean`                           | `false`    | Single mode: allow closing last open panel |

### AccordionItem

| Prop       | Type               | Description                     |
| ---------- | ------------------ | ------------------------------- |
| `value`    | `string \| number` | Unique identifier for this item |
| `disabled` | `boolean`          | Disables interaction            |

### AccordionHeader

| Prop    | Type  | Default | Description                                |
| ------- | ----- | ------- | ------------------------------------------ |
| `level` | `1–6` | —       | Renders as `<h1>`–`<h6>`; omit for `<div>` |

### AccordionContent

| Prop   | Type      | Description                                   |
| ------ | --------- | --------------------------------------------- |
| `open` | `boolean` | Standalone mode: controls open state directly |

## Accessibility

- Trigger: `aria-expanded`, `aria-controls` auto-wired via `AccordionTrigger`
- Panel: `role="region"`, `aria-labelledby` auto-wired via `AccordionContent`
- IDs: generated via `useId()` — no manual ID management needed
- `AccordionHeader` + `AccordionTrigger` pattern fulfills WAI-ARIA heading+button requirement
- Keyboard: Enter/Space handled natively by `<button>`; Tab/Shift+Tab browser default

## Animation

CSS `grid-template-rows: 0fr → 1fr` on `.c-accordion__body`. Content always in DOM — better for accessibility. Respects `prefers-reduced-motion` via `butler-mx.feature("motion")`.
