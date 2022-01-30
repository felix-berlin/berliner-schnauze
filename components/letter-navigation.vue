
<template>
  <nav class="c-letter-nav">
    <ul class="c-letter-nav__list">
      <li v-for="(item, index) in navItems" :key="index" class="c-letter-nav__list-item" :class="{ 'is-current' : (item === dictionaryPosition) }">
        <button type="button" class="c-letter-nav__link" :title="'Buchstabe: ' + item" @click="linkToFirstLetter(item)">
          {{ item }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'LetterNavigation',

  data () {
    return {
      navItems: this.$store.state.groupNames,
      current: this.dictionaryPosition,
      ab: ''
    }
  },

  computed: mapGetters(['dictionaryPosition']),

  mounted () {
  },

  methods: {
    linkToFirstLetter (letter) {
      console.log(letter)
      console.log('[data-group="' + letter + '"]:first-of-type')
      // const s = `[data-group="${letter}"]:first-of-type`
      const t = '[data-group="A"]:first-of-type'
      const firstLetter = document.querySelector(t)
      console.log(firstLetter)
      const offset = firstLetter.getBoundingClientRect().top + window.pageYOffset + -200
      console.log(offset)
      // window.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }
}
</script>
