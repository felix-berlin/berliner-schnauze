<template>
  <section
    v-if="current"
    ref="root"
    :data-state="state"
    :data-swapped="swapped || undefined"
    aria-live="polite"
    class="c-footer-word-sign"
  >
    <div class="inner">
      <div :key="current.slug" class="body">
        <p class="label">Wort für unterwegs</p>
        <p class="head">
          <a class="lemma" :href="`/wort/${current.slug}`">{{ current.lemma }}</a>
          <span v-if="current.kind" class="kind">{{ current.kind }}</span>
        </p>
        <p class="meaning">{{ current.meaning }}</p>
        <p v-if="current.example" class="example">„{{ current.example }}“</p>
      </div>
      <div v-if="words.length > 1" class="actions">
        <button :hidden="!ready" type="button" @click="swap">
          <RotateCcwIcon aria-hidden="true" height="16" width="16" />
          Noch eens
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { trackEvent } from "@utils/analytics";
import { createWordCycle, type FooterWord } from "@utils/footerWords";
import { useIntersectionObserver } from "@vueuse/core";
import { defineAsyncComponent, onMounted, ref, shallowRef, useTemplateRef } from "vue";

const props = defineProps<{ words: FooterWord[] }>();

const RotateCcwIcon = defineAsyncComponent(() => import("virtual:icons/lucide/rotate-ccw"));

const cycle = createWordCycle(props.words);
const current = shallowRef<FooterWord | null>(cycle.current);
// The server renders the sign visible and without the button; only a hydrated page arms the entry
// animation and shows "Noch eens" (no JS: the sign stays as rendered).
const ready = ref(false);
const swapped = ref(false);
const state = ref<"armed" | "in" | undefined>(undefined);

const root = useTemplateRef<HTMLElement>("root");
onMounted(() => {
  ready.value = true;
  state.value = "armed";
});
const { stop } = useIntersectionObserver(root, ([entry]) => {
  if (entry?.isIntersecting && state.value === "armed") {
    state.value = "in";
    stop();
  }
});

const swap = () => {
  current.value = cycle.next();
  swapped.value = true;
  trackEvent("Footer", "click", "Noch eens");
};
</script>

<style lang="scss">
@use "@styles/components/footer-word-sign";
</style>
