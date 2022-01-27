export const state = () => ({
  words: [],
  wordGroups: [],
  wordCount: '',
  loadingWords: false,
  groupNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  currentDictionaryPosition: ''
})

export const getters = {
  berlinerWords: state => state.words,
  berlinerWordsGrouped: state => state.wordGroups,
  berlinerWordCount: state => state.wordCount,
  getWordLoadingStatus: state => state.loadingWords,
  dictionaryPosition: state => state.currentDictionaryPosition
}

export const actions = {
  async fetchBerlinWords ({ commit }) {
    commit('wordLoadingStatus', true)

    return await fetch('https://webshaped.de/wp-json/berlinerisch/v1/post')
      .then(res => res.json())
      .then((res) => {
        console.log('loading')
        commit('setBerlinWords', res)
        commit('wordLoadingStatus', false)
      }).catch(error => console.log(error))
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
  setDictionaryPosition: (state, position) => (state.currentDictionaryPosition = position),
  wordLoadingStatus: (state, status) => (state.loadingWords = status)
}
