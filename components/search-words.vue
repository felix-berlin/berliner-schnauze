<template>
  <div class="c-word-search" :class="modifier">
    <!-- <transition name="fade-fast"> -->
    <div v-if="keyboardFocus" v-show="!showSearchBar && !$device.isMobileOrTablet" class="c-word-search__shortcut">
      <span v-show="$device.isMacOS">
        <Command />
      </span>
      <span v-show="$device.isWindows">Control </span>
      <span> + K</span>
    </div>
    <!-- </transition> -->
    <button aria-label="Wortsuche betätigen" type="button" class="c-word-search__search-button u-button-reset c-button c-button--center-icon" :class="[{ 'c-word-search__search-button--right': (searchButtonPosition != 'left'), 'c-word-search__search-button--left': (searchButtonPosition != 'right'), 'has-searchbar': showSearchBar }, buttonModifier]" @click="buttonActions()">
      <Search default-class="c-word-search__search-icon" />
    </button>
    <transition-group v-show="showSearchBar" name="fade" class="c-word-search__search-wrap" :class="searchbarModifier" tag="div">
      <input
        :id="'wordSearch' + id"
        ref="search"
        key="input"
        type="search"
        class="c-word-search__search-input"
        placeholder=" "
        :aria-label="searchAriaLabel"
        @input="updateSearch"
        @focus="resetTimeout"
        @blur="hideSearchbarAfterTime(5000)"
      >
      <label key="label" class="c-word-search__search-label" :for="'wordSearch' + id" v-text="placeholder" />
    </transition-group>
  </div>
</template>

<script>
import { Search, Command } from 'lucide-vue'
import { mapState } from 'vuex'

export default {
  name: 'SearchWords',

  components: {
    Search,
    Command
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
    },
    keyboardFocus: {
      type: Boolean,
      default: false
    },
    searchAriaLabel: {
      type: String,
      default: ''
    },
    modifier: {
      type: Array,
      default: () => []
    },
    buttonModifier: {
      type: String,
      default: ''
    },
    searchbarModifier: {
      type: String,
      default: ''
    }
  },

  data () {
    return {
      id: this.$uuid.v4(),
      searchButtonPosition: this.buttonPosition,
      showSearchBar: true,
      timeoutId: null,
      pressedKeys: {},
      searchLength: null,
      scrollToResultsTriggert: false // Prevent scroll to results triggert more than one time
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

    if (this.$store.state.scrollPositionY < 200) {
      this.scrollToResultsTriggert = false
    }

    window.addEventListener('keydown', this.triggerKeyboardSearch)
  },

  beforeDestroy () {
    window.addEventListener('keydown', this.triggerKeyboardSearch)
  },

  methods: {
    /**
     * Updates the vuex store with the current search input
     *
     * @param   {String}  searchInput  Search input
     *
     * @return  {String}               Search input
     */
    updateSearch (searchInput) {
      this.$store.commit('updateSearch', searchInput.target.value)

      this.searchLength = searchInput.target.value.length

      this.scrollToResults()
    },

    focusSearch () {
      this.$nextTick(function () {
        this.$refs.search.blur() // Make sure the searchbar is not allready focused
        this.$refs.search.focus()
      })
    },

    /**
     * Hide the searchbar after a given time
     *
     * @param   {Number}  timeout  Timeout in millisecons
     *
     * @return  {Number}           Timeout ID
     */
    hideSearchbarAfterTime (timeout) {
      const time = setTimeout(() => {
        if (this.showSearchbarAfterClick) {
          this.showSearchBar = false
          this.$store.commit('updateSearchbarIsVisable', this.showSearchBar)
        }
      }, timeout)

      this.timeoutId = time

      return time
    },

    /**
     * Reset the given timeout
     */
    resetTimeout () {
      clearTimeout(this.timeoutId)
    },

    /**
     * Show the searchbar and hide them after a given time
     */
    showAndFocusSearchbar () {
      this.showSearchBar = true
      this.$store.commit('updateSearchbarIsVisable', this.showSearchBar)

      // When searchbar is loaded focus it
      this.$nextTick(function () {
        this.focusSearch()
      })
      this.hideSearchbarAfterTime(8000)
    },

    buttonActions () {
      if (this.showSearchbarAfterClick) {
        this.showAndFocusSearchbar()
      }
      this.focusSearch()
    },

    /**
     * Checks if keyboard commands
     *
     * @param   {Object}  stroke  Eventlistener event
     *
     * @return  {Function}          [return description]
     */
    triggerKeyboardSearch (stroke) {
      if (!this.keyboardFocus) {
        return
      }

      this.pressedKeys[stroke.key] = stroke.type === 'keydown'

      // Shortcuts per OS
      const windowsCommand = this.$device.isWindows && this.pressedKeys.Control && this.pressedKeys.k
      const macCommand = this.$device.isMacOS && this.pressedKeys.command && this.pressedKeys.k

      if (windowsCommand || macCommand) {
        stroke.preventDefault()

        this.showAndFocusSearchbar()

        this.pressedKeys = {}
      }

      if (this.pressedKeys.Escape) {
        this.showSearchBar = false
        this.$store.commit('updateSearchbarIsVisable', this.showSearchBar)
      }
    },

    scrollToResults () {
      if ((this.$store.state.scrollPositionY > 200) && (this.searchLength > 0) && !this.scrollToResultsTriggert) {
        this.scrollToResultsTriggert = true
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }
}
</script>
