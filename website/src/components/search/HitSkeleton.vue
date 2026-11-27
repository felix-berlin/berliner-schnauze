<template>
  <div
    class="c-hit-skeleton"
    role="progressbar"
    aria-busy="true"
    aria-label="Treffer werden jeladen"
  >
    <div v-for="n in 5" :key="n" class="row"><i /><i /><i /></div>
  </div>
</template>

<style lang="scss">
@use "@styles/components/hit-skeleton";
</style>
