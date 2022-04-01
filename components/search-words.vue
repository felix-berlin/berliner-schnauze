<template>
  <div class="c-word-search" :class="[{ 'c-word-search--large': searchbarType === 'large', 'c-word-search--nav-search': searchbarType === 'nav-search' }, modifier]">
    <!-- <transition name="fade-fast"> -->
    <div v-if="keyboardFocus" v-show="!showSearchBar && !$device.isMobileOrTablet" class="c-word-search__shortcut">
      <span v-show="$device.isMacOS" class="c-word-search__command-icon-wrap">
        <Command :size="12" class="c-word-search__command-icon" />
      </span>
      <span v-show="$device.isWindows">Control</span>
      <span class="c-word-search__shortcut-combine">+</span>
      <span>K</span>
    </div>
    <!-- </transition> -->

    <button
      aria-label="Wortsuche betätigen"
      type="button"
      class="c-word-search__search-button u-button-reset c-button c-button--center-icon"
      :class="[{ 'c-word-search__search-button--right': (searchButtonPosition != 'left'), 'c-word-search__search-button--left': (searchButtonPosition != 'right'), 'has-searchbar': showSearchBar }, buttonModifier]"
      @click="buttonActions()"
    >
      <span v-show="toggleShowAndClearIcon" class="c-button--center-icon">
        <Search default-class="c-word-search__search-icon" />
      </span>
      <span v-show="!toggleShowAndClearIcon" class="c-button--center-icon">
        <X />
      </span>
    </button>

    <transition-group v-show="showSearchBar" name="fade" class="c-word-search__search-wrap c-floating-label" :class="searchbarModifier" tag="div">
      <input
        :id="'wordSearch' + id"
        :ref="'search' + id"
        key="input"
        type="search"
        class="c-word-search__search-input c-input c-floating-label__input"
        placeholder=" "
        :aria-label="searchAriaLabel"
        @input="updateSearch"
        @focus="resetTimeout"
        @blur="hideSearchbarAfterTime(5000)"
      >
      <label key="label" class="c-word-search__search-label c-floating-label__label c-floating-label__label--center" :for="'wordSearch' + id" v-text="placeholder" />
    </transition-group>
  </div>
</template>

<script>
import { Search, Command, X } from 'lucide-vue'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'SearchWords',

  components: {
    Search,
    Command,
    X
  },

  props: {
    searchbarType: {
      type: String,
      default: '',
      require: true,
      validator (value) {
        return ['nav-search', 'large'].includes(value)
      }
    },
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
      searchLength: 0,
      scrollToResultsTriggert: false, // Prevent scroll to results triggert more than one time
      scrollbarVisable: undefined,
      toggleShowAndClearIcon: true
    }
  },

  computed: {
    ...mapState({
      search: state => state.searchWord
    }),
    ...mapGetters(['getLetterFilter, updateScrollPositionY'])
  },

  watch: {
    getLetterFilter (newLetter, oldLetter) {
      if (oldLetter !== newLetter) {
        this.resetSearch()
      }
    }
  },

  created () {
    if (this.showSearchbarAfterClick) {
      this.showSearchBar = false
    }

    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      if (mutation.type === 'updateScrollPositionY') {
        if (state.scrollPositionY < 200) {
          this.scrollToResultsTriggert = false
          this.scrollbarVisable = true
        } else {
          this.scrollbarVisable = false
        }
      }
    })
  },

  mounted () {
    if (this.focusOnPageLoad) {
      this.focusSearch()
    }

    window.addEventListener('keydown', this.triggerKeyboardSearch)
  },

  beforeDestroy () {
    this.unsubscribe()
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

      this.toggleSearchClearIcons()

      this.scrollToResults()
    },

    toggleSearchClearIcons () {
      if (this.searchLength === 0) {
        this.toggleShowAndClearIcon = true
      }
      if (this.searchLength > 0) {
        this.toggleShowAndClearIcon = false
      }
    },

    /**
     * Reset search input and search store
     */
    resetSearch () {
      this.$refs['search' + this.id].value = '' // Reset input
      this.$store.commit('updateSearch', '') // Reset store
      this.searchLength = 0
      this.toggleSearchClearIcons()
    },

    /**
     * Focus the searchbar
     *
     * @return  {Function}  Unfocus and focus the searchbar
     */
    focusSearch () {
      this.$nextTick(function () {
        // if (this.$refs.search === document.activeElement) {
        //   this.$refs.search.blur() // Make sure the searchbar is not allready focused
        // }
        // this.$refs['search' + this.id].blur()
        this.$refs['search' + this.id].focus()
        this.scrollToResults()
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
          this.toggleShowAndClearIcon = true
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
      if (this.searchLength > 0) {
        this.resetSearch()
      }
      if (this.searchLength === 0) {
        this.focusSearch()
      }
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
      if (!this.scrollbarVisable && (this.searchLength > 0)) {
        this.scrollToResultsTriggert = true
        this.$smoothScrollTo(document.querySelector('.c-word-search--large'), 60)
      }
    }
  }
}
</script>
