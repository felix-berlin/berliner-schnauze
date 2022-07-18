
<template>
  <nav class="c-letter-filter">
    <ul class="c-letter-filter__list u-list-reset">
      <li class="c-letter-filter__list-item" :class="{ 'is-current' : ($store.state.wordFilteredByLetter === null) }">
        <button class="c-letter-filter__button c-letter-filter__button--all c-button" type="button" @click="$store.dispatch('filterByLetter', null)">
          Alle
        </button>
      </li>
      <li
        v-for="(letter, index) in availableLetterGroups"
        :key="index"
        class="c-letter-filter__list-item"
        :class="{ 'is-current' : (letter === $store.state.wordFilteredByLetter) }"
      >
        <button
          :aria-label="'Filter nach Buchstabe ' + letter"
          type="button"
          class="c-letter-filter__button c-button"
          :title="'Filter nach Buchstabe ' + letter"
          @click="updateLetterFilter(letter)"
        >
          {{ letter }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'LetterFilter',

  data () {
    return {
      class: 'c-letter-filter'
    }
  },

  computed: {
    ...mapGetters(['getWordSearch', 'availableLetterGroups', 'getLetterFilter'])
  },

  watch: {
    /**
     * Reset the letter filter if the filter is set and a word search is present
     *
     * @param   {String}  search  the current search
     *
     * @return  {Function}          Reset the letter filter
     */
    getWordSearch (search) {
      if (search.length && typeof this.$store.state.wordFilteredByLetter === 'string') {
        this.$store.dispatch('filterByLetter', null)
      }
    }
  },

  mounted () {
    // Restore letter filter from local storage
    // if (localStorage.getItem('letterFilter')) {
    //   this.$store.dispatch('filterByLetter', localStorage.getItem('letterFilter'))
    // }
  },

  methods: {
    updateLetterFilter (letter) {
      this.$store.dispatch('filterByLetter', letter)

      // localStorage.setItem('letterFilter', letter)
    }
  }
}
</script>
