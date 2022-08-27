<template>
  <div class="c-content o-error-page">
    <h1 v-if="error.statusCode === 404" class="o-error-page__headline">
      So war ditt nicht jedacht, die Seite is wech.
    </h1>
    <h1 v-else class="o-error-page__headline">
      Ditt is ja affich, sowatt passiert sonst nie.
    </h1>
    <span class="o-error-page__icon"><ServerCrash :size="100" /></span>
    <h2>Aktenzeichen: {{ error.statusCode }}</h2>

    <NuxtLink :to="'/'" class="c-button c-button--back u-button-reset">
      <ArrowLeft /> zum Wörterbuch
    </NuxtLink>
  </div>
</template>

<script>
import { ServerCrash, ArrowLeft } from 'lucide-vue'

export default {
  name: 'ErrorPage',

  components: {
    ServerCrash,
    ArrowLeft
  },

  props: {
    error: {
      type: Object,
      required: true
    }
  }
}
</script>

<style lang="scss">
  @use '@styles/objects/error-page';
</style>
