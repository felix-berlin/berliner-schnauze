<template>
  <dialog
    :id="uid"
    ref="modal"
    class="c-modal"
    :class="[`c-modal--${position}`, { 'has-close-on-click-outside': closeOnClickOutside }]"
  >
    <div class="c-modal__container">
      <button
        v-if="showCloseButton"
        class="c-modal__close c-button c-button--center-icon"
        type="submit"
        aria-label="schließen"
        @click="closeModal"
      >
        <X />
      </button>

      <slot />
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, useTemplateRef } from "vue";
import X from "virtual:icons/lucide/x";

export interface ModalProps {
  uid?: string;
  open?: boolean;
  showCloseButton?: boolean;
  disableScroll?: boolean;
  closeOnClickOutside?: boolean;
  transition?: string | "slide-fade-right" | "fade";
  position?: "center" | "top" | "bottom";
}

const {
  uid = crypto.randomUUID(),
  open = false,
  showCloseButton = true,
  disableScroll = false,
  closeOnClickOutside = true,
  position = "center",
} = defineProps<ModalProps>();

const modal = useTemplateRef("modal");
const emit = defineEmits(["close", "open", "mounted"]);
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

  emit("mounted");
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
