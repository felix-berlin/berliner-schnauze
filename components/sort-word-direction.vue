<template>
  <button
    class="c-button c-button--center-icon"
    :aria-label="'sortiere ' + ($store.state.wordSortDirection === 'asc' ? 'aufsteigend' : 'absteigend')"
    @click="$store.commit('updateWordSortDirection', $store.state.wordSortDirection === 'asc' ? 'desc' : 'asc')"
  >
    <transition name="fade-fast" mode="out-in">
      <span v-if="$store.state.wordSortDirection === 'asc'" key="asc" class="c-button--center-icon">
        <SortAsc />
      </span>
      <span v-if="$store.state.wordSortDirection === 'desc'" key="desc" class="c-button--center-icon">
        <SortDesc />
      </span>
    </transition>
  </button>
</template>

<script>
import { SortAsc, SortDesc } from 'lucide-vue'

export default {
  name: 'SortWordDirection',

  components: {
    SortAsc,
    SortDesc
  }
}
</script>
