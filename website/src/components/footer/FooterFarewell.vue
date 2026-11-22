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
import type { FooterWord } from "@utils/footerWords";

import BerlinerBaer from "@components/kalle/BerlinerBaer.vue";
import { useStore } from "@nanostores/vue";
import { $showAppCallout } from "@stores/footerCallout.ts";
import { useIntersectionObserver, useMediaQuery } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef } from "vue";

import FooterWordSign from "./FooterWordSign.vue";

const props = defineProps<{
  words: FooterWord[];
  /** sign: always the sign · callout: a page callout sits above, no sign · app: sign until the app callout shows */
  mode: "app" | "callout" | "sign";
}>();

const SENTENCE_SIGN =
  "Nimm dir noch een Wort mit uff’n Heimweg. Beim nächsten Mal wartet hier een anderet.";
const SENTENCE_PLAIN = "Schön, dass de da warst. Komm jut nach Hause.";

const appCallout = useStore($showAppCallout);
const showSign = computed(
  () =>
    props.mode !== "callout" &&
    props.words.length > 0 &&
    !(props.mode === "app" && appCallout.value),
);

// SPEC §5.1: Kalle 150px, below the 808px layout 120px (a prop, so it cannot follow a container query).
const wide = useMediaQuery("(min-width: 50.5rem)");
const kalleSize = computed(() => (wide.value ? 150 : 120));

// The entry animation is armed only once hydrated (no JS: everything stays visible as rendered).
const state = ref<"armed" | "in" | undefined>(undefined);
const root = useTemplateRef<HTMLElement>("root");
onMounted(() => (state.value = "armed"));
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
