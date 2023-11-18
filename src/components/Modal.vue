<template>
  <dialog :id="uidHelper('modal')" ref="modal" class="c-modal" :class="[`c-modal--${position}`]">
    <button
      v-if="showCloseButton"
      class="c-modal__close c-button c-button--theme c-button--center-icon"
      type="submit"
      aria-label="schließen"
      @click="closeModal"
    >
      <X />
    </button>

    <slot />
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue";
import X from "virtual:icons/lucide/x";

export interface ModalProps {
  uid: string;
  open?: boolean;
  showCloseButton?: boolean;
  disableScroll?: boolean;
  closeOnClickOutside?: boolean;
  transition?: string | "slide-fade-right" | "fade";
  position?: "center" | "top" | "bottom";
}

const {
  uid,
  open = false,
  showCloseButton = true,
  disableScroll = false,
  closeOnClickOutside = true,
  position = "center",
} = defineProps<ModalProps>();

const modal = ref<HTMLDialogElement | null>(null);
const emit = defineEmits(["close", "open"]);
const isVisible = ref(open);

/**
 * Open the modal
 *
 * @return  {void}
 */
const openModal = (): void => {
  modal?.value?.showModal();
  isVisible.value = true;
  emit("open");
  preventScroll(true);
};

/**
 * Close the modal
 *
 * @return  {void}
 */
const closeModal = (): void => {
  modal?.value?.close();
  isVisible.value = false;
  emit("close");
  preventScroll(false);
};

/**
 * Generate a unique id for the modal
 *
 * @param   {string}  id  Name of the HTML ID
 *
 * @return  {string}      Unique ID
 */
const uidHelper = (id: string): string => {
  return `${id}-${uid}`;
};

/**
 * Toggle disable scroll on body
 *
 * @param   {boolean}  status  yes/no
 *
 * @return  {void}
 */
const preventScroll = (status: boolean): void => {
  if (disableScroll && status) document.body.classList.add("u-disable-scroll");
  if (disableScroll && !status) document.body.classList.remove("u-disable-scroll");
};

/**
 * Close the modal when clicking outside of it
 *
 * @param   {MouseEvent}  event  Click event
 *
 * @return  {void}
 */
const onClickOutside = (event: MouseEvent): void => {
  if (event.target === modal.value) closeModal();
};

onMounted(() => {
  if (closeOnClickOutside) modal.value?.addEventListener("click", onClickOutside);

  modal.value?.addEventListener("close", () => closeModal());
});

onUnmounted(() => {
  if (closeOnClickOutside) modal.value?.removeEventListener("click", onClickOutside);

  modal.value?.removeEventListener("close", () => closeModal());
});

watch(
  () => open,
  (value) => {
    if (value) openModal();
    if (!value) closeModal();
  },
);
</script>

<style lang="scss">
@use "@styles/components/modal";
</style>
