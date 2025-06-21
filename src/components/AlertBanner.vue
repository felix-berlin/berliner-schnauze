<template>
  <Component
    :is="element"
    :class="[componentClass, componentClass + '--' + type]"
    role="alert"
  >
    <slot> Alert </slot>
  </Component>
</template>

<script setup lang="ts">
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
</script>

<style lang="scss">
@use "@styles/components/alert";
</style>
