<template>
  <div class="c-search-field">
    <div class="inner">
      <IconSearch class="lens" aria-hidden="true" />
      <label for="search-q" class="u-sr-only">Wort oder Bedeutung suchen</label>
      <input
        id="search-q"
        ref="input"
        v-model="model"
        type="search"
        name="q"
        role="combobox"
        aria-controls="treffer"
        aria-autocomplete="list"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-activedescendant="activeId"
        :placeholder="placeholder"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="search"
      />
      <button v-if="model" type="button" class="clear" aria-label="Suche leeren" @click="clear">
        <IconX aria-hidden="true" />
      </button>
      <kbd v-else class="slash" aria-hidden="true">/</kbd>
      <!-- Task 11: the „Nach Bedeutung“ button sits here, only with the Chrome AI. -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, useMounted } from "@vueuse/core";
import { computed, defineAsyncComponent, useTemplateRef } from "vue";

defineProps<{ activeId?: string; expanded: boolean }>();
const model = defineModel<string>({ required: true });

const IconSearch = defineAsyncComponent(() => import("virtual:icons/lucide/search"));
const IconX = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

const input = useTemplateRef("input");

// SPEC §5 placeholders; the server renders the short one, the long one only after hydration (no mismatch).
const mounted = useMounted();
const wide = useMediaQuery("(min-width: 808px)");
const placeholder = computed(() =>
  mounted.value && wide.value
    ? "Such ’n Wort oder wat et bedeutet, z. B. Schrippe oder Brötchen"
    : "Wort oder Bedeutung",
);

const focus = () => input.value?.focus();
const clear = () => {
  model.value = "";
  focus();
};

defineExpose({ focus });
</script>

<style lang="scss">
@use "@styles/components/search-field";
</style>
