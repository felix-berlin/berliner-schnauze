<script setup lang="ts">
import BerlinerBaer, { type BaerStimmung } from './BerlinerBaer.vue'
const stimmungen: BaerStimmung[] = ['idle','locker','winken','nicken','nee','daumen','zeigen','abwinken','pst','kieken','lauschen','denken','nuescht','jubeln','facepalm','schreck','kratzen','gaehnen','einnicken','pennen','schnauze','tanzen','futtern','pils','ganove','folgen']
</script>
<template>
  <section v-for="t in ['light','dark']" :key="t" :data-theme="t" class="row">
    <div class="grid">
      <figure v-for="s in stimmungen" :key="s"><BerlinerBaer :stimmung="s" :groesse="120" :ruhig="false" /><figcaption>{{ s }}</figcaption></figure>
    </div>
    <div class="sizes">
      <BerlinerBaer stimmung="winken" :groesse="260" scheibe label="Kalle winkt" />
      <BerlinerBaer stimmung="ganove" :groesse="260" />
      <BerlinerBaer stimmung="pils" :groesse="88" />
      <BerlinerBaer stimmung="ganove" :groesse="88" />
      <BerlinerBaer stimmung="idle" :groesse="56" />
      <BerlinerBaer stimmung="idle" :groesse="32" />
      <BerlinerBaer stimmung="idle" variante="lugen" :groesse="160" />
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
