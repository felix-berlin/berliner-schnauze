<template>
  <div
    ref="root"
    :data-state="state"
    :data-variant="showSign ? 'sign' : 'plain'"
    class="c-footer-farewell"
  >
    <div class="text">
      <p aria-hidden="true" class="bye">Auf Wiedersehen</p>
      <p class="title">Tschüssi, wa!</p>
      <p class="sentence">{{ showSign ? SENTENCE_SIGN : SENTENCE_PLAIN }}</p>
    </div>
    <div class="kalle">
      <BerlinerBaer :size="kalleSize" mood="wave" theme="dark" />
    </div>
    <div v-if="showSign" class="sign">
      <FooterWordSign :words="words" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FooterMode } from "@utils/footerMode";
import type { FooterWord } from "@utils/footerWords";

import BerlinerBaer from "@components/kalle/BerlinerBaer.vue";
import { useStore } from "@nanostores/vue";
import { $showAppCallout } from "@stores/footerCallout.ts";
import { useIntersectionObserver, useMediaQuery } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef } from "vue";

import FooterWordSign from "./FooterWordSign.vue";

const props = defineProps<{
  words: FooterWord[];
  mode: FooterMode;
}>();

const SENTENCE_SIGN =
  "Nimm dir noch een Wort mit uff’n Heimweg. Beim nächsten Mal wartet hier een anderet.";
const SENTENCE_PLAIN = "Schön, dass de da warst. Komm jut nach Hause.";

const appCallout = useStore($showAppCallout);
const mounted = ref(false);
// The install store is already set when this island hydrates (the browser event fires early), so until mounted it
// is ignored: the first client render must match the server's, or the plain variant sticks to the sign layout.
const showSign = computed(
  () =>
    props.mode !== "callout" &&
    props.words.length > 0 &&
    !(props.mode === "app" && mounted.value && appCallout.value),
);

// SPEC §5.1: Kalle is 150px, 120px below the 808px layout. The size is a prop, so it follows the viewport
// (50.5rem) while the CSS follows the container at the same breakpoint. The server (and the first client render,
// for a clean hydration) uses the desktop size.
const wide = useMediaQuery("(min-width: 50.5rem)");
const kalleSize = computed(() => (!mounted.value || wide.value ? 150 : 120));

// The entry animation is armed only once hydrated (no JS: everything stays visible as rendered).
const state = ref<"armed" | "in" | undefined>(undefined);
const root = useTemplateRef<HTMLElement>("root");
onMounted(() => {
  mounted.value = true;
  state.value = "armed";
});
const { stop } = useIntersectionObserver(root, ([entry]) => {
  if (entry?.isIntersecting && state.value === "armed") {
    state.value = "in";
    stop();
  }
});
</script>

<style lang="scss">
@use "@styles/components/footer-farewell";
</style>
