<template>
  <ul :class="rootBemClass + '__translations'">
    <li v-for="(translation, translationIndex) in translations" :key="translationIndex" :class="rootBemClass + '__translation-item'">
      <dd :class="rootBemClass + '__translation'">
        {{ translation.translation }}
      </dd>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'WordTranslations',

  props: {
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
