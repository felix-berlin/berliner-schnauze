<template>
  <nav class="c-nav-list" :class="classesNav">
    <ul class="c-nav-list__list" :class="classesUl">
      <slot name="before" />
      <li
        v-for="(item, index) in items"
        :key="index"
        class="c-nav-list__list-item"
        :class="classesLi"
      >
        <component :is="item" v-if="isVueComponent(item)" />
        <a
          v-else
          :href="item.link"
          :target="isExternalLink(item.link) ? '_blank' : '_self'"
          v-text="item.title"
        />
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
}

interface NavListProps {
  items: (ItemObject | DefineComponent)[];
  classesNav?: string;
  classesUl?: string;
  classesLi?: string;
}

const { items } = defineProps<NavListProps>();

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
