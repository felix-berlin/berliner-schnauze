<template>
  <form class="c-suggest-word-form" novalidate="true" @submit.prevent="checkForm">
    <!-- <p v-if="formErrors.length">
      <b>Please correct the following error(s):</b>
      <ul>
        <li v-for="error in formErrors" :key="error">
          {{ error }}
        </li>
      </ul>
    </p> -->

    <label class="c-label" for="berliner-wort">Berliner Wort</label>
    <input
      id="berliner-wort"
      v-model="formData['berliner-word']"
      class="c-input"
      type="text"
      name="berliner-wort"
      required
    >
    <p v-if="formErrors.berlinerWord">
      Falsch
    </p>

    <label class="c-label" for="translation">Übersetzung in Hochdeutsche</label>
    <input id="translation" v-model="formData.translation" class="c-input" type="text" name="translation">
    <p v-if="formErrors.translation">
      Falsch
    </p>

    <label class="c-label" for="example">Schreibe einen Beispielsatz:</label>
    <textarea
      id="example"
      v-model="formData.example"
      class="c-textarea"
      name="example"
      cols="30"
      rows="10"
    />

    <label class="c-label" for="user-name">Dein Name</label>
    <input id="user-name" v-model="formData['user-name']" class="c-input" type="text" name="user-name">
    <p v-if="formErrors.eMail">
      Falsch
    </p>

    <label class="c-label" for="user-email">Deine E-Mailadresse</label>
    <input id="user-email" v-model="formData['user-mail']" class="c-input c-input--email" type="email" name="user-email">

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
      formErrors: {
        berlinerWord: false,
        translation: false,
        eMail: false
      },
      formResponse: {
        message: ''
      }
    }
  },

  methods: {
    formSubmit () {
      const formInputs = new FormData()

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
      }).catch((error) => {
        this.$sentry.captureException(error)
      })
    },

    /**
     * Turns all given object values to false
     *
     * @param   {Object}  object  The object values you want to turn falsy
     *
     * @return  {Object}          returns object with falsy values
     */
    negateObjectKeys (object) {
      return Object.fromEntries(Object.keys(object).map(key => [key, false]))
    },

    /**
     * Checks if all object values are true || false
     *
     * @param   {Object}  object    The object to check
     * @param   {Boolean}  checkFor  Boolean your are checking for
     *
     * @return  {Boolean}            Return if all are true or false
     */
    checkObjectValues (object, checkFor = false) {
      return Object.values(object).every(v => v === checkFor)
    },

    /**
     * Validates the form
     *
     * @return  {Function}     Submit form
     */
    checkForm () {
      // Reset all errors
      this.formErrors = this.negateObjectKeys(this.formErrors)

      if (!this.formData['berliner-word']) { this.formErrors.berlinerWord = true }
      if (!this.formData.translation) { this.formErrors.translation = true }

      // If an e-mail address is given, validate it
      if (this.formData['user-mail'].length > 0 && !this.validEmail(this.formData['user-mail'])) {
        this.formErrors.eMail = true
      }

      if (this.checkObjectValues(this.formErrors)) {
        this.formSubmit()
      }
    },

    /**
     * Checks if its a real email address
     *
     * @param   {String}  email  E-Mail address
     *
     * @return  {Boolean}         If check passes return true
     */
    validEmail (email) {
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return re.test(email)
    }
  }
}
</script>
