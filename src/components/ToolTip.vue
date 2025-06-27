<template>
  <VTooltip client:only="vue" class="c-tooltip">
    <slot />

    <template #popper>
      <slot name="content" />
    </template>
  </VTooltip>
</template>

<script setup lang="ts"></script>

<style scoped></style>
