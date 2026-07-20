<template>
  <nav class="c-nav-list" :class="classesNav" :aria-label="ariaLabel">
    <ul class="c-nav-list__list" :class="classesUl">
      <slot name="before" />
      <li
        v-for="(item, index) in items"
        :key="index"
        class="c-nav-list__list-item"
        :class="typeof classesLi === 'function' ? classesLi(item, index) : classesLi"
      >
        <a
          v-if="'link' in item"
          :href="item.link"
          :rel="item.rel"
          :target="isExternalLink(item.link) ? '_blank' : '_self'"
          v-text="item.title"
        />
        <component :is="item.component" v-else v-bind="item.props" />
      </li>
      <slot name="after" />
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { DefineComponent } from "vue";

interface ItemObject {
  link: string;
  title: string;
  rel?: string;
}

type NavListItem = ItemObject | { component: DefineComponent; props: object };

interface NavListProps {
  ariaLabel?: string;
  classesLi?: string | ((item: NavListItem, index: number) => string);
  classesNav?: string;
  classesUl?: string;
  items: NavListItem[];
}

const { items, ariaLabel } = defineProps<NavListProps>();

/**
 * Checks if the item is a Vue component
 *
 * @param   {DefineComponent}  item
 *
 * @return  {item}
 */
const isVueComponent = (item: DefineComponent | ItemObject): item is DefineComponent => {
  return (
    {}.propertyIsEnumerable.call(item, "render") ||
    {}.propertyIsEnumerable.call(item, "setup") ||
    {}.propertyIsEnumerable.call(item, "components")
  );
};

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

<style scoped></style>
