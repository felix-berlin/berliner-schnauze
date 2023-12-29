<template>
  <ToastNotify
    v-for="toast in toastStore"
    :id="toast.id"
    :key="toast.id"
    :status="toast?.status"
    :message="toast.message"
    :show-status-icon="toast?.showStatusIcon"
    :position="toast?.position"
    :show-close="toast?.showClose"
    :close-on-swipe="toast?.closeOnSwipe"
    :outer-spacing="toast?.outerSpacing"
    :gap-between="toast?.gapBetween"
    :init-offset="toast?.initOffset"
  />
</template>

<script setup lang="ts">
import ToastNotify from "@components/toast/ToastNotify.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/index";

const toastStore = useStore($toastNotify);
</script>

<style lang="scss"></style>
