<template>
  <div id="postContent" class="c-blocks">
    <template v-for="block in blocks" :key="block.order">
      <p
        v-if="block.name === 'core/paragraph'"
        class="c-blocks__paragraph"
        v-html="parse(block.attributesJSON).content"
      />

      <component
        :is="`h${parse(block.attributesJSON).level}`"
        v-if="block.name === 'core/heading'"
        :class="`c-blocks__heading c-blocks__heading--${parse(block.attributesJSON).level}`"
      >
        {{ parse(block.attributesJSON).content }}
      </component>

      <div v-if="block.name === 'core/code'" class="c-blocks__code" v-html="block.originalContent" />

      <figure v-if="block.name === 'core/image'" class="c-blocks__image">
        <img
          :id="parse(block.attributesJSON).id"
          :src="parse(block.attributesJSON).url"
          :alt="parse(block.attributesJSON).alt"
        >
        <figcaption v-if="parse(block.attributesJSON).caption" v-html="parse(block.attributesJSON).caption" />
      </figure>

      <a
        v-if="block.name === 'core/button'"
        :id="parse(block.attributesJSON).anchor"
        :href="parse(block.attributesJSON).url"
        :title="parse(block.attributesJSON).title"
        :target="parse(block.attributesJSON).target"
        :rel="parse(block.attributesJSON).rel"
        :class="`c-blocks__button ${parse(block.attributesJSON).className}`"
      >{{ parse(block.attributesJSON).text }}</a>

      <div v-if="block.name === 'core/html'" v-html="block.originalContent" />
    </template>
  </div>
</template>

<script setup lang="ts">

interface PostBlocksProps {
  blocks: [
    {
      attributesJSON: string;
      name: string;
      order: number;
      originalContent: string;
      innerBlocks: [
        {
          attributesJSON: string;
          name: string;
          order: number;
          originalContent: string;
        }
      ]
    }
  ]
}

const props = defineProps<PostBlocksProps>()

const parse = (str: string) => {
  return JSON.parse(str)
}
</script>

<style scoped></style>
