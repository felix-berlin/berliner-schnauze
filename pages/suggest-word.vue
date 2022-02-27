<template>
  <main class="c-content">
    <h1>Vermisste hier nen Wort oder ne Redewendung?</h1>
    <SuggestWordForm :critical="true" />
  </main>
</template>

<script>

export default {
  name: 'SuggestWordPage',

  speedkitComponents: {
    SuggestWordForm: () => import('@/components/suggest-word-form')
  },

  head () {
    return {
      title: 'Wort vorschlagen - Berliner Schnauze',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Das Impressum von Berliner Schnauze.'
        }
      ]
    }
  }
}
</script>
