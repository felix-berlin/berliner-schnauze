<template>
  <component :is="wrapperElement" :class="rootBemClass + '__translations'">
    <component :is="elements" v-for="(translation, translationIndex) in translations" :key="translationIndex" class="c-word-list__translation">
      {{ translation.translation }}
    </component>
  </component>
</template>

<script>
import { Quote } from 'lucide-vue'

export default {
  name: 'WordTranslations',

  components: {
    Quote
  },

  props: {
    wrapperElement: {
      type: String,
      default: 'div'
    },
    elements: {
      type: String,
      default: 'p'
    },
    rootBemClass: {
      type: String,
      required: true
    },
    translations: {
      type: [Object, Array],
      default: null,
      required: true
    }
  }
}
</script>
