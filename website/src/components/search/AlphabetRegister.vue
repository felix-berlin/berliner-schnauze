<template>
  <nav class="c-alphabet-register" aria-label="Springen zu Buchstabe">
    <p class="intro">
      <span class="label">Springen zu</span>
      <span>Alle Wörter von A bis Z. Die Zahl zeigt, wie viele mit dem Buchstaben anfangen.</span>
    </p>
    <ul>
      <li v-for="l in letters" :key="l.letter">
        <a
          v-if="l.count"
          :href="`/wort?buchstabe=${encodeURIComponent(l.letter.toLocaleLowerCase('de'))}`"
          :aria-current="current === l.letter ? 'true' : undefined"
          @click.prevent="emit('jump', l.letter)"
        >
          <!-- Name „B, 498 Wörter“ (SPEC §6.4) from the content: an aria-label would not contain the visible „B498“. -->
          <b>{{ l.letter }}</b><span class="u-sr-only">, </span
          ><small>{{ l.count.toLocaleString("de") }}</small><span class="u-sr-only"> Wörter</span>
        </a>
        <span v-else :aria-label="`${l.letter}, 0 Wörter`" role="img">
          <b>{{ l.letter }}</b><small>0</small>
        </span>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ letters: { letter: string; count: number }[]; current?: string }>();
const emit = defineEmits<{ jump: [letter: string] }>();
</script>

<style lang="scss">
@use "@styles/components/alphabet-register";
</style>
