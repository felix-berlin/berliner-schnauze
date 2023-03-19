<template>
  <div>
    <GutenbergBlocks v-if="result?.page.content" :blocks="result.page.blocks" />
  </div>
</template>

<script setup lang="ts">

const query = gql`
query imprintPage {
  page(id: "4712", idType: DATABASE_ID) {
    content,
    blocks {
      name
      order
      attributesJSON
    }
  }
}`

const { result } = useQuery(query)

const store = useIndexStore()
useServerSeoMeta({
  title: 'Impressum - Berliner Schnauze',
  ogTitle: 'Impressum - Berliner Schnauze',
  description: 'Das Impressum von Berliner Schnauze.',
  ogDescription: 'Das Impressum von Berliner Schnauze.'
})
</script>

<style scoped>

</style>
