<template>
  <aside class="c-sidebar">
    <LetterNavigation />
  </aside>
</template>

<script>
import letterNavigation from './letter-navigation.vue'
export default {
  name: 'SidebarPart',
  components: { letterNavigation }
}
</script>
