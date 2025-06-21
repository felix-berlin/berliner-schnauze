<template>
  <button
    class="c-button"
    :disabled="computedState === 'loading'"
    :class="`c-button--${computedState}`"
  >
    <Transition name="fade" mode="out-in">
      <span :key="computedState">
        <template v-if="computedState === 'normal'">
          <slot>Button</slot>
        </template>
        <template v-else-if="computedState === 'success'">
          <slot name="success">
            <Check
              :width="defaultIconSize"
              :height="defaultIconSize"
              aria-label="Aktion erfolgreich"
            />
          </slot>
        </template>
        <template v-else-if="computedState === 'loading'">
          <slot name="loading">Loading</slot>
        </template>
        <template v-else-if="computedState === 'error'">
          <slot name="error">
            <X :width="defaultIconSize" :height="defaultIconSize" aria-label="Fehler" />
          </slot>
        </template>
      </span>
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";

const Check = defineAsyncComponent(() => import("virtual:icons/lucide/check"));
const X = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

type ButtonState = "error" | "loading" | "normal" | "success";

const { defaultIconSize = 18, state = "normal" } = defineProps<{
  defaultIconSize?: number;
  state?: ButtonState;
}>();

const computedState = computed(() => state);
</script>
