<template>
  <div :id="id" class="pswp-gallery">
    <a
      v-for="(image, key) in images"
      :key="key"
      :href="image.image.preferred.url"
      :data-pswp-width="image.image.preferred.width"
      :data-pswp-height="image.image.preferred.height"
      target="_blank"
      rel="noreferrer"
      aria-label="Bild in Originalgröße öffnen"
    >
      <img :src="image.image.preferred.url" alt="" />
    </a>
  </div>
</template>

<script setup lang="ts">
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { onMounted, onUnmounted, ref } from "vue";

type ImageGalleryProps = {
  id: string;
  images: string[];
};

const { id = crypto.randomUUID(), images } = defineProps<ImageGalleryProps>();

const lightbox = ref<null | PhotoSwipeLightbox>(null);

onMounted(() => {
  if (!lightbox.value) {
    lightbox.value = new PhotoSwipeLightbox({
      childSelector: "a",
      gallerySelector: `#${id}`,
      pswpModule: () => import("photoswipe"),
    });
  }

  lightbox.value.init();
});

onUnmounted(() => {
  if (lightbox.value) {
    lightbox.value.destroy();
    lightbox.value = null;
  }
});
</script>

<style scoped></style>
