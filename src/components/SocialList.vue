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
import Github from "virtual:icons/lucide/github";
import Facebook from "virtual:icons/lucide/facebook";

interface SocialListProps {
  modifier?: string;
  listModifier?: string;
  listLinkModifier?: string;
  listItemModifier?: string;
}

const { modifier, listModifier, listLinkModifier, listItemModifier } =
  defineProps<SocialListProps>();

const list = [
  {
    name: "github",
    link: "https://github.com/felix-berlin/berliner-schnauze",
    ariaLabel: "Link zum Github Projekt",
  },
  {
    name: "mastodon",
    link: "https://mastodon.social/@berliner_schnauze",
    ariaLabel: "Folge Berliner Schnauze auf Mastodon",
  },
  {
    name: "facebook",
    link: "https://www.facebook.com/Berliner.Schnauze030",
    ariaLabel: "Folge Berliner Schnauze auf Facebook",
  },
];
</script>

<style lang="scss">
@use "@styles/components/social-list";
</style>
