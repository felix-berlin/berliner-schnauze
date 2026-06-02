<template>
  <component
    :is="resolvedTag"
    :href="resolvedTag === 'a' ? href : undefined"
    :type="resolvedTag === 'button' ? 'button' : undefined"
    class="c-app-settings__nav-card"
    :class="{ 'c-app-settings__nav-card--button': resolvedTag === 'button' }"
  >
    <div class="c-app-settings__nav-card-content">
      <component :is="icon" class="c-app-settings__nav-card-icon" />
      <div class="c-app-settings__nav-card-text">
        <span class="c-app-settings__nav-card-title">{{ title }}</span>
        <span class="c-app-settings__nav-card-desc">{{ description }}</span>
      </div>
    </div>
    <component :is="ChevronRightIcon" class="c-app-settings__nav-card-arrow" />
  </component>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from "vue";

const ChevronRightIcon = defineAsyncComponent(
  () => import("virtual:icons/lucide/chevron-right"),
);

const props = withDefaults(
  defineProps<{
    icon: Component;
    title: string;
    description: string;
    href?: string;
    tag?: "a" | "button";
  }>(),
  {
    href: undefined,
    tag: undefined,
  },
);

const resolvedTag = computed<"a" | "button">(() => {
  if (props.tag) return props.tag;
  return props.href ? "a" : "button";
});
</script>
