<template>
  <section class="c-related-words">
    <h2 class="c-related-words__headline">
      Lust mehr Wörter kennen zu lernen?
    </h2>
    <div class="c-related-words__words">
      <NuxtLink
        v-for="(word, index) in randomWords($store.state.words, 8)"
        :key="index"
        :to="$routeToWord(word.post_name)"
        class="c-related-words__word"
        :title="'Erfahre mehr über ' + word.berlinerisch"
      >
        {{ word.berlinerisch }}
      </NuxtLink>
    </div>
  </section>
</template>

<script>
export default {
  name: 'RelatedWords',

  methods: {
    /**
     * Get x random items from an array
     *
     * @param   {Array}  arr  Array to get random items from
     * @param   {Number}  n    Number of items to get
     *
     * @return  {Array}       Array of random items
     */
    randomWords (arr, n) {
      const result = new Array(n)
      let len = arr.length
      const taken = new Array(len)
      if (n > len) { throw new RangeError('getRandom: more elements taken than available') }
      while (n--) {
        const x = Math.floor(Math.random() * len)
        result[n] = arr[x in taken ? taken[x] : x]
        taken[x] = --len in taken ? taken[len] : len
      }

      return result
    }
  }
}
</script>
