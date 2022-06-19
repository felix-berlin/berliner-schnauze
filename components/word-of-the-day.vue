<template>
  <div class="c-word-of-the-day">
    <div class="c-word-of-the-day__content">
      <div class="c-word-of-the-day__icon">
        <Crown :size="80" />
      </div>

      <transition name="fade-fast" mode="out-in">
        <SingleLoader v-if="$fetchState.pending" key="loading" />
        <div v-else key="word" class="c-word-of-the-day__word-wrap">
          <NuxtLink :to="$routeToWord(wordOfTheDay.post_name)" class="c-word-of-the-day__word c-loader-text">
            {{ wordOfTheDay.berlinerisch }}
          </NuxtLink>
          <span v-tooltip="{ content: 'Klick auf das Wort um mehr zu erfahren', distance: 10, placement: 'right'}">
            <Info :size="12" />
          </span>
        </div>
      </transition>

      <hr class="c-word-of-the-day__divider">

      <p class="c-word-of-the-day__headline">
        Wort des Tages
      </p>
    </div>
    <div class="c-word-of-the-day__update">
      Neues Wort in: <span>{{ timeToUpdate.hours }}</span> : <span>{{ timeToUpdate.minutes }}</span> : <span>{{ timeToUpdate.seconds }}</span>
    </div>
  </div>
</template>

<script>
import { Crown, Info } from 'lucide-vue'
import SingleLoader from './single-loader.vue'

export default {
  name: 'WordOfTheDay',
  fetchOnServer: false,
  fetchKey: 'word-of-the-day',

  components: {
    Crown,
    SingleLoader,
    Info
  },

  data () {
    return {
      wordOfTheDay: {},
      countDown: null,
      timeToUpdate: {
        hours: '00',
        minutes: '00',
        seconds: '00'
      }
    }
  },

  async fetch () {
    this.wordOfTheDay = await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/word-of-the-day`)
      .then(res => res.json())
      .catch((err) => { this.$sentry.captureException(err) })
  },

  activated () {
    if (this.$fetchState.timestamp <= this.countDown) {
      this.$fetch()
    }
  },

  created () {
    this.countDownTimer()
  },

  methods: {

    /**
     * Create the countdown timer
     *
     * @return  {Void}
     */
    countDownTimer () {
      const timer = setInterval(() => {
        let milliseconds = this.resetAtMidnight()
        milliseconds -= 1
        this.countDown = milliseconds
        if (milliseconds <= 0) {
          clearInterval(timer)
        }

        this.timeToUpdate = this.convertMsToTime(milliseconds, true)
      }, 1000)
    },

    /**
    * Returns the milliseconds until midnight
    */
    resetAtMidnight () {
      const now = new Date()
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // the next day, ...
        0, 0, 0 // ...at 00:00:00 hours
      )

      return night.getTime() - now.getTime()
    },

    /**
     * Returns only two digits
     *
     * @param   {Number}  num  number to convert
     *
     * @return  {String}
     */
    padTo2Digits (num) {
      return num.toString().padStart(2, '0')
    },

    /**
     * Converts milliseconds to hours, minutes and seconds
     *
     * @param   {Number}  milliseconds
     * @param   {Boolean} singleValues  if true, return a object with only hours, minutes and seconds
     * @see: https://bobbyhadz.com/blog/javascript-convert-milliseconds-to-hours-minutes-seconds
     *
     * @return  {String|Object} returns a string or an object with hours, minutes and seconds
     */
    convertMsToTime (milliseconds, singleValues = false) {
      let seconds = Math.floor(milliseconds / 1000)
      let minutes = Math.floor(seconds / 60)
      let hours = Math.floor(minutes / 60)

      seconds = seconds % 60
      minutes = minutes % 60
      hours = hours % 24

      if (singleValues) {
        return {
          hours: this.padTo2Digits(hours),
          minutes: this.padTo2Digits(minutes),
          seconds: this.padTo2Digits(seconds)
        }
      }

      return `${this.padTo2Digits(hours)}:${this.padTo2Digits(minutes)}:${this.padTo2Digits(seconds)}`
    }
  }
}
</script>
