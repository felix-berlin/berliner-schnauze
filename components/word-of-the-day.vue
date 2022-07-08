<template>
  <div
    class="c-word-of-the-day c-confetti"
    @mouseenter="celebrate = true, showTooltip = true"
    @mouseleave="celebrate = false, showTooltip = false"
  >
    <div
      v-tooltip="{
        content: 'Klick auf das Wort um mehr zu erfahren!',
        distance: 10,
        shown: showTooltip,
        placement: 'bottom'
      }"
      class="c-word-of-the-day__content"
    >
      <div class="c-word-of-the-day__crown-icon">
        <Crown :size="80" />
      </div>

      <transition name="fade-fast" mode="out-in">
        <SingleLoader v-if="$store.state.loadingWordOfTheDay" key="loading" />
        <div v-else key="word" class="c-word-of-the-day__word-wrap">
          <NuxtLink :to="$routeToWord($store.state.wordOfTheDay.post_name)" class="c-word-of-the-day__word c-loader-text">
            {{ $store.state.wordOfTheDay.berlinerisch }}
          </NuxtLink>
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
    <transition v-if="celebrate" name="fade">
      <Confetti />
    </transition>
  </div>
</template>

<script>
import { Crown } from 'lucide-vue'
import SingleLoader from './single-loader.vue'

export default {
  name: 'WordOfTheDay',
  // fetchOnServer: false,
  // fetchKey: 'word-of-the-day',

  components: {
    Crown,
    SingleLoader
  },

  data () {
    return {
      wordOfTheDay: {},
      countDown: null,
      timeToUpdate: {
        hours: '00',
        minutes: '00',
        seconds: '00'
      },
      celebrate: false,
      showTooltip: false
    }
  },

  // async fetch () {
  //   await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/word-of-the-day`)
  //     .then(res => res.json())
  //     .then((data) => {
  //       this.wordOfTheDay = data
  //       this.$store.commit('updateWordOfTheDay', data)
  //     })
  //     .catch((err) => { this.$sentry.captureException(err) })
  // },

  // activated () {
  //   if (this.$fetchState.timestamp <= this.countDown) {
  //     this.$fetch()
  //   }
  // },

  created () {
    this.$store.dispatch('loadWordOfTheDay')
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
