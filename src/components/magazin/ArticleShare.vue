<template>
  <button
    class="c-button c-button--center-icon c-magazin-article__share"
    type="button"
    @click="shareArticle"
  >
    <component :is="icon" aria-hidden="true" />
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { useClipboard, useShare } from "@vueuse/core";
import { SITE_URL } from "astro:env/client";
import { computed } from "vue";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";

const { title, url } = defineProps<{ title: string; url: string }>();

const { copy } = useClipboard();
const { isSupported: shareIsSupported, share } = useShare();

const icon = computed(() => (shareIsSupported.value ? Share2 : Link));
const label = computed(() => (shareIsSupported.value ? "Teilen" : "Link kopieren"));

const shareArticle = async (): Promise<void> => {
  const fullUrl = SITE_URL + url;

  if (shareIsSupported.value) {
    share({ title: `${title} – Berliner Schnauze`, url: fullUrl }).catch((err) => err);
  } else {
    await copy(fullUrl);
    createToastNotify({ message: "Link kopiert, teil ma!", status: "success" });
  }

  trackEvent("Magazin Share", "Article shared", title);
};
</script>

<style lang="scss">
@use "@styles/components/magazin-article";
</style>
