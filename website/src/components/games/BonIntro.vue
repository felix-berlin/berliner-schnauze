<template>
  <div class="c-bon-intro">
    <section class="c-bon-intro__main" aria-labelledby="bon-title">
      <BonPlayerCode v-if="linkRedeem" />
      <p class="t-label">Spiel</p>
      <h1 id="bon-title" class="c-band c-bon-intro__title">Berliner oder nicht?</h1>
      <p class="t-em c-bon-intro__lead">
        Echtes Berlinerisch – oder erfunden oder Hochdeutsch? Wisch oder tipp – du hast 3 Leben.
      </p>

      <div v-if="offline" class="c-state c-state--offline" role="status">
        <WifiOffIcon width="18" height="18" aria-hidden="true" />
        <span class="c-state__body">
          <b>Du bist offline.</b>
          <span>Die Karten kommen vom Server – spielen jeht wieder, sobald du Netz hast.</span>
        </span>
      </div>

      <form class="c-bon-intro__form" @submit.prevent="start">
        <div class="c-bon-intro__name">
          <label for="bon-name" class="c-label">
            Dein Name <span class="c-bon-intro__optional">(optional)</span>
          </label>
          <input
            id="bon-name"
            v-model="name"
            class="c-input"
            type="text"
            maxlength="24"
            placeholder="Anonym"
            autocomplete="nickname"
            aria-describedby="bon-name-hint"
          />
          <span id="bon-name-hint" class="t-small">
            Steht neben deiner Platzierung. Leer jelassen = „Anonym“ mit Kennung, z. B. „Anonym
            #K7QX“. Max. 24 Zeichen.
          </span>
        </div>
        <div class="c-bon-intro__start">
          <button
            class="c-button c-button--primary c-bon-intro__cta"
            type="submit"
            :aria-disabled="offline ? 'true' : undefined"
          >
            Los jeht’s
          </button>
          <span v-if="highScore > 0" class="t-small">
            Dein Rekord: <b class="c-bon-intro__record">{{ highScore }} Punkte</b>
          </span>
        </div>
      </form>

      <BonPlayerCode v-if="redeeming" mode="redeem" @close="redeeming = false" />
      <button
        v-else-if="!linkRedeem"
        class="c-textlink c-bon-intro__redeem"
        type="button"
        @click="redeeming = true"
      >
        Spielercode einlösen
      </button>
    </section>

    <aside class="c-section-card c-bon-intro__rules" aria-labelledby="bon-rules-title">
      <div class="c-section-card__header c-bon-intro__rules-header">
        <h2 id="bon-rules-title" class="c-section-card__title">So jeht’s</h2>
      </div>
      <div class="c-section-card__body">
        <ul class="c-bon-intro__list">
          <li>
            <RowsIcon width="22" height="22" aria-hidden="true" />
            <span>
              <b>Wort lesen, entscheiden.</b><br />
              <span class="t-small">
                Nach rechts wischen oder „Ja“ = Berlinerisch, nach links oder „Nee“ = erfunden oder
                Hochdeutsch. Am Rechner gehen auch die Pfeiltasten.
              </span>
            </span>
          </li>
          <li>
            <HeartIcon width="22" height="22" aria-hidden="true" />
            <span>
              <b>3 Leben.</b><br />
              <span class="t-small">Beim dritten Fehler is Schluss.</span>
            </span>
          </li>
          <li>
            <FlameIcon width="22" height="22" aria-hidden="true" />
            <span>
              <b>Serie zahlt sich aus.</b><br />
              <span class="t-small">10 Punkte pro richtije Antwort, mal Multiplikator:</span>
              <span class="c-bon-intro__track">
                <span>×1</span><span>ab 3 · ×2</span><span>ab 6 · ×3</span><span>ab 10 · ×5</span>
              </span>
            </span>
          </li>
        </ul>
        <p class="t-small c-bon-intro__tip">
          Tipp: Manche Wörter sind Abkürzungen für ’ne Redewendung – nich imma zu wörtlich nehmen.
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import BonPlayerCode from "@components/games/BonPlayerCode.vue";
import { $bonStats } from "@stores/bonStats";
import FlameIcon from "virtual:icons/lucide/flame";
import HeartIcon from "virtual:icons/lucide/heart";
import RowsIcon from "virtual:icons/lucide/rows-2";
import WifiOffIcon from "virtual:icons/lucide/wifi-off";
import { ref } from "vue";

const props = defineProps<{ highScore: number; offline: boolean; linkRedeem: boolean }>();
const emit = defineEmits<{ start: [name: string] }>();

const name = ref($bonStats.get().playerName ?? "");
const redeeming = ref(false);

function start() {
  if (props.offline) return;
  const trimmed = name.value.trim().slice(0, 24);
  $bonStats.setKey("playerName", trimmed);
  emit("start", trimmed);
}
</script>

<style lang="scss">
@use "@styles/components/bon-intro";
</style>
