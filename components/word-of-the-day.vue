<template>
  <div class="c-word-of-the-day">
    <div class="c-word-of-the-day__icon">
      <Crown :size="44" />
    </div>
    <NuxtLink :to="'/words/' + wordOfTheDay.ID" class="c-word-of-the-day__word">
      {{ wordOfTheDay.berlinerisch }}
    </NuxtLink>
    <p class="c-word-of-the-day__headline">
      Wort des Tages
    </p>
    <div class="c-word-of-the-day__update">
      Neues Wort in: {{ timeToUpdate }}
    </div>
  </div>
</template>

<script>
import { Crown } from 'lucide-vue'

export default {
  name: 'WordOfTheDay',
  fetchKey: 'word-of-the-day',

  components: {
    Crown
  },

  data () {
    return {
      wordOfTheDay: {},
      countDown: null,
      timeToUpdate: null
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
    this.countDown = this.resetAtMidnight()
    this.countDownTimer()
  },

  methods: {

    countDownTimer () {
      if (this.countDown > 0) {
        setTimeout(() => {
          let milliseconds = this.resetAtMidnight()
          milliseconds -= 1

          this.timeToUpdate = this.convertMsToTime(milliseconds)

          this.countDown -= 1
          this.countDownTimer()
        }, 1000)
      }
    },

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

    // @link: https://bobbyhadz.com/blog/javascript-convert-milliseconds-to-hours-minutes-seconds
    padTo2Digits (num) {
      return num.toString().padStart(2, '0')
    },

    convertMsToTime (milliseconds) {
      let seconds = Math.floor(milliseconds / 1000)
      let minutes = Math.floor(seconds / 60)
      let hours = Math.floor(minutes / 60)

      seconds = seconds % 60
      minutes = minutes % 60

      // 👇️ If you don't want to roll hours over, e.g. 24 to 00
      // 👇️ comment (or remove) the line below
      // commenting next line gets you `24:00:00` instead of `00:00:00`
      // or `36:15:31` instead of `12:15:31`, etc.
      hours = hours % 24

      return `${this.padTo2Digits(hours)}:${this.padTo2Digits(minutes)}:${this.padTo2Digits(seconds)}`
    }
  }
}
</script>
