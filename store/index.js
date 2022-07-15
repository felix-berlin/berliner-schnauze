export const state = () => ({
  words: [],
  wordGroups: [],
  wordCount: '',
  searchWord: '',
  searchbarIsVisible: false,
  loadingWords: false,
  scrollPositionY: null,
  wordFilteredByLetter: null,
  wordSortDirection: 'desc',
  wordOfTheDay: '',
  loadingWordOfTheDay: false,
  activeWordSearch: ''
})

export const getters = {
  berlinerWords: state => state.words,
  berlinerWordsGrouped: state => state.wordGroups,
  berlinerWordCount: state => state.wordCount,
  getWordLoadingStatus: state => state.loadingWords,
  getWordSearch: state => state.searchWord,
  getLetterFilter: state => state.wordFilteredByLetter,
  searchbarVisible: state => state.searchbarIsVisible,
  getScrollPositionY: state => state.scrollPositionY,
  getActiveWordSearch: state => state.activeWordSearch,
  getWordOfTheDayLoadingStatus: state => state.loadingWordOfTheDay,

  /**
   * Get tge words array sorted desc or asc
   *
   * @param   {Array}  state  Array of objects
   *
   * @return  {Array}         Sorted array of objects
   */
  getWordsSortedByDirection (state) {
    return [...state.words].sort((a, b) => {
      if (state.wordSortDirection === 'desc') {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
      } else {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
      }
    })
  },

  /**
   * Get a unique alphabetic list of all available letters
   *
   * @param   {Array}  state  vuex state function
   *
   * @return  {Array}         unique alphabetic list
   */
  availableLetterGroups (state) {
    // Loop thou array of objects and group by "group" key.
    // Make a unique set of groups
    const groups = Array.from(new Set(state.words.map(item => item.group)))

    // Sort by alphabet
    return groups.sort(function (a, b) {
      if (a < b) { return -1 }
      if (a > b) { return 1 }
      return 0
    })
  },

  /**
   * Returns all words filtered by letter
   *
   * @param {Array} state
   * @returns Array
   */
  getWordsFilteredByLetter (state) {
    return state.words.filter(item => item.group === state.wordFilteredByLetter)
  },

  /**
   * Return all filters together for the word list
   *
   * @param   {Object}  state  Vuex state function
   *
   * @return  {Array}         returns filtered words
   */
  filter (state) {
    /**
     * Words sort asc or desc
     *
     * @param   {Array}  a  Direction A
     * @param   {Array}  b  Direction B
     *
     * @return  {Array}     returns sorted words
     */
    const SortWordsAscDesc = [...state.words].sort((a, b) => {
      if (state.wordSortDirection === 'desc') {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
      } else {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
      }
    })

    if (state.wordFilteredByLetter !== null && state.searchWord.length === 0) {
      /**
       * Words filtered by letter
       *
       */
      return SortWordsAscDesc.filter(item => item.group === state.wordFilteredByLetter)
    }

    return SortWordsAscDesc
  }
}

export const actions = {
  /**
   * Fetch all words on sever init
   *
   * @param   {Function}  commit
   * @param   {Function}  $sentry
   *
   * @return  {Function}
   */
  async nuxtServerInit ({ commit }) {
    commit('wordLoadingStatus', true)

    return await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words`)
      .then(res => res.json())
      .then((res) => {
        commit('setBerlinWords', res)
        commit('wordLoadingStatus', false)
      }).catch((error) => {
        console.warn(error)
      })
  },

  async loadWordOfTheDay ({ commit, $sentry }) {
    commit('wordOfTheDayLoadingStatus', true)
    return await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/word-of-the-day`)
      .then(res => res.json())
      .then((data) => {
        commit('updateWordOfTheDay', data)
        commit('wordOfTheDayLoadingStatus', false)
      })
      .catch((err) => { $sentry.captureException(err) })
  },

  /**
   * Filter by letter
   *
   * @param   {Function}  commit
   * @param   {String}  letter  the letter to filter
   *
   * @return  {Function}          Set the letter in the store
   */
  filterByLetter ({ commit }, letter) {
    commit('updateWordFilteredLetter', letter)
  }
}

export const mutations = {
  setBerlinWords (state, words) {
    for (const index of words.keys()) {
      state.wordCount = index
    }

    state.words = words
  },
  wordLoadingStatus: (state, status) => (state.loadingWords = status),
  wordOfTheDayLoadingStatus: (state, status) => (state.loadingWordOfTheDay = status),
  updateSearch: (state, search) => (state.searchWord = search),
  updateSearchbarIsVisible: (state, visible) => (state.searchbarIsVisible = visible),
  updateScrollPositionY: (state, position) => (state.scrollPositionY = position),
  updateWordSortDirection: (state, direction) => (state.wordSortDirection = direction),
  updateWordFilteredLetter: (state, letter) => (state.wordFilteredByLetter = letter),
  updateWordOfTheDay: (state, word) => (state.wordOfTheDay = word),
  updateActiveWordSearch: (state, word) => (state.activeWordSearch = word)
}
