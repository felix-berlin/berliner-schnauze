<template>
  <component :is="elements" :class="bemClass">
    {{ translation.translation }}
  </component>
</template>

<script>

export default {
  name: 'WordTranslations',

  props: {
    elements: {
      type: String,
      default: 'p'
    },
    bemClass: {
      type: String,
      required: true
    },
    translation: {
      type: Object,
      required: true
      // validator: v => typeof v === 'object' || Array.isArray(v) || v === null
    }
  }
}
</script>
