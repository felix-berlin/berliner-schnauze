
<template>
  <nav class="c-letter-filter" :class="modifier">
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
          @click="$store.dispatch('filterByLetter', letter)"
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

  computed: {
    ...mapGetters(['getWordSearch', 'availableLetterGroups'])
  },

  watch: {
    /**
     * Reset the letter filter if the filter is set and a word search is present
     *
     * @param   {String}  search  the current search
     *
     * @return  {Funtion}          Reset the letter filter
     */
    getWordSearch (search) {
      if (search.length && typeof this.$store.state.wordFilteredByLetter === 'string') {
        this.filterByLetter(null)
      }
    }
  }
}
</script>
