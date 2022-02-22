<template>
  <main class="c-content">
    <h1>Vermisste hier nen Wort oder ne Redewendung?</h1>
    <SuggestWordForm />
  </main>
</template>

<script>
export default {
  name: 'SuggestWordPage',

  head () {
    return {
      title: 'Wort vorschlagen - Berliner Schnauze',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Das Impressum von Berliner Schnauze.'
        },
        {
          name: 'robots',
          content: 'noindex, nofollow'
        }
      ]
    }
  }
}
</script>
