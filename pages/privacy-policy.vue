<template>
  <div class="c-content o-legal-pages">
    <GutenbergBlocks v-if="result?.page.content" :blocks="result.page.blocks" />
  </div>
</template>

<script setup lang="ts">

const query = gql`
query imprintPage {
  page(id: "4715", idType: DATABASE_ID) {
    content,
    blocks {
      name
      order
      attributesJSON
    }
  }
}`

const { result } = useQuery(query)

useServerSeoMeta({
  title: 'Datenschutzerklärung - Berliner Schnauze',
  ogTitle: 'Datenschutzerklärung - Berliner Schnauze',
  description: 'Die Datenschutzerklärung von Berliner Schnauze.',
  ogDescription: 'Die Datenschutzerklärung von Berliner Schnauze.'
})
</script>

<style lang="scss">
@use '@styles/objects/legal-pages';
</style>
