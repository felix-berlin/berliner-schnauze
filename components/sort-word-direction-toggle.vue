<template>
  <button
    type="button"
    class="c-sort-word-direction-toggle c-button c-button--center-icon c-button--filter"
    :aria-label="'sortiere ' + ($store.state.wordSortDirection === 'asc' ? 'aufsteigend' : 'absteigend')"
    @click="updateSortDirection"
  >
    <transition name="fade-fast" mode="out-in">
      <span v-if="$store.state.wordSortDirection === 'asc'" key="asc" class="c-sort-word-direction-toggle__button c-button--center-icon">
        <SortAsc />
        <span>aufsteigend</span>
      </span>
      <span v-if="$store.state.wordSortDirection === 'desc'" key="desc" class="c-sort-word-direction-toggle__button c-button--center-icon">
        <SortDesc />
        <span>absteigend</span>
      </span>
    </transition>
  </button>
</template>

<script>
import { SortAsc, SortDesc } from 'lucide-vue'

export default {
  name: 'SortWordDirectionToggle',

  components: {
    SortAsc,
    SortDesc
  },

  mounted () {
    // Restore sort direction from local storage
    if (localStorage.getItem('wordSortDirection')) {
      this.$store.commit('updateWordSortDirection', localStorage.getItem('wordSortDirection'))
    }
  },

  methods: {
    updateSortDirection () {
      this.$store.commit('updateWordSortDirection', this.$store.state.wordSortDirection === 'asc' ? 'desc' : 'asc')

      localStorage.setItem('wordSortDirection', this.$store.state.wordSortDirection)
    }
  }
}
</script>
