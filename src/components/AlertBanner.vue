<template>
  <Component :is="element" :class="[componentClass, componentClass + '--' + type]" role="alert">
    <slot> Alert </slot>
  </Component>
</template>

<script setup lang="ts">
interface AlertBannerProps {
  type?: "success" | "danger" | "warning" | "info";
  element?: string;
  componentClass?: string;
}

const {
  type = "warning",
  element = "div",
  componentClass = "c-alert",
} = defineProps<AlertBannerProps>();
</script>

<style lang="scss">
@use "@styles/components/alert";
</style>
