<template>
  <NuxtLink :to="$routeToWord($randomElement($store.state.words).post_name)" class="c-random-word-button">
    <Dices /> <span>zufälliges Wort</span>
  </NuxtLink>
</template>

<script>
import { Dices } from 'lucide-vue'

export default {
  name: 'RandomWordButton',

  components: {
    Dices
  }
}
</script>
