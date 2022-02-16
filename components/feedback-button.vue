<template>
  <component :is="type" :aria-label="buttonAriaLabel" type="button" @click="[onClick(), resetValid()]">
    <span v-show="!valid">
      <slot>Content</slot>
    </span>
    <span v-show="valid">
      <CheckCircle2 />
    </span>
    <span v-show="valid === 'error'">
      <XCircle />
    </span>
  </component>
</template>

<script>
import { CheckCircle2, XCircle } from 'lucide-vue'

export default {
  name: 'FeedbackButton',

  components: {
    CheckCircle2,
    XCircle
  },

  props: {
    buttonAriaLabel: {
      type: String,
      default: ''
    },
    onClick: {
      type: Function,
      required: true
    },
    validateAction: {
      type: Boolean,
      required: true,
      default: false
    }
  },

  data () {
    return {
      valid: false,
      type: 'button'
    }
  },

  mounted () {

  },

  methods: {
    resetValid () {
      this.valid = this.validateAction
      setTimeout(() => {
        this.valid = false
      }, 1500)
    }
  }
}
</script>
