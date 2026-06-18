<template>
  <ToastNotify
    v-for="toast in toastStore"
    :id="toast.id"
    :key="toast.id"
    :action-label="toast?.actionLabel"
    :close-on-swipe="toast?.closeOnSwipe"
    :gap-between="toast?.gapBetween"
    :init-offset="toast?.initOffset"
    :message="toast.message"
    :on-action="toast?.onAction"
    :outer-spacing="toast?.outerSpacing"
    :position="toast?.position"
    :show-close="toast?.showClose"
    :show-status-icon="toast?.showStatusIcon"
    :status="toast?.status"
  />
</template>

<script setup lang="ts">
import ToastNotify from "@components/toast/ToastNotify.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/toastNotify.ts";

const toastStore = useStore($toastNotify);
</script>

<style lang="scss"></style>
