<script setup lang="ts">
import BerlinerBaer, { type BearMood } from './BerlinerBaer.vue'
const moods: BearMood[] = ['idle','relaxed','wave','nod','shake','thumbs-up','point','dismiss','shush','look','listen','think','blank','cheer','facepalm','scare','scratch','yawn','doze','nap','roar','dance','eat','beer','gangster','follow']
</script>
<template>
  <section v-for="t in ['light','dark']" :key="t" :data-theme="t" class="row">
    <div class="grid">
      <figure v-for="s in moods" :key="s"><BerlinerBaer :mood="s" :size="120" :calm="false" /><figcaption>{{ s }}</figcaption></figure>
    </div>
    <div class="sizes">
      <BerlinerBaer mood="wave" :size="260" disc label="Kalle winkt" />
      <BerlinerBaer mood="gangster" :size="260" />
      <BerlinerBaer mood="beer" :size="88" />
      <BerlinerBaer mood="gangster" :size="88" />
      <BerlinerBaer mood="idle" :size="56" />
      <BerlinerBaer mood="idle" :size="32" />
      <BerlinerBaer mood="idle" variant="peek" :size="160" />
    </div>
  </section>
</template>
<style>
body{font-family:sans-serif}
.row{background:var(--color-background-body);color:var(--color-body);padding:16px}
.grid{display:grid;grid-template-columns:repeat(13,1fr);gap:4px}
figure{margin:0;display:flex;flex-direction:column;align-items:center;font-size:11px}
.sizes{display:flex;align-items:flex-end;gap:24px;margin-top:12px}
</style>
