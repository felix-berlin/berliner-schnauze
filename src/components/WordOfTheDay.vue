<template>
  <div
    class="c-word-of-the-day c-confetti"
    @mouseenter="(celebrate = true), (showTooltip = true)"
    @mouseleave="(celebrate = false), (showTooltip = false)"
  >
    <div
      v-tooltip="{
        content: 'Klick auf das Wort um mehr zu erfahren!',
        distance: 10,
        shown: showTooltip,
        placement: 'bottom',
      }"
      class="c-word-of-the-day__content"
    >
      <div class="c-word-of-the-day__crown-icon">
        <Crown :size="80" />
      </div>

      <Transition name="fade-fast" mode="out-in">
        <SingleLoader v-if="currentWord.loading" key="loading" />
        <div v-else key="word" class="c-word-of-the-day__word-wrap">
          <a
            :href="`/wort/${currentWord.word.post_name}`"
            class="c-word-of-the-day__word c-loader-text"
          >
            {{ currentWord.word.berlinerisch }}
          </a>
        </div>
      </Transition>

      <hr class="c-word-of-the-day__divider" />

      <p class="c-word-of-the-day__headline">Wort des Tages</p>
    </div>
    <div class="c-word-of-the-day__update">
      Neues Wort in: <span>{{ timeToUpdate.hours }}</span> :
      <span>{{ timeToUpdate.minutes }}</span> : <span>{{ timeToUpdate.seconds }}</span>
    </div>
    <transition v-if="celebrate" name="fade">
      <ConfettiEffect />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount } from "vue";
import type { Ref } from "vue";
import Crown from "virtual:icons/lucide/crown";
import { useStore } from "@nanostores/vue";
import { wordOfTheDay, getWordOfTheDay } from "@stores/index";
import ConfettiEffect from "@components/ConfettiEffect.vue";
import SingleLoader from "@components/SingleLoader.vue";

const currentWord = useStore(wordOfTheDay);
const celebrate = ref(false);
const showTooltip = ref(false);
const countDown = ref();
const timeToUpdate: Ref<Object | String> = ref({
  hours: "00",
  minutes: "00",
  seconds: "00",
});

/**
 * Counts down the time until midnight
 *
 * @return  {void}
 */
const countDownTimer = () => {
  setTimeout(() => {
    let milliseconds = resetAtMidnight();
    milliseconds -= 1;
    countDown.value = milliseconds;
    timeToUpdate.value = convertMsToTime(milliseconds, true);

    countDownTimer();
  }, 1000);
};

/**
 * Returns the milliseconds until midnight
 *
 * @return  {number}
 */
const resetAtMidnight = (): number => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // the next day, ...
    0,
    0,
    0, // ...at 00:00:00 hours
  );

  return night.getTime() - now.getTime();
};

/**
 * Returns a string with 2 digits
 *
 * @param   {number}  num  number to convert
 *
 * @return  {string}
 */
const padTo2Digits = (num: number): string => {
  return num.toString().padStart(2, "0");
};

/**
 * Converts milliseconds to hours, minutes and seconds
 *
 * @param   {number}  milliseconds
 * @param   {boolean}  singleValues  if true, return a object with only hours, minutes and seconds
 * @see: https://bobbyhadz.com/blog/javascript-convert-milliseconds-to-hours-minutes-seconds
 *
 * @return  {[type]}                returns a string or an object with hours, minutes and seconds
 */
const convertMsToTime = (milliseconds: number, singleValues: boolean = false) => {
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds %= 60;
  minutes %= 60;
  hours %= 24;

  if (singleValues) {
    return {
      hours: padTo2Digits(hours),
      minutes: padTo2Digits(minutes),
      seconds: padTo2Digits(seconds),
    };
  }

  return `${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
};

onBeforeMount(() => {
  getWordOfTheDay();
});

onMounted(() => {
  countDownTimer();
});
</script>

<style lang="scss">
@use "@styles/components/word-of-the-day";
@use "@styles/components/loading-text";
</style>
