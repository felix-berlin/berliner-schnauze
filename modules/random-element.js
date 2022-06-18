import Vue from 'vue'

Vue.prototype.$randomElement = function (elements) {
  return elements[Math.floor(Math.random() * elements.length)]
}
