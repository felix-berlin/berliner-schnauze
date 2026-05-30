<template>
  <div class="c-accordion">
    <slot :is-open="isOpen" :toggle="toggle" />
  </div>
</template>

<script setup lang="ts">
import { provide, ref, watch } from "vue";

export interface AccordionContext {
  type: "single" | "multiple";
  isOpen: (id: string | number) => boolean;
  toggle: (id: string | number) => void;
}

const props = withDefaults(
  defineProps<{
    type?: "single" | "multiple";
    modelValue?: string | number | (string | number)[] | null;
    defaultValue?: string | number | (string | number)[];
    collapsible?: boolean;
  }>(),
  { collapsible: false, type: "single" },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number | (string | number)[] | null];
}>();

function toSet(
  val: string | number | (string | number)[] | null | undefined,
): Set<string | number> {
  if (val == null) return new Set();
  return new Set(Array.isArray(val) ? val : [val]);
}

const openIds = ref<Set<string | number>>(toSet(props.modelValue ?? props.defaultValue));

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) openIds.value = toSet(val);
  },
);

function isOpen(id: string | number): boolean {
  return openIds.value.has(id);
}

function toggle(id: string | number): void {
  const set = new Set(openIds.value);
  if (set.has(id)) {
    if (props.type === "single" && !props.collapsible) return;
    set.delete(id);
  } else {
    if (props.type === "single") set.clear();
    set.add(id);
  }
  openIds.value = set;
  const next = props.type === "multiple" ? [...set] : set.size > 0 ? [...set][0] : null;
  emit("update:modelValue", next);
}

provide<AccordionContext>("accordion", { isOpen, toggle, type: props.type });
</script>

<style lang="scss">
@use "@styles/components/accordion";
</style>
