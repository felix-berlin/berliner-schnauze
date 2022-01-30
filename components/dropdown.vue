<template>
  <section class="c-dropdown" :class="modifier">
    <button ref="menu" type="button" class="c-dropdown__button" :class="buttonModifier" @click="openClose">
      <slot name="title" style="pointer-events: none;">
        Dropdown
      </slot>
    </button>

    <transition :name="transition">
      <section v-show="isOpen" class="c-dropdown__menu" :class="menuModifier">
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
        if (self.catchOutsideClick(e, self.$refs.menu)) {
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
