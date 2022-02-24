export const state = () => ({
  words: [],
  wordGroups: [],
  wordCount: '',
  searchWord: '',
  searchbarIsVisable: false,
  loadingWords: false,
  groupNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  scrollPositionY: null,
  wordFilteredByLetter: null,
  wordSortDirection: 'desc'
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
  searchbarVisable: state => state.searchbarIsVisable,
  getScrollPositionY: state => state.scrollPositionY,
  getWordsSortedByDirection (state) {
    return [...state.words].sort((a, b) => {
      if (state.wordSortDirection === 'desc') {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
      } else {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
      }
    })
  },
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
  wordLoadingStatus: (state, status) => (state.loadingWords = status),
  updateSearch: (state, search) => (state.searchWord = search),
  updateSearchbarIsVisable: (state, visable) => (state.searchbarIsVisable = visable),
  updateScrollPositionY: (state, position) => (state.scrollPositionY = position),
  updateWordSortDirection: (state, direction) => (state.wordSortDirection = direction),
  updateWordFilteredLetter: (state, letter) => (state.wordFilteredByLetter = letter)
}
