<template>
  <div v-if="online" class="c-search-load-state" role="alert">
    <p>Ditt hat nich jeklappt. Die Suche is jerade nich erreichbar. Versuch’s gleich nochmal.</p>
    <button type="button" class="retry" @click="emit('retry')">Nochmal versuchen</button>
  </div>
  <p v-else class="c-search-load-state" data-variant="offline" role="status">
    Du bist offline. Ick such nur in den Wörtern, die schon uff deinem Gerät sind.
  </p>
</template>

<script setup lang="ts">
/** The index could not be loaded: online an error with retry (SPEC §10), offline a hint. */
defineProps<{ online: boolean }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<style lang="scss">
@use "@styles/components/search-load-state";
</style>
