import Vue from 'vue'
import FloatingVue from 'floating-vue'

Vue.use(FloatingVue, {
  themes: {
    'berliner-schnauze': {
      triggers: ['hover'],
      autoHide: true,
      placement: 'bottom'
    }
  }
})
