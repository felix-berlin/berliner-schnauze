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
  activeWordSearch: ''
})

// const sortFuctions = {
//   wordsSortedByDirection (state) {
//     return [...state.words].sort((a, b) => {
//       if (state.wordSortDirection === 'desc') {
//         return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
//       } else {
//         return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
//       }
//     })
//   },
//   wordsFilteredByLetter (state) {
//     return state.words.filter(item => item.group === state.wordFilteredByLetter)
//   }
// }

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
   * Get a uniqe alphabetic list of all available letters
   *
   * @param   {Array}  state  vuex state function
   *
   * @return  {Array}         uniqe alphabetic list
   */
  availableLetterGroups (state) {
    // Loop throu array of objects and group by "group" key.
    // Make a uniqe set of groups
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
  filter (state) {
    // return state.words.filter((item) => {
    //   // Filter by letter
    //   if (state.wordFilteredByLetter !== null) {
    //     return item.group === state.wordFilteredByLetter
    //   }
    //   // Return all words when no letter is choosen
    //   return state.words
    // })

    if (state.wordFilteredByLetter !== null && state.searchWord.length === 0) {
      return state.words.filter(item => item.group === state.wordFilteredByLetter)
    }

    return state.words
    // if (state.wordFilteredByLetter === null) {
    //   return state.words.sort((a, b) => {
    //     if (state.wordSortDirection === 'desc') {
    //       return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
    //     } else {
    //       return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
    //     }
    //   })
    // }

    // const wordGroups = state.words.filter(item => item.group === state.wordFilteredByLetter)

    // return wordGroups.sort((a, b) => {
    //   if (state.wordSortDirection === 'desc') {
    //     return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
    //   } else {
    //     return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
    //   }
    // })
  }
  // letterList (state) {
  //   // const only = state.words.map(word => word.group)
  //   const list = state.words
  //   // eslint-disable-next-line no-unreachable-loop
  //   for (const [word, index] of list) {
  //     const child = word.group[index]
  //     // const cLetter = child.charAt(0)
  //     return child
  //   }
  // }
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
  async nuxtServerInit ({ commit, $sentry }) {
    commit('wordLoadingStatus', true)

    return await fetch(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words`)
      .then(res => res.json())
      .then((res) => {
        commit('setBerlinWords', res)
        commit('wordLoadingStatus', false)
      }).catch((error) => {
        $sentry.captureException(error)
      })
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
  updateSearch: (state, search) => (state.searchWord = search),
  updateSearchbarIsVisible: (state, visible) => (state.searchbarIsVisible = visible),
  updateScrollPositionY: (state, position) => (state.scrollPositionY = position),
  updateWordSortDirection: (state, direction) => (state.wordSortDirection = direction),
  updateWordFilteredLetter: (state, letter) => (state.wordFilteredByLetter = letter),
  updateWordOfTheDay: (state, word) => (state.wordOfTheDay = word),
  updateActiveWordSearch: (state, word) => (state.activeWordSearch = word)
}
