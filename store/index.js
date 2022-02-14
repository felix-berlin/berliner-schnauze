export const state = () => ({
  words: [],
  wordGroups: [],
  wordCount: '',
  searchWord: '',
  searchbarIsVisable: false,
  loadingWords: false,
  groupNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  currentDictionaryPosition: '',
  scrollPositionY: null
})

export const getters = {
  berlinerWords: state => state.words,
  berlinerWordsGrouped: state => state.wordGroups,
  berlinerWordCount: state => state.wordCount,
  getWordLoadingStatus: state => state.loadingWords,
  dictionaryPosition: state => state.currentDictionaryPosition,
  getWordSearch: state => state.searchWord,
  searchbarVisable: state => state.searchbarIsVisable,
  getScrollPositionY: state => state.scrollPositionY
}

export const actions = {
  async fetchBerlinWords ({ commit, $sentry }) {
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
    // const groupNames = state.groupNames

    // Build group object for each letter
    // groupNames.forEach((groupItem, index) => {
    //   const groups = {
    //     mode: 'span',
    //     label: groupItem,
    //     html: false,
    //     children: []
    //   }
    //   state.wordGroups.push(groups)
    // })

    // Sort all word in there group
    // words.forEach((word, index) => {
    //   state.wordCount = index

    //   const lowerWord = word.word.berlinerisch.toLowerCase()

    //   groupNames.forEach((groupItem, index) => {
    //     if (lowerWord.startsWith(groupItem.toLowerCase())) {
    //       state.wordGroups[index].children.push(word) // einmal word entfernen für ganzes Objekt
    //     }
    //   })
    // })

    // words.forEach((word, index) => {
    //   state.wordCount = index

    //   const lowerWord = word.berlinerisch.charAt(0).toUpperCase()
    //   word.group = lowerWord
    //   console.log(word)

    // groupNames.forEach((groupItem, index) => {
    //   if (lowerWord.startsWith(groupItem.toLowerCase())) {
    //     console.log(groupItem)
    //     const group = { group: groupItem }

    //     state.words[index] = { ...groupItem, ...group } // einmal word entfernen für ganzes Objekt
    //   }
    // })
    // })

    // words.forEach((word, index) => {
    //   state.wordCount = index

    //   const lowerWord = word.berlinerisch.charAt(0).toUpperCase()
    //   word.group = lowerWord
    //   console.log(word)
    // })

    for (const index of words.keys()) {
      state.wordCount = index
    }

    state.words = words
  },
  upWords: (state, w) => (state.berlinerWords = w),
  setDictionaryPosition: (state, position) => (state.currentDictionaryPosition = position),
  wordLoadingStatus: (state, status) => (state.loadingWords = status),
  updateSearch: (state, search) => (state.searchWord = search),
  updateSearchbarIsVisable: (state, visable) => (state.searchbarIsVisable = visable),
  updateScrollPositionY: (state, position) => (state.scrollPositionY = position)
}
