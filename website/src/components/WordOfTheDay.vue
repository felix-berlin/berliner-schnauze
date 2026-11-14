<template>
  <div
    ref="root"
    class="c-word-of-the-day"
    data-track-content
    data-content-name="Word of the Day"
    :data-content-piece="currentWord?.word?.berlinerisch ?? ''"
    :data-content-target="currentWord?.word?.slug ? routeToWord(currentWord.word.slug) : undefined"
    @mouseover="celebrate = true"
    @mouseout="celebrate = false"
    @focusin="celebrate = true"
    @focusout="celebrate = false"
  >
    <div
      v-tooltip="{
        content: 'Klick auf das Wort um mehr zu erfahren!',
        offset: 10,
        shown: celebrate,
        placement: 'bottom',
      }"
      class="content"
    >
      <div class="crown-icon">
        <Crown :width="80" :height="80" />
      </div>

      <Transition v-if="!currentWord.error" name="fade-fast" mode="out-in">
        <SingleLoader v-if="currentWord.loading || !currentWord.word?.slug" key="loading" />
        <div v-else key="word" class="word-wrap">
          <a :href="routeToWord(currentWord?.word?.slug)" class="word">
            {{ currentWord?.word?.berlinerisch }}
          </a>
        </div>
      </Transition>

      <div v-if="currentWord.error" class="word-wrap" data-state="error">
        Ditt kann ne wahr sein, es ist ein Fehler aufgetreten.
      </div>

      <hr class="divider" />

      <p class="headline">Wort des Tages</p>
    </div>
    <div class="update">
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
import { $wordOfTheDay, expiresAt, getWordOfTheDay } from "@stores/wordOfTheDay.ts";
import { routeToWord } from "@utils/helpers.ts";
import { useIntervalFn, useNow } from "@vueuse/core";
import Crown from "virtual:icons/lucide/crown";
import { computed, ref, watch } from "vue";

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

const currentWord = useStore($wordOfTheDay);
// Drives both the confetti and the hint tooltip.
const celebrate = ref(false);

const now = useNow({ scheduler: (cb) => useIntervalFn(cb, 1000) });

const pad = (num: number): string => num.toString().padStart(2, "0");

/** Hours / minutes / seconds left until the server switches the word (Berlin midnight). */
const secondsLeft = computed(() =>
  Math.max(0, Math.floor((expiresAt(currentWord.value) - now.value.getTime()) / 1000)),
);

const timeToUpdate = computed(() => ({
  hours: pad(Math.floor(secondsLeft.value / 3600)),
  minutes: pad(Math.floor(secondsLeft.value / 60) % 60),
  seconds: pad(secondsLeft.value % 60),
}));

// The countdown ran out on an open page: fetch the new word.
watch(secondsLeft, (left, before) => {
  if (left === 0 && before > 0) void getWordOfTheDay();
});
</script>

<style lang="scss">
@use "@styles/components/word-of-the-day";
</style>
