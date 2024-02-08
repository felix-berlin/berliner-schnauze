<template>
  <div class="pswp-gallery">
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
  images: string[];
};

const { images } = defineProps<ImageGalleryProps>();

const lightbox = ref<PhotoSwipeLightbox | null>(null);

onMounted(() => {
  if (!lightbox.value) {
    lightbox.value = new PhotoSwipeLightbox({
      gallerySelector: ".pswp-gallery",
      childSelector: "a",
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
