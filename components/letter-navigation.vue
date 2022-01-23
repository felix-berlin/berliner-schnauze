
<template>
  <nav class="c-letter-nav">
    <ul class="c-letter-nav__list">
      <li v-for="(item, index) in navItems" :key="index" class="c-letter-nav__list-item">
        <a v-smooth-scroll :href="'#' + item" class="c-letter-nav__link" :title="'Buchstabe: ' + item">{{ item }}</a>
      </li>
    </ul>
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
