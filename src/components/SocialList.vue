<template>
  <div class="c-social-list" :class="modifier">
    <ul class="c-social-list__list u-list-reset" :class="listModifier">
      <li
        v-for="social in list"
        :key="social.name"
        class="c-social-list__item"
        :class="listItemModifier"
      >
        <a
          :href="social.link"
          :aria-label="social.ariaLabel"
          :title="social.ariaLabel"
          rel="noopener"
          target="_blank"
          class="c-social-list__link"
          :class="listLinkModifier"
        >
          <Github v-if="social.name === 'github'" />
          <Facebook v-if="social.name === 'facebook'" />
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import Facebook from "virtual:icons/lucide/facebook";
import Github from "virtual:icons/lucide/github";

interface SocialListProps {
  listItemModifier?: string;
  listLinkModifier?: string;
  listModifier?: string;
  modifier?: string;
}

const { listItemModifier, listLinkModifier, listModifier, modifier } =
  defineProps<SocialListProps>();

const list = [
  {
    ariaLabel: "Link zum Github Projekt",
    link: "https://github.com/felix-berlin/berliner-schnauze",
    name: "github",
  },
  {
    ariaLabel: "Folge Berliner Schnauze auf Mastodon",
    link: "https://mastodon.social/@berliner_schnauze",
    name: "mastodon",
  },
  {
    ariaLabel: "Folge Berliner Schnauze auf Facebook",
    link: "https://www.facebook.com/Berliner.Schnauze030",
    name: "facebook",
  },
];
</script>

<style lang="scss">
@use "@styles/components/social-list";
</style>
