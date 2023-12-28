<template>
  <ToastNotify
    v-for="toast in toastStore"
    :id="toast.id"
    :key="toast.id"
    :message="toast.message"
  />
</template>

<script setup lang="ts">
import { reactive, watchEffect, ref, defineAsyncComponent } from "vue";
import ToastNotify from "@components/toast/ToastNotify.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/index";

const toastStore = useStore($toastNotify);
</script>

<style lang="scss">
.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: 0.25s ease all;
}

.toaster {
  &__wrapper {
    position: fixed;
    bottom: 3%;
    right: 5%;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__inner {
    --color: black;

    display: flex;
    align-items: center;
    gap: 1rem;
    border-radius: 0.3rem;
    border: 1px solid transparent;
    background-color: white;
    padding: 1rem 1.5rem;
    border-color: var(--color);
    color: var(--color);

    svg {
      fill: var(--color);
      stroke: var(--color);
    }

    &.success {
      --color: green;
    }

    &.warning {
      --color: orange;
    }

    &.error {
      --color: red;
    }

    &-icon {
      width: 1.8rem;
      aspect-ratio: 1/1;
    }

    &-text {
      font-size: 1.6rem;
      font-weight: 600;
    }
  }
}
</style>
