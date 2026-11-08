<template>
  <dialog
    ref="dialog"
    class="c-lightbox"
    aria-label="Bildansicht"
    @click.self="dialog?.close()"
    @close="restoreFocus"
    @keydown="onKey"
  >
    <template v-if="current">
      <div class="c-lightbox__bar">
        <span>{{ index + 1 }} / {{ images.length }}</span>
        <button class="c-icon-button" type="button" aria-label="Bild schließen" @click="dialog?.close()">
          <IconClose width="22" height="22" aria-hidden="true" />
        </button>
      </div>
      <div class="c-lightbox__stage">
        <button v-if="images.length > 1" class="c-icon-button" type="button" aria-label="Vorheriges Bild" @click="step(-1)">
          <IconPrev width="24" height="24" aria-hidden="true" />
        </button>
        <img :src="current.src" :alt="current.alt" />
        <button v-if="images.length > 1" class="c-icon-button" type="button" aria-label="Nächstes Bild" @click="step(1)">
          <IconNext width="24" height="24" aria-hidden="true" />
        </button>
      </div>
      <!-- credit: CMS rich text turned to HTML by lexicalToHtml (text escaped), or escaped caption text -->
      <p v-if="current.credit" class="c-lightbox__caption">Foto: <span v-html="current.credit" /></p>
    </template>
  </dialog>
</template>

<script setup lang="ts">
import { trackEvent } from "@utils/analytics";
import { useEventListener } from "@vueuse/core";
import { computed, ref, useTemplateRef } from "vue";
import IconClose from "virtual:icons/lucide/x";
import IconNext from "virtual:icons/lucide/chevron-right";
import IconPrev from "virtual:icons/lucide/chevron-left";

const props = defineProps<{ images: { alt: string; credit: string | null; src: string }[] }>();

const dialog = useTemplateRef("dialog");
const index = ref(0);
const current = computed(() => props.images[index.value]);
let opener: HTMLElement | null = null;

const step = (by: number) => {
  index.value = (index.value + by + props.images.length) % props.images.length;
  trackEvent("Lightbox", "Slide switched", "Image Gallery");
};

// The buttons are server-rendered by WordImages.astro (before hydration they do nothing, the page stays usable).
useEventListener(document, "click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-lightbox-index]");
  if (!button) return;
  opener = button;
  index.value = Number(button.dataset.lightboxIndex);
  dialog.value?.showModal();
  trackEvent("Lightbox", "Opened", "Image Gallery");
});

// Native <dialog>: focus trap and Esc come for free; arrows and focus return are ours.
const onKey = (event: KeyboardEvent) => {
  if (event.key === "ArrowRight") step(1);
  else if (event.key === "ArrowLeft") step(-1);
};
const restoreFocus = () => opener?.focus();
</script>

<style lang="scss">
@use "@styles/components/lightbox";
</style>
