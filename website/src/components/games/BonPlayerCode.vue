<template>
  <section class="c-bon-player-code" aria-labelledby="bon-player-code-title">
    <h2 id="bon-player-code-title" class="c-bon-player-code__title">Spielercode</h2>

    <template v-if="state === 'success' && result">
      <p class="c-bon-player-code__success" role="status">
        Willkomm'n zurück, {{ result.playerName || "Spieler" }}!
        <span v-if="result.gamesPlayed > 0">Bestes Ergebnis: {{ result.highScore }}</span>
      </p>
    </template>

    <template v-else-if="state === 'code' && code">
      <p class="c-bon-player-code__code" data-test="code">{{ code }}</p>
      <p class="c-bon-player-code__hint">
        Wer diesen Code hat, kann deinen Namen und deine Ergebnisse nutzen. Schreib ihn dir auf.
      </p>
      <div class="c-bon-player-code__actions">
        <button class="c-bon-player-code__btn" type="button" @click="copyLink">
          {{ copied ? "Kopiert!" : "Link kopieren" }}
        </button>
        <button class="c-bon-player-code__btn" type="button" @click="toggleQr">
          {{ qrSvg ? "QR-Code verstecken" : "QR-Code zeigen" }}
        </button>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally from our own link -->
      <div v-if="qrSvg" class="c-bon-player-code__qr" role="img" aria-label="QR-Code mit deinem Spielerlink" v-html="qrSvg" />
    </template>

    <template v-else-if="state === 'redeem'">
      <form class="c-bon-player-code__form" @submit.prevent="redeem(input.trim())">
        <label for="bon-player-code-input" class="u-sr-only">Dein Spielercode</label>
        <input
          id="bon-player-code-input"
          v-model="input"
          class="c-bon-player-code__input"
          type="text"
          placeholder="XXXX-XXXX-XXXX"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
        />
        <button class="c-bon-player-code__btn" type="submit" :disabled="pending || !input.trim()">
          Weiterspielen
        </button>
      </form>
    </template>

    <template v-else>
      <p class="c-bon-player-code__hint">
        Mit 'nem Spielercode spielst du auf anderen Geräten weita.
      </p>
      <div class="c-bon-player-code__actions">
        <button
          class="c-bon-player-code__btn"
          type="button"
          data-test="get"
          :disabled="pending"
          @click="getCode"
        >
          Spielercode holen
        </button>
        <button
          class="c-bon-player-code__btn"
          type="button"
          data-test="show-redeem"
          @click="state = 'redeem'"
        >
          Ick hab schon een Code
        </button>
      </div>
    </template>

    <p v-if="error" class="c-bon-player-code__error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import {
  applyPlayerStats,
  createPlayerCode,
  playerLink,
  redeemPlayerCode,
  takeRedeemCode,
  type PlayerStats,
} from "@services/bonPlayerApi.ts";
import { onMounted, ref } from "vue";

const state = ref<"none" | "code" | "redeem" | "success">("none");
const code = ref("");
const input = ref("");
const error = ref("");
const pending = ref(false);
const result = ref<PlayerStats>();
const qrSvg = ref("");
const copied = ref(false);

async function run(action: () => Promise<void>) {
  if (pending.value) return;
  pending.value = true;
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    pending.value = false;
  }
}

const getCode = () =>
  run(async () => {
    code.value = await createPlayerCode();
    state.value = "code";
  });

const redeem = (value: string) =>
  run(async () => {
    const stats = await redeemPlayerCode(value);
    applyPlayerStats(stats);
    result.value = stats;
    state.value = "success";
  });

async function toggleQr() {
  if (qrSvg.value) {
    qrSvg.value = "";
    return;
  }
  const { renderSVG } = await import("uqr");
  qrSvg.value = renderSVG(playerLink(code.value));
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(playerLink(code.value));
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    error.value = "Kopieren hat nich jeklappt, nimm den Code von Hand.";
  }
}

onMounted(() => {
  const stored = takeRedeemCode();
  if (stored) {
    state.value = "redeem";
    void redeem(stored);
  }
});
</script>

<style lang="scss">
@use "@styles/components/bon-player-code";
</style>
