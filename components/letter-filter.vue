
<template>
  <nav class="c-letter-nav">
    <ul class="c-letter-nav__list u-list-reset">
      <li>
        <button class="c-button" type="button" @click="filterByLetter(null)">
          Alle
        </button>
      </li>
      <li
        v-for="(letter, index) in navItems"
        :key="index"
        class="c-letter-nav__list-item"
        :class="{ 'is-current' : (letter === $store.state.wordFilteredByLetter) }"
      >
        <button
          :aria-label="'Buchstabe: ' + letter"
          type="button"
          class="c-letter-nav__link c-button"
          :title="'Buchstabe: ' + letter"
          @click="filterByLetter(letter)"
        >
          {{ letter }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script>
export default {
  name: 'LetterFilter',

  data () {
    return {
      navItems: this.$store.state.groupNames
    }
  },

  mounted () {
  },

  methods: {
    filterByLetter (letter) {
      this.$store.commit('updateWordFilteredLetter', letter)
    }
  }
}
</script>
