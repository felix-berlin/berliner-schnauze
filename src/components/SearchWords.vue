<template>
  <div class="c-word-search">
    <input
      v-model="search"
      type="search"
      aria-label="Suche nach einem Berliner Word"
      @input="updateSearch()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
// import { words, searchWord } from "@stores/index";
// import { useStore } from "@nanostores/vue";

const search = ref("");

const emit = defineEmits(["update:search"]);

const updateSearch = () => {
  emit("update:search", search);
};
</script>

<style scoped></style>
