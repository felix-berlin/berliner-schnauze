<template>
  <component :is="element">
    <transition name="fade-fast" mode="out-in">
      <button
        v-if="$store.state.wordSortDirection === 'desc'"
        aria-label="Aufsteigen sortieren (A - Z)"
        :class="[buttonClass, 'c-button']"
        @click="changeSortDirection('asc')"
      >
        <SortAsc />
      </button>
      <button
        v-else
        :class="[buttonClass, 'c-button']"
        aria-label="Absteigend sortieren (Z - A)"
        @click="changeSortDirection('desc')"
      >
        <SortDesc />
      </button>
    </transition>
  </component>
</template>

<script>
import { SortAsc, SortDesc } from 'lucide-vue'

export default {
  name: 'SwitchSortDirection',

  components: {
    SortAsc,
    SortDesc
  },

  props: {
    element: {
      type: String,
      default: 'div'
    },
    buttonClass: {
      type: String,
      default: ''
    }
  },

  methods: {
    /**
     * Updates the store search direction
     *
     * @param   {String}  direction  desc or asc
     *
     * @return  {String}
     */
    changeSortDirection (direction) {
      this.$store.commit('updateWordSortDirection', direction)
    }
  }
}
</script>
