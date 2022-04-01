import Vue from 'vue'

/**
 * Scroll smooth to a element with offset
 *
 * @param   {Node}  element        The element where to scroll
 * @param   {Number}  elementOffset  positive or negative offset
 */
Vue.prototype.$smoothScrollTo = function (element, elementOffset = 0) {
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - elementOffset

  window.scrollTo({ top: elementPosition, behavior: 'smooth' })
}
