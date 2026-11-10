<template>
  <nav ref="nav" class="c-word-tabbar" aria-label="Inhalt der Wortseite">
    <a v-for="section in sections" :key="section.id" class="c-word-tabbar__tab" :href="`#${section.id}`">
      {{ section.label }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { initHeaderScrollSpy } from "@utils/scrollSpy";
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

defineProps<{ sections: { id: string; label: string }[] }>();

const nav = useTemplateRef<HTMLElement>("nav");

let stopSpy: (() => void) | undefined;
onBeforeUnmount(() => stopSpy?.());
onMounted(() => {
  stopSpy = initHeaderScrollSpy({
    activeClass: "is-active",
    getSectionId: (link) => link.getAttribute("href")?.slice(1),
    linkSelector: ".c-word-tabbar__tab",
    navSelector: ".c-word-tabbar",
    onActivate: (link, bar) => {
      nav.value?.querySelectorAll("[aria-current]").forEach((el) => el.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "true");
      bar.scrollLeft = link.offsetLeft - bar.offsetWidth / 2 + link.offsetWidth / 2;
    },
  });
});
</script>

<style lang="scss">
@use "@styles/components/word-tabbar";
</style>
