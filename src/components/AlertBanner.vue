<template>
  <Component
    :is="element"
    ref="root"
    :class="[componentClass, componentClass + '--' + type]"
    data-track-content
    data-content-name="Alert Banner"
    data-content-piece="Alert"
    data-content-target="#"
    role="alert"
  >
    <slot> Alert </slot>
  </Component>
</template>

<script setup lang="ts">
import { useContentTracking } from "@composables/useContentTracking";
import { ref } from "vue";

interface AlertBannerProps {
  componentClass?: string;
  element?: string;
  type?: "danger" | "info" | "success" | "warning";
}

const {
  componentClass = "c-alert",
  element = "div",
  type = "warning",
} = defineProps<AlertBannerProps>();

const root = ref<Element | null>(null);
useContentTracking(root);
</script>

<style lang="scss">
@use "@styles/components/alert";
</style>
