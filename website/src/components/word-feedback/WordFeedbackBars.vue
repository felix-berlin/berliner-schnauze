<template>
  <div aria-live="polite">
    <div v-if="bars" class="bars">
      <div
        v-for="b in bars"
        :key="b.value"
        class="bar"
        :data-state="b.value === selected ? 'mine' : undefined"
      >
        <span class="bar-label">
          {{ b.label }}<template v-if="b.value === selected"> · deine Antwort</template>
        </span>
        <span class="bar-value">{{ b.percent }} % · {{ b.text }}</span>
        <span class="bar-track" aria-hidden="true">
          <span class="bar-fill" :style="{ inlineSize: `${b.percent}%` }" />
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The result bars of the vote; `bars` is null while the state is not loaded.
defineProps<{
  bars: { label: string; percent: number; text: string; value: string }[] | null;
  selected: string | null | undefined;
}>();
</script>
