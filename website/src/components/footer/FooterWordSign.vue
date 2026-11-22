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
          <a
            class="lemma"
            :data-long="current.lemma.length > LONG_LEMMA || undefined"
            :href="`/wort/${current.slug}`"
            >{{ current.lemma }}</a
          >
          <span v-if="current.kind" class="kind">{{ current.kind }}</span>
        </p>
        <p class="meaning">{{ current.meaning }}</p>
        <p v-if="current.example" class="example">„{{ current.example }}“</p>
      </div>
      <div v-if="words.length > 1" class="actions">
        <button :hidden="!state" type="button" @click="swap">
          <RotateCcwIcon aria-hidden="true" height="16" width="16" />
          Noch eens
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRevealOnView } from "@composables/useRevealOnView";
import { trackEvent } from "@utils/analytics";
import { createWordCycle, type FooterWord } from "@utils/footerWords";
import { defineAsyncComponent, ref, shallowRef, useTemplateRef } from "vue";

// Lemmas longer than this get the smaller fluid size (data-long, see _footer-word-sign.scss) so they stay short.
const LONG_LEMMA = 14;

const props = defineProps<{ words: FooterWord[] }>();

const RotateCcwIcon = defineAsyncComponent(() => import("virtual:icons/lucide/rotate-ccw"));

const cycle = createWordCycle(props.words);
const current = shallowRef<FooterWord | null>(cycle.current);
// The server renders the sign visible and without the button; only a hydrated page arms the entry
// animation and shows "Noch eens" (no JS: the sign stays as rendered).
const swapped = ref(false);
const root = useTemplateRef<HTMLElement>("root");
const state = useRevealOnView(root);

const swap = () => {
  current.value = cycle.next();
  swapped.value = true;
  trackEvent("Footer", "click", "Noch eens");
};
</script>

<style lang="scss">
@use "@styles/components/footer-word-sign";
</style>
