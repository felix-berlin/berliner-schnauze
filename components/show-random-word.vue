<template>
  <div>
    <!-- <p>{{ word.ID }}</p> -->
    <h1 v-if="wort.length">
      Nuxt Mountains
    </h1>
    <ul>
      <li v-for="(mountain, index) of mountains" :key="index">
        {{ mountain.title }}
      </li>
    </ul>
    <p>
      pending
    </p>
    <button @click="() => $fetch">
      Refresh
    </button>
    <!-- <p>{{ timeToUpdate }}</p>
    <button @click="resetAtMidnight">
      RANDOM
    </button>
    <nuxt-link :to="'words/' + randomWord()">
      RANDOM
    </nuxt-link> -->
  </div>
</template>

<script>
// import { mapGetters } from 'vuex'

export default {
  name: 'ShowRandomWord',

  data () {
    return {
      // wordOfTheDay: '',
      countDown: null,
      timeToUpdate: null,
      word: {},
      mountains: [],
      wort: {}
    }
  },
  fetchOnServer: false,
  fetchKey: 'site-sidebar',
  async fetch ({ $axios, $config }) {
    this.mountains = await fetch(
      'https://api.nuxtjs.dev/mountains'
    ).then(res => res.json())
    console.log('JA')
    this.wort = await $axios.$get(`${$config.baseApiUrl}/wp-json/berliner-schnauze/v1/word-of-the-day`)
      .then(res => res.json())

    // this.word = wordOfTheDay
    // console.log(wordOfTheDay)
    // return { wordOfTheDay }
  },

  computed: {
    // ...mapGetters(['berlinerWords'])
  },

  async created () {
    // this.countDown = this.resetAtMidnight()
    // this.countDownTimer()
    this.word = await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/word-of-the-day`)
      .then(res => res.json())
  },

  // async mounted () {
  //   // this.setWord()
  //   this.mountains = await fetch(
  //     'https://api.nuxtjs.dev/mountains'
  //   ).then(res => res.json())

  //   this.word = await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/word-of-the-day`)
  //     .then(res => res.json())
  // },

  methods: {

    // randomWord () {
    //   return this.$randomElement(this.berlinerWords).berlinerisch
    // },

    // countDownTimer () {
    //   if (this.countDown > 0) {
    //     setTimeout(() => {
    //       let milliseconds = this.resetAtMidnight()
    //       milliseconds -= 1

    //       this.timeToUpdate = this.convertMsToTime(milliseconds)

    //       this.countDown -= 1
    //       this.countDownTimer()
    //     }, 1000)
    //   }
    // },

    // resetAtMidnight () {
    //   const now = new Date()
    //   const night = new Date(
    //     now.getFullYear(),
    //     now.getMonth(),
    //     now.getDate() + 1, // the next day, ...
    //     0, 0, 0 // ...at 00:00:00 hours
    //   )

    //   // console.log(night.getTime() - now.getTime())
    //   return night.getTime() - now.getTime()
    // },

    // setWord () {
    //   if (!this.$store.state.wordOfTheDay) {
    //     // console.log('no word')
    //     this.$store.commit('updateWordOfTheDay', this.randomWord())
    //   }

    //   setTimeout(function () {
    //     this.wordOfTheDay = this.randomWord() //      <-- This is the function being called at midnight.
    //     this.resetAtMidnight() //      Then, reset again next midnight.
    //   }, this.resetAtMidnight())
    // },

    // padTo2Digits (num) {
    //   return num.toString().padStart(2, '0')
    // },

    // convertMsToTime (milliseconds) {
    //   let seconds = Math.floor(milliseconds / 1000)
    //   const minutes = Math.floor(seconds / 60)
    //   let hours = Math.floor(minutes / 60)

    //   seconds = seconds % 60
    //   // minutes = minutes % 60

    //   // 👇️ If you don't want to roll hours over, e.g. 24 to 00
    //   // 👇️ comment (or remove) the line below
    //   // commenting next line gets you `24:00:00` instead of `00:00:00`
    //   // or `36:15:31` instead of `12:15:31`, etc.
    //   hours = hours % 24

    //   return `${this.padTo2Digits(hours)}:${this.padTo2Digits(minutes)}:${this.padTo2Digits(seconds)}`
    // }
  }
}
</script>
