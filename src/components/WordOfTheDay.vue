<template>
  <div
    class="c-word-of-the-day c-confetti"
    role="link"
    tabindex="0"
    @mouseover="toggleCelebration(true)"
    @mouseout="toggleCelebration(false)"
    @focus="toggleCelebration(true)"
    @blur="toggleCelebration(false)"
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
      <span>{{ timeToUpdate.minutes }}</span> : <span>{{ timeToUpdate.seconds }}</span>
    </div>
    <Transition v-if="celebrate" name="fade">
      <ConfettiEffect />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { Ref } from "vue";
import Crown from "virtual:icons/lucide/crown";
import { useStore } from "@nanostores/vue";
import { $wordOfTheDay } from "@stores/index";
import ConfettiEffect from "@components/ConfettiEffect.vue";
import SingleLoader from "@components/SingleLoader.vue";
import { routeToWord } from "@utils/helpers";

const currentWord = useStore($wordOfTheDay);
const celebrate = ref(false);
const showTooltip = ref(false);
const countDown = ref();

interface TimeToUpdate {
  hours: string;
  minutes: string;
  seconds: string;
}

const timeToUpdate: Ref<TimeToUpdate> = ref({
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
    milliseconds--;
    countDown.value = milliseconds;
    timeToUpdate.value = convertMsToTime(milliseconds);

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
 * @see: https://bobbyhadz.com/blog/javascript-convert-milliseconds-to-hours-minutes-seconds
 *
 * @return  {[type]}                returns a string or an object with hours, minutes and seconds
 */
const convertMsToTime = (
  milliseconds: number,
): { hours: string; minutes: string; seconds: string } => {
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds %= 60;
  minutes %= 60;
  hours %= 24;

  return {
    hours: padTo2Digits(hours),
    minutes: padTo2Digits(minutes),
    seconds: padTo2Digits(seconds),
  };
};

/**
 * Toggles the celebration
 *
 * @param   {boolean}  toggleValue
 *
 * @return  {void}
 */
const toggleCelebration = (toggleValue: boolean) => {
  celebrate.value = toggleValue;
  showTooltip.value = toggleValue;
};

onMounted(() => {
  countDownTimer();
});
</script>

<style lang="scss">
@use "@styles/components/word-of-the-day";
@use "@styles/components/loading-text";
</style>
