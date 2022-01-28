<template>
  <div class="c-word-search">
    <button type="button" class="c-word-search__search-button" :class="{ 'c-word-search__search-button--right': (searchButtonPosition != 'left') }" @click="buttonActions()">
      <Search default-class="c-word-search__search-icon" />
    </button>
    <transition name="fade">
      <input
        v-show="showSearchBar"
        ref="search"
        :value="search"
        type="text"
        class="c-word-search__search-input"
        :placeholder="placeholder"
        @input="updateSearch"
        @focus="resetTimeout"
        @blur="hideSearchbarAfterTime(5000)"
      >
    </transition>
  </div>
</template>

<script>
import { Search } from 'lucide-vue'
import { mapState } from 'vuex'

export default {
  name: 'SearchWords',

  components: {
    Search
  },

  props: {
    placeholder: {
      type: String,
      default: 'Suche'
    },
    focusOnPageLoad: {
      type: Boolean,
      default: false
    },
    buttonPosition: {
      type: String,
      default: 'left',
      validator (value) {
        return ['left', 'right'].includes(value)
      }
    },
    showSearchbarAfterClick: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      searchButtonPosition: this.buttonPosition,
      showSearchBar: true,
      timeoutId: null
    }
  },

  computed: {
    ...mapState({
      search: state => state.searchWord
    })
  },

  created () {
    if (this.showSearchbarAfterClick) {
      this.showSearchBar = false
    }
  },

  mounted () {
    if (this.focusOnPageLoad) {
      this.focusSearch()
    }
  },

  methods: {
    updateSearch (e) {
      this.$store.commit('updateSearch', e.target.value)
    },

    focusSearch () {
      this.$refs.search.focus()
    },

    hideSearchbarAfterTime (timeout) {
      const time = setTimeout(() => {
        if (this.showSearchbarAfterClick) { this.showSearchBar = false }
      }, timeout)

      this.timeoutId = time

      return time
    },

    resetTimeout () {
      clearTimeout(this.timeoutId)
    },

    buttonActions () {
      if (this.showSearchbarAfterClick) {
        this.showSearchBar = true

        // When searchbar is loaded focus it
        this.$nextTick(function () {
          this.focusSearch()
        })
        this.hideSearchbarAfterTime(8000)
      }
      this.focusSearch()
    }
  }
}
</script>
