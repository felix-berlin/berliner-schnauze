<template>
  <a
    class="c-carbon-badge"
    :href="url"
  >
    <Leaf
      width="16"
      height="16"
    />
    <span v-text="text" />
  </a>
</template>

<script setup lang="ts">
import Leaf from "virtual:icons/lucide/leaf";

interface GreenHostedProps {
  text?: string;
  url?: string;
}

const {
  text = "umweltschonend",
  url = "https://www.websitecarbon.com/website/berliner-schnauze-wtf/",
} = defineProps<GreenHostedProps>();
</script>

<style lang="scss">
@use "@styles/components/carbon-badge";
</style>
