<template>
  <main class="c-content">
    <h1>Wort Übersicht</h1>
    <ul>
      <li v-for="word, index in $store.state.words" :key="index">
        <router-link :to="'/word/' + word.post_name">
          {{ word.berlinerisch }}
        </router-link>
      </li>
    </ul>
  </main>
</template>

<script>
export default {
  name: 'WordIndexPage'
}
</script>
