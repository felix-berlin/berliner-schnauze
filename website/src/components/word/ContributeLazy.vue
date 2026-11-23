<template>
  <ContributeForm v-if="loaded" :prompt="prompt" :type="type" :word="word" />
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { openForm } from "@stores/contribute.ts";
import { reportError } from "@utils/reportError.ts";
import { defineAsyncComponent, ref, watch } from "vue";

/**
 * Island shell of `ContributeForm`: renders nothing and loads the form chunk on the first open (a trigger click
 * sets the store, `contributeTriggers.ts`). Once loaded it stays mounted, so the draft survives a close like before.
 */
const props = defineProps<{
  prompt?: string;
  type: "error" | "example" | "fact" | "related" | "story";
  word: string;
}>();

const ContributeForm = defineAsyncComponent({
  loader: () => import("@components/word/ContributeForm.vue"),
  onError: (error, _retry, fail) => {
    reportError(error);
    fail();
  },
});

const $open = useStore(openForm);
const loaded = ref(false);
watch(
  () => $open.value === props.type,
  (open) => {
    if (open) loaded.value = true;
  },
  { immediate: true },
);
</script>
