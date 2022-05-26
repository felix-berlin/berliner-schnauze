<template>
  <component :is="elements">
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
    translation: {
      type: Object,
      required: true
      // validator: v => typeof v === 'object' || Array.isArray(v) || v === null
    }
  }
}
</script>
