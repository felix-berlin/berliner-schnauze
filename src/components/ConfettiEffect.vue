<template>
  <div class="c-confetti__wrapper">
    <div v-for="index in pieces" :key="index" class="c-confetti__piece" />
  </div>
</template>

<script setup lang="ts">
interface ConfettiProps {
  pieces?: number;
}

const { pieces = 10 }: ConfettiProps = defineProps<ConfettiProps>();
</script>

<style lang="scss">
@use "@styles/components/confetti";
</style>
