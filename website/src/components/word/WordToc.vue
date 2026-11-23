<template>
  <nav class="c-word-toc" aria-label="Auf dieser Seite">
    <div class="inner">
      <div class="label" aria-hidden="true"><p class="title">Auf dieser Seite</p></div>
      <ol class="list" :style="{ '--toc-progress': progress }">
        <li v-for="(item, i) in items" :key="item.id">
          <a
            class="link"
            :href="`#${item.id}`"
            :aria-current="item.id === current ? 'true' : undefined"
            :data-state="i < currentIndex ? 'done' : undefined"
          >
            <span class="dot" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <span v-if="item.count" class="count">{{ item.count }}</span>
          </a>
        </li>
      </ol>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { initScrollSpy } from "@utils/scrollSpy";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{ items: { id: string; label: string; count?: number }[] }>();

const current = ref(props.items[0]?.id);
const currentIndex = computed(() => props.items.findIndex((i) => i.id === current.value));
// 0..1 along the rail: the orange line grows to the active dot.
const progress = computed(() =>
  props.items.length > 1 ? Math.max(0, currentIndex.value) / (props.items.length - 1) : 0,
);

// Narrow bar: keep the active pill in view. block "nearest" so the page itself never scrolls.
watch(current, async () => {
  await nextTick();
  document
    .querySelector<HTMLElement>(".c-word-toc [aria-current='true']")
    ?.scrollIntoView({ block: "nearest", inline: "nearest" });
});

let stopSpy: () => void = () => {};

onMounted(() => {
  stopSpy = initScrollSpy({
    getSectionId: (link) => link.getAttribute("href")?.slice(1),
    linkSelector: "a",
    navSelector: ".c-word-toc",
    onActivate: (link) => {
      current.value = link.getAttribute("href")?.slice(1) ?? current.value;
    },
    // A band from 20% below the top down to 30% from the bottom: the section being read.
    rootMargin: "-20% 0px -70% 0px",
  });
});

onBeforeUnmount(() => stopSpy());
</script>

<style lang="scss">
@use "@styles/components/word-toc";
</style>
