<template>
  <DropdownPopover
    placement="bottom-end"
    class="c-options-dropdown c-dropdown--theme-word-options"
  >
    <template #default="{ triggerProps }">
      <button
        v-bind="triggerProps"
        type="button"
        aria-label="Optionen"
        class="c-options-dropdown__options-icon c-button c-button--center-icon"
      >
        <span aria-hidden="true" class="c-icon c-icon--lucide-more-vertical" />
      </button>
    </template>

    <template #panel>
      <slot name="before" />

      <button
        v-if="shareIsSupported"
        aria-label="Wort teilen"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="shareWord(slug ?? '')"
      >
        <Share2 width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Wort teilen</span>
      </button>

      <button
        v-if="clipBoardIsSupported"
        aria-label="Link zum Wort kopieren"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="copyWordPageUrlToClipboard(slug ?? '')"
      >
        <Link width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Link kopieren</span>
      </button>

      <button
        v-if="clipBoardIsSupported"
        aria-label="Wort kopieren"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="copyNameToClipboard(berlinerisch ?? '')"
      >
        <Copy width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Wort kopieren</span>
      </button>

      <button
        aria-label="Fehler melden"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="openFeedbackModal('error')"
      >
        <Flag width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Fehler melden</span>
      </button>

      <button
        aria-label="Inhalt vorschlagen"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="openFeedbackModal('content')"
      >
        <Lightbulb width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Inhalt vorschlagen</span>
      </button>

      <slot name="after" />
    </template>
  </DropdownPopover>
</template>

<script setup lang="ts">
import type { BerlinerWord, WordProperties } from "@/gql/entity-types";

import { open } from "@stores/modal.ts";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { routeToWord } from "@utils/helpers.ts";
import { useClipboard, useShare } from "@vueuse/core";
import { SITE_URL } from "astro:env/client";
import Copy from "virtual:icons/lucide/copy";
import Flag from "virtual:icons/lucide/flag";
import Lightbulb from "virtual:icons/lucide/lightbulb";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import { defineAsyncComponent } from "vue";
import DropdownPopover from "@components/DropdownPopover.vue";

interface WordProps {
  berlinerisch: WordProperties["berlinerisch"];
  slug: BerlinerWord["slug"];
}

const { berlinerisch, slug } = defineProps<WordProps>();

const { copied, copy, isSupported: clipBoardIsSupported, text } = useClipboard();
const { isSupported: shareIsSupported, share } = useShare();

/**
 * Share the word
 *
 * @param   {string}  slug
 *
 * @return  {void}
 */
const shareWord = (slug: string): void => {
  const shareData = {
    text: `Lerne mehr über das Berliner Wort: ${slug}`,
    title: `${slug} - Berliner Schnauze`,
    url: routeToWord(slug),
  };

  share(shareData).catch((err) => err);
  createToastNotify({ message: "Wort geteilt", status: "success" });

  trackEvent("Word Share", "Word shared", `Word: ${slug}`);
};

/**
 * Copy the word page url to the clipboard
 *
 * @param   {string}  slug
 *
 * @return  {void}
 */
const copyWordPageUrlToClipboard = async (slug: string): Promise<void> => {
  await copy(SITE_URL + routeToWord(slug));
  createToastNotify({
    message: "Link kopiert",
    status: "success",
  });

  trackEvent("Word Copy Link", "Word link copied", `Word: ${slug}`);
};

/**
 * Copy the word to the clipboard
 *
 * @param   {string}  name
 *
 * @return  {void}
 */
const copyNameToClipboard = async (name: string): Promise<void> => {
  await copy(name);
  createToastNotify({ message: "Wort kopiert", status: "success" });

  trackEvent("Word Copy", "Word copied", `Word: ${name}`);
};

/**
 * Opens the word feedback modal, preselecting error report or content suggestion
 *
 * @param   {"content" | "error"}  type
 *
 * @return  {void}
 */
const openFeedbackModal = (type: "content" | "error"): void => {
  open({
    view: {
      component: defineAsyncComponent(() => import("@components/word/WordFeedbackForm.vue")),
      props: {
        berlinerWord: berlinerisch ?? undefined,
        slug: slug ?? undefined,
        type,
      },
    },
  });
};
</script>

<style lang="scss">
@use "@styles/components/icons";
@use "@styles/components/options-dropdown";
</style>
