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
    <transition name="fade">
      <div v-if="keyboardFocus" v-show="!showSearchBar" class="c-word-search__shortcut">
        <Command v-if="$device.isMacOS" />
        <span v-if="$device.isWindows">Control</span>
        <span>+ K</span>
      </div>
    </transition>
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
    }
  },

  data () {
    return {
      id: this.$uuid.v4(),
      searchButtonPosition: this.buttonPosition,
      showSearchBar: true,
      timeoutId: null,
      pressedKeys: {}
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
    },

    focusSearch () {
      this.$refs.search.focus()
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
        if (this.showSearchbarAfterClick) { this.showSearchBar = false }
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
    }
  }
}
</script>
