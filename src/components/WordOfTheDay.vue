<template>
  <div
    ref="root"
    class="c-word-of-the-day c-confetti"
    data-track-content
    data-content-name="Word of the Day"
    :data-content-piece="currentWord?.word?.berlinerisch ?? ''"
    :data-content-target="
      currentWord?.word?.post_name ? routeToWord(currentWord.word.post_name) : undefined
    "
    role="link"
    tabindex="0"
    @mouseover="celebrate = true"
    @mouseout="celebrate = false"
    @focus="celebrate = true"
    @blur="celebrate = false"
  >
    <div
      v-tooltip="{
        content: 'Klick auf das Wort um mehr zu erfahren!',
        offset: 10,
        shown: celebrate,
        placement: 'bottom',
      }"
      class="c-word-of-the-day__content"
    >
      <div class="c-word-of-the-day__crown-icon">
        <Crown :width="80" :height="80" />
      </div>

      <Transition v-if="!currentWord.error" name="fade-fast" mode="out-in">
        <SingleLoader v-if="currentWord.loading" key="loading" />
        <div v-else key="word" class="c-word-of-the-day__word-wrap">
          <a
            :href="routeToWord(currentWord?.word?.post_name)"
            class="c-word-of-the-day__word c-loader-text"
          >
            {{ currentWord?.word?.berlinerisch }}
          </a>
        </div>
      </Transition>

      <div v-if="currentWord.error" class="c-word-of-the-day__word-wrap is-error">
        Ditt kann ne wahr sein, es ist ein Fehler aufgetreten.
      </div>

      <hr class="c-word-of-the-day__divider" />

      <p class="c-word-of-the-day__headline">Wort des Tages</p>
    </div>
    <div class="c-word-of-the-day__update">
      Neues Wort in: <span>{{ timeToUpdate.hours }}</span> :
      <span>{{ timeToUpdate.minutes }}</span> :
      <span>{{ timeToUpdate.seconds }}</span>
    </div>
    <Transition v-if="celebrate" name="fade">
      <ConfettiEffect />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import ConfettiEffect from "@components/ConfettiEffect.vue";
import SingleLoader from "@components/SingleLoader.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { useStore } from "@nanostores/vue";
import { $wordOfTheDay } from "@stores/wordOfTheDay.ts";
import { routeToWord } from "@utils/helpers.ts";
import { useIntervalFn, useNow } from "@vueuse/core";
import Crown from "virtual:icons/lucide/crown";
import { computed, ref } from "vue";

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

const currentWord = useStore($wordOfTheDay);
// Drives both the confetti and the hint tooltip.
const celebrate = ref(false);

const now = useNow({ scheduler: (cb) => useIntervalFn(cb, 1000) });

const pad = (num: number): string => num.toString().padStart(2, "0");

/** Hours / minutes / seconds left until local midnight. */
const timeToUpdate = computed(() => {
  const n = now.value;
  const midnight = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  const totalSeconds = Math.floor((midnight.getTime() - n.getTime()) / 1000);

  return {
    hours: pad(Math.floor(totalSeconds / 3600) % 24),
    minutes: pad(Math.floor(totalSeconds / 60) % 60),
    seconds: pad(totalSeconds % 60),
  };
});
</script>

<style lang="scss">
@use "@styles/components/word-of-the-day";
@use "@styles/components/loading-text";
</style>
