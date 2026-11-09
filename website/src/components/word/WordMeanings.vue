<template>
  <div class="c-word-meanings">
    <p class="t-label">{{ meanings.length === 1 ? "Bedeutung" : "Bedeutungen" }}</p>
    <p v-if="meanings.length === 1" class="t-em c-word-meanings__single">{{ meanings[0] }}</p>
    <ol v-else :id="listId" class="c-meanings">
      <li v-for="(m, i) in split.visible" :key="i" class="t-em">{{ m }}</li>
      <li
        v-for="(m, i) in split.hidden"
        :key="`h${i}`"
        :ref="(el) => i === 0 && (firstHidden = el as HTMLElement | null)"
        :hidden="!open"
        class="t-em"
        tabindex="-1"
      >
        {{ m }}
      </li>
    </ol>
    <button
      v-if="split.hidden.length > 0 && !open"
      :aria-controls="listId"
      aria-expanded="false"
      class="c-textlink c-word-meanings__more"
      type="button"
      @click="showAll"
    >
      Alle {{ meanings.length }} Bedeutungen zeigen
    </button>
  </div>
</template>

<script setup lang="ts">
import { splitMeanings } from "@utils/wordMeanings";
import { computed, nextTick, ref, useId } from "vue";

const props = defineProps<{ meanings: string[] }>();

const listId = `meanings-${useId()}`;
const split = computed(() => splitMeanings(props.meanings));
const open = ref(false);
const firstHidden = ref<HTMLElement | null>(null);

// The button is gone once everything is shown (no collapsing back): move focus to the first new line.
const showAll = async () => {
  open.value = true;
  await nextTick();
  firstHidden.value?.focus();
};
</script>
