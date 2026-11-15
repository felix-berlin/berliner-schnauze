<template>
  <div class="done" data-autofocus tabindex="-1" :data-enter="enter">
    <p class="done-title"><strong>Danke fürs Mitmachen!</strong></p>
    <ul v-if="rows.length" class="compare">
      <li v-for="r in rows" :key="r.label">{{ r.label }}: {{ r.share }} % sagen det</li>
    </ul>
    <button class="c-textlink" type="button" @click="emit('reset')">Angaben ändern</button>
    <button class="c-textlink" :disabled="pending" type="button" @click="emit('withdraw')">
      Stimme zurückziehen
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  enter: "back" | "forward" | undefined;
  pending: boolean;
  rows: { label: string; share: number }[];
}>();
const emit = defineEmits<{ reset: []; withdraw: [] }>();
</script>
