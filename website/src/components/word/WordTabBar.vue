<template>
  <nav ref="nav" class="c-word-tabbar" aria-label="Inhalt der Wortseite">
    <a v-for="section in sections" :key="section.id" class="c-word-tabbar__tab" :href="`#${section.id}`">
      {{ section.label }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { initScrollSpy, rootMarginBelowHeader } from "@utils/scrollSpy";
import { onMounted, useTemplateRef } from "vue";

defineProps<{ sections: { id: string; label: string }[] }>();

const nav = useTemplateRef<HTMLElement>("nav");

onMounted(() => {
  initScrollSpy({
    activeClass: "is-active",
    getSectionId: (link) => link.getAttribute("href")?.slice(1),
    linkSelector: ".c-word-tabbar__tab",
    navSelector: ".c-word-tabbar",
    onActivate: (link, bar) => {
      nav.value?.querySelectorAll("[aria-current]").forEach((el) => el.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "true");
      bar.scrollLeft = link.offsetLeft - bar.offsetWidth / 2 + link.offsetWidth / 2;
    },
    rootMargin: rootMarginBelowHeader(64),
  });
});
</script>

<style lang="scss">
@use "@styles/components/word-tabbar";
</style>
