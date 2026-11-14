<template>
  <div class="c-confetti">
    <div v-for="index in pieces" :key="index" class="piece" />
  </div>
</template>

<script setup lang="ts">
interface ConfettiProps {
  pieces?: number;
}

const { pieces = 10 } = defineProps<ConfettiProps>();
</script>

<style lang="scss">
@use "@styles/components/confetti";
</style>
