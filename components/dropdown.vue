<template>
  <section class="c-dropdown" :class="modifier">
    <button
      ref="menuButton"
      type="button"
      class="c-dropdown__button c-button"
      :aria-label="buttonAriaLabel"
      :class="buttonModifier"
      @click="openClose"
    >
      <slot name="title">
        Dropdown
      </slot>
    </button>

    <transition :name="transition">
      <section v-if="isOpen" ref="menuContent" class="c-dropdown__menu" :class="menuModifier">
        <slot name="content" />
      </section>
    </transition>
  </section>
</template>

<script>
export default {
  name: 'DropdownMenu',

  props: {
    modifier: {
      type: String,
      default: ''
    },
    buttonModifier: {
      type: String,
      default: ''
    },
    menuModifier: {
      type: String,
      default: ''
    },
    transition: {
      type: String,
      default: 'fade'
    },
    buttonAriaLabel: {
      type: String,
      default: ''
    }
  },

  data () {
    return {
      isOpen: false
    }
  },

  methods: {
    openClose () {
      const self = this
      const closeListerner = (e) => {
        // Check if user clicks outside of the menu
        // true — close the menu and remove EventListener
        if (self.catchOutsideClick(e, self.$refs.menuButton)) {
          window.removeEventListener('click', closeListerner)
          self.isOpen = false
        }
      }
      // Add event listener to watch clicks outside the menu
      window.addEventListener('click', closeListerner)
      // Close if open and vice versa
      this.isOpen = !this.isOpen
    },
    catchOutsideClick (event, dropdown) {
      // When user clicks menu — do nothing
      if (dropdown === event.target) { return false }
      // When user clicks outside of the menu — close the menu
      if (this.isOpen && dropdown !== event.target) { return true }
    }
  }
}
</script>
