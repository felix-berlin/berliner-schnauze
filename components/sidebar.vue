<template>
  <aside class="c-sidebar">
    <LetterFilter />
  </aside>
</template>

<script>
import LetterFilter from './letter-filter.vue'
export default {
  name: 'SidebarPart',
  components: { LetterFilter }
}
</script>
