<template>
  <div class="c-word-search">
    <Search default-class="c-word-search__search-icon" />

    <input
      ref="search"
      :value="search"
      type="text"
      class="c-word-search__search-input"
      :placeholder="placeholder"
      @input="updateSearch"
    >
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
    }
  },

  computed: {
    ...mapState({
      search: state => state.searchWord
    })
  },

  data () {
    return {

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
    }
  }
}
</script>
