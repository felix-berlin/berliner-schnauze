
<template>
  <div class="c-filter-dropdown">
    <Dropdown
      :critical="true"
      menu-align="right"
      :modifier="['c-filter-dropdown__dropdown']"
      :button-modifier="[{'has-active-filter': getLetterFilter}, 'c-button--center-icon']"
      button-aria-label="Filter"
    >
      <template #title>
        <span class="u-icon-untouchable c-button--center-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </span>
        Filter
      </template>
      <template #content>
        <LetterFilter :critical="true" modifier="c-letter-filter--mobile" />
      </template>
    </Dropdown>
    <div v-if="getLetterFilter" class="c-filter-dropdown__active-filter" @click="$store.dispatch('filterByLetter', null)">
      <span>{{ getLetterFilter }}</span><span><X :size="10" /></span>
    </div>
  </div>
</template>

<script>
import { X } from 'lucide-vue'
import { mapGetters } from 'vuex'

export default {
  name: 'FilterDropdown',

  components: {
    X
  },

  computed: {
    ...mapGetters(['getLetterFilter'])
  }

}
</script>
