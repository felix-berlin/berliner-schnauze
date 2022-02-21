<template>
  <form class="c-suggest-word-form" @submit="formSubmit">
    <label class="c-label" for="berliner-wort">Berliner Wort</label>
    <input
      id="berliner-wort"
      v-model="formData['berliner-word']"
      class="c-input"
      type="text"
      name="berliner-wort"
      required
    >

    <label class="c-label" for="translation">Übersetzung in Hochdeutsche</label>
    <input id="translation" v-model="formData.translation" class="c-input" type="text" name="translation">

    <label class="c-label" for="example">Schreibe einen Beispielsatz:</label>
    <textarea
      id="example"
      v-model="formData.example"
      class="c-textarea"
      name="example"
      cols="30"
      rows="10"
    />

    <label class="c-label" for="user-email">Deine E-Mailadresse</label>
    <input id="user-email" v-model="formData['user-mail']" class="c-input c-input--email" type="email" name="user-email">

    <label class="c-label" for="user-name">Dein Name</label>
    <input id="user-name" v-model="formData['user-name']" class="c-input" type="text" name="user-name">

    <button class="c-button" type="submit">
      Senden
    </button>
  </form>
</template>

<script>
export default {
  name: 'SuggestWordForm',

  data () {
    return {
      formData: {
        'berliner-word': '',
        translation: '',
        example: '',
        'user-mail': '',
        'user-name': ''
      },
      formResponse: {
        message: ''
      }
    }
  },

  methods: {
    formSubmit (e) {
      e.preventDefault()

      const formInputs = new FormData()
      // const data = {
      //   example: this.formData.example
      // }

      for (const name in this.formData) {
        formInputs.append(name, this.formData[name])
      }

      this.$axios({
        method: 'post',
        url: this.$config.baseApiUrl + '/wp-json/contact-form-7/v1/contact-forms/4733/feedback',
        data: formInputs,
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((response) => {
        this.formResponse.message = response.data.message
        console.log(response.data.message)
        console.log(response.data)
        console.log(response)
      }).catch((error) => {
        this.$sentry.captureException(error)
        console.log(error)
      })
    }
  }
}
</script>
