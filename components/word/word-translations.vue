<template>
  <component :is="wrapperElement" :class="rootBemClass + '__translations'">
    <component :is="elements" v-for="(translation, translationIndex) in translations" :key="translationIndex" :class="rootBemClass + '__translation'">
      {{ translation.translation }}
    </component>
  </component>
</template>

<script>

export default {
  name: 'WordTranslations',

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
      default: null,
      required: true,
      validator: v => typeof v === 'object' || Array.isArray(v) || v === null
    }
  }
}
</script>
