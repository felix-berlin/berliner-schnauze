
<template>
  <div class="c-filter-dropdown">
    <VDropdown
      placement="bottom"
      popper-class="c-filter-dropdown__dropdown"
      distance="9"
      container=".c-filter-dropdown"
      :shown="hideDropdown"
      :delay="{ show: 0, hide: 0 }"
    >
      <button
        type="button"
        :class="['c-button c-button--center-icon c-button--filter', {'has-active-filter': $store.getters.getLetterFilter}]"
        aria-label="Filter"
      >
        <span class="u-icon-untouchable c-button--center-icon">
          <FilterIcon />
        </span>
        alphabetisch
      </button>

      <template #popper>
        <LetterFilter :critical="true" />
      </template>
    </VDropdown>

    <div v-if="$store.getters.getLetterFilter" class="c-filter-dropdown__active-filter" @click="$store.dispatch('filterByLetter', null)">
      <span>{{ $store.getters.getLetterFilter }}</span><span><X :size="10" /></span>
    </div>
  </div>
</template>

<script>
import { X, Filter as FilterIcon } from 'lucide-vue'

export default {
  name: 'FilterDropdown',

  components: {
    X,
    FilterIcon
  },

  data () {
    return {
      hideDropdown: false
    }
  },

  created () {
    /**
     * Hide the dropdown when the user chooses a new
     *
     * @param   {Object}  state
     * @param   {Object}  getters
     * @param   {String}  newValue
     * @param   {String}  oldValue
     */
    this.unwatch = this.$store.watch((state, getters) => getters.getLetterFilter, (newValue, oldValue) => {
      if (newValue !== oldValue) {
        this.hideDropdown = true
        setTimeout(() => {
          this.hideDropdown = false
        }, 0)
      }
    })
  },

  beforeDestroy () {
    this.unwatch()
  }
}
</script>

<style lang="scss">
  @use '@styles/components/filter-dropdown';
</style>
