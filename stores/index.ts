import { acceptHMRUpdate, defineStore } from 'pinia'

export const useIndexStore = defineStore('index', () => {
  // state
  const words = ref([])
  const wordGroups = ref([])
  const wordCount = ref('')
  const searchWord = ref('')
  const searchbarIsVisible = ref(false)
  const loadingWords = ref(false)
  const scrollPositionY = ref(null)
  const wordFilteredByLetter = ref(null)
  const wordSortDirection = ref('desc')
  const wordOfTheDay = ref('')
  const loadingWordOfTheDay = ref(false)
  const activeWordSearch = ref('')

  // getters
  const berlinerWords = computed(state => state.words)
  const berlinerWordsGrouped = computed(state => state.wordGroups)
  const berlinerWordCount = computed(state => state.wordCount)
  const getWordLoadingStatus = computed(state => state.loadingWords)
  const getWordSearch = computed(state => state.searchWord)
  const getLetterFilter = computed(state => state.wordFilteredByLetter)
  const searchbarVisible = computed(state => state.searchbarIsVisible)
  const getScrollPositionY = computed(state => state.scrollPositionY)
  const getActiveWordSearch = computed(state => state.activeWordSearch)
  const getWordOfTheDay = computed(state => state.wordOfTheDay)
  const getWordOfTheDayLoadingStatus = computed(state => state.loadingWordOfTheDay)

  /**
   * Get tge words array sorted desc or asc
   *
   * @param   {Array}  state  Array of objects
   *
   * @return  {Array}         Sorted array of objects
   */
  const getWordsSortedByDirection = computed((state) => {
    return [...state.words].sort((a, b) => {
      if (state.wordSortDirection === 'desc') {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? -1 : 1
      } else {
        return a[state.wordSortDirection] > b[state.wordSortDirection] ? 1 : -1
      }
    })
  })

  /**
   * Get a unique alphabetic list of all available letters
   *
   * @param   {Array}  state  vuex state function
   *
   * @return  {Array}         unique alphabetic list
   */
  const availableLetterGroups = computed((state) => {
    // Loop thou array of objects and group by "group" key.
    // Make a unique set of groups
    const groups = Array.from(new Set(state.words.map(item => item.group)))

    // Sort by alphabet
    return groups.sort(function (a, b) {
      if (a < b) { return -1 }
      if (a > b) { return 1 }
      return 0
    })
  })

  /**
   * Returns all words filtered by letter
   *
   * @param {Array} state
   * @returns Array
   */
  const getWordsFilteredByLetter = computed((state) => {
    return state.words.filter(item => item.group === state.wordFilteredByLetter)
  })

  /**
   * Return all filters together for the word list
   *
   * @param   {Object}  state  Vuex state function
   *
   * @return  {Array}         returns filtered words
   */
  const filter = computed((state) => {
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
  })

  // actions

  return { words, wordGroups, wordCount, searchWord, searchbarIsVisible, loadingWords, scrollPositionY, wordFilteredByLetter, wordSortDirection, wordOfTheDay, loadingWordOfTheDay, activeWordSearch }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useIndexStore, import.meta.hot))
}
