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

/**
 * Returns a random element from an array
 *
 * @param   {Array}  elements
 *
 * @return  {Object|String|Array} random element
 */
Vue.prototype.$randomElement = function (elements) {
  return elements[Math.floor(Math.random() * elements.length)]
}

/**
 * Returns relative or absolute path to word
 *
 * @param   {String}  slug      Word slug
 * @param   {Boolean}  fullPath  If true, returns absolute path
 *
 * @return  {String} relative or absolute path to word
 */
Vue.prototype.$routeToWord = function (slug, fullPath = false) {
  if (fullPath) {
    return window.location.protocol + '//' + window.location.hostname + '/word/' + slug
  }
  return '/word/' + slug
}
