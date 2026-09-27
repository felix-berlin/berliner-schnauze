<template>
  <nav class="c-nav-list" :class="classesNav" :aria-label="ariaLabel">
    <ul class="c-nav-list__list" :class="classesUl">
      <slot name="before" />
      <li
        v-for="(item, index) in items"
        :key="index"
        class="c-nav-list__list-item"
        :class="classesLi"
      >
        <a
          :href="item.link"
          :rel="item.rel"
          :target="isExternalLink(item.link) ? '_blank' : '_self'"
          v-text="item.title"
        />
      </li>
      <slot name="after" />
    </ul>
  </nav>
</template>

<script setup lang="ts">
interface NavListItem {
  link: string;
  title: string;
  rel?: string;
}

interface NavListProps {
  ariaLabel?: string;
  classesLi?: string;
  classesNav?: string;
  classesUl?: string;
  items: NavListItem[];
}

const { items, ariaLabel } = defineProps<NavListProps>();

/**
 * Checks if the link is an external link
 *
 * @param   {string}   link
 *
 * @return  {boolean}
 */
const isExternalLink = (link: string): boolean => {
  return link.startsWith("http://") || link.startsWith("https://");
};
</script>
