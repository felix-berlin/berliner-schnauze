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
        <a
          v-if="isLinkItem(item)"
          :href="item.link"
          :rel="item?.rel ? item.rel : undefined"
          :target="isExternalLink(item.link) ? '_blank' : '_self'"
          v-text="item.title"
        />
        <component :is="item.component" v-else-if="isComponentItem(item)" v-bind="item.props" />
      </li>
      <slot name="after" />
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { Component } from "vue";

interface ComponentItem {
  component: Component;
  props?: Record<string, unknown>;
}


interface ItemObject {
  link: string;
  rel?: string;
  title: string;
}


interface NavListProps {
  classesLi?: string;
  classesNav?: string;
  classesUl?: string;
  items: (ComponentItem | ItemObject)[];
}


const { classesLi = "", classesNav = "", classesUl = "" } = defineProps<NavListProps>();


const isLinkItem = (item: ComponentItem | ItemObject): item is ItemObject => {
  return "link" in item;
};


const isComponentItem = (item: ComponentItem | ItemObject): item is ComponentItem => {
  return "component" in item;
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
