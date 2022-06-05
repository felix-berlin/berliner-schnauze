import Vue from 'vue'
import FloatingVue, { options } from 'floating-vue'

const themes = {
  'word-options': {
    $extend: 'dropdown',
    triggers: ['click'],
    autoHide: true,
    placement: 'bottom'
  }
}

options.themes = { ...themes, ...options.themes }
Vue.use(FloatingVue)
