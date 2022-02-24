export const state = () => ({
  words: [],
  wordGroups: [],
  wordCount: '',
  searchWord: '',
  searchbarIsVisable: false,
  loadingWords: false,
  groupNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  currentDictionaryPosition: '',
  scrollPositionY: null,
  wordSortDirection: 'asc'
})

export const getters = {
  berlinerWords: state => state.words,
  berlinerWordsGrouped: state => state.wordGroups,
  berlinerWordCount: state => state.wordCount,
  getWordLoadingStatus: state => state.loadingWords,
  dictionaryPosition: state => state.currentDictionaryPosition,
  getWordSearch: state => state.searchWord,
  searchbarVisable: state => state.searchbarIsVisable,
  getScrollPositionY: state => state.scrollPositionY,
  sortedWords (state) {
    return [...state.words].sort((a, b) => {
      if (state.wordSortDirection === 'desc') {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
      } else {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
      }
    })
  }
}

export const actions = {
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

  updateDictionaryPosition ({ commit }, position) {
    commit('setDictionaryPosition', position)
  }
}

export const mutations = {
  setBerlinWords (state, words) {
    for (const index of words.keys()) {
      state.wordCount = index
    }

    state.words = words
  },
  upWords: (state, w) => (state.words = w),
  setDictionaryPosition: (state, position) => (state.currentDictionaryPosition = position),
  wordLoadingStatus: (state, status) => (state.loadingWords = status),
  updateSearch: (state, search) => (state.searchWord = search),
  updateSearchbarIsVisable: (state, visable) => (state.searchbarIsVisable = visable),
  updateScrollPositionY: (state, position) => (state.scrollPositionY = position),
  updateWordSortDirection: (state, direction) => (state.wordSortDirection = direction)
}
