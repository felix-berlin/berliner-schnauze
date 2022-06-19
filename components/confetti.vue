<template>
  <div class="c-confetti__wrapper">
    <div v-for="index in 10" :key="index" class="c-confetti__piece" />
  </div>
</template>

<script>
export default {
  name: 'ConfettiEffect'
}
</script>
