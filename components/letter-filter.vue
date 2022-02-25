
<template>
  <nav class="c-letter-filter" :class="modifier">
    <ul class="c-letter-filter__list u-list-reset">
      <li class="c-letter-filter__list-item" :class="{ 'is-current' : ($store.state.wordFilteredByLetter === null) }">
        <button class="c-letter-filter__button c-button" type="button" @click="filterByLetter(null)">
          Alle
        </button>
      </li>
      <li
        v-for="(letter, index) in $store.state.groupNames"
        :key="index"
        class="c-letter-filter__list-item"
        :class="{ 'is-current' : (letter === $store.state.wordFilteredByLetter) }"
      >
        <button
          :aria-label="'Buchstabe: ' + letter"
          type="button"
          class="c-letter-filter__button c-button"
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

  props: {
    modifier: {
      type: String,
      default: ''
    }
  },

  data () {
    return {
      class: 'c-letter-filter'
    }
  },

  methods: {
    filterByLetter (letter) {
      this.$store.commit('updateWordFilteredLetter', letter)
    }
  }
}
</script>
