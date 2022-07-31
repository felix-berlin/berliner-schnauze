<template>
  <div class="c-confetti__wrapper">
    <div v-for="index in pieces" :key="index" class="c-confetti__piece" />
  </div>
</template>

<script>
export default {
  name: 'ConfettiEffect',

  props: {
    pieces: {
      type: Number,
      default: 10
    }
  }
}
</script>
