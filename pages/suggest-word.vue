<template>
  <main class="c-content">
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
