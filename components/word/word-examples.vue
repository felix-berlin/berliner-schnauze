<template>
  <component :is="element" v-if="examples" :class="rootBemClass + '__example-wrapper'">
    <Quote :size="44" :stroke-width="0" :class="rootBemClass + '__quote-icon'" />

    <div :class="rootBemClass + '__example-single-wrapper'">
      <p
        v-if="examples && examples.length === 1"
        :class="rootBemClass + '__example'"
        v-text="examples[0].example"
      />

      <p
        v-if="examples && examples.length === 1 && examples[0].example_explanation"
        :class="rootBemClass + '__example-explanation'"
        v-text="'– ' + examples[0].example_explanation"
      />
    </div>

    <!-- If more than one example exist -->
    <ol v-if="examples && examples.length > 1" :class="rootBemClass + '__examples'">
      <li v-for="(item, exampleIndex) in examples" :key="exampleIndex" :class="rootBemClass + '__examples-list-item'">
        <span :class="rootBemClass + '__examples-item'">{{ item.example }}</span>
        <div v-if="item.example_explanation" :class="rootBemClass + '__examples-explanation'">
          – {{ item.example_explanation }}
        </div>
      </li>
    </ol>
  </component>
</template>

<script>
import { Quote } from 'lucide-vue'

export default {
  name: 'WordExamples',

  components: {
    Quote
  },

  props: {
    element: {
      type: String,
      default: 'div'
    },
    rootBemClass: {
      type: String,
      default: 'c-word-list'
    },
    examples: {
      type: [Object, Array, Boolean, null],
      default: null,
      required: true
    }
  }
}
</script>
