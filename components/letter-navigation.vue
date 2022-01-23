
<template>
  <nav class="c-letter-nav">
    <li v-for="(item, index) in navItems" :key="index" class="c-letter-nav__item">
      <a :href="'#' + item" class="c-letter-nav__link">{{ item }}</a>
    </li>
  </nav>
</template>

<script>
export default {
  name: 'LetterNavigation',

  data () {
    return {
      navItems: this.$store.state.groupNames
    }
  }
}
</script>
