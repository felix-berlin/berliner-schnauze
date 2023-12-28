<template>
  <ToastNotify
    v-for="toast in toastStore"
    :id="toast.id"
    :key="toast.id"
    :message="toast.message"
    :status="toast.status"
  />
</template>

<script setup lang="ts">
import ToastNotify from "@components/toast/ToastNotify.vue";
import { useStore } from "@nanostores/vue";
import { $toastNotify } from "@stores/index";

const toastStore = useStore($toastNotify);
</script>

<style lang="scss"></style>
