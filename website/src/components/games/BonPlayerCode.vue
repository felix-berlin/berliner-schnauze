<template>
  <section ref="root" class="c-bon-player-code" aria-labelledby="bon-player-code-title">
    <h2 id="bon-player-code-title" class="c-bon-player-code__title">Spielercode</h2>

    <!-- Persistent live regions: screen readers only announce changes to existing ones. -->
    <p
      class="c-bon-player-code__success"
      role="status"
      aria-live="polite"
      tabindex="-1"
      data-test="status"
    >
      {{ status }}
    </p>

    <template v-if="state === 'code' && code">
      <p class="c-bon-player-code__code" tabindex="-1" data-test="code">{{ code }}</p>
      <p class="c-bon-player-code__hint">
        Wer diesen Code hat, kann deinen Namen und deine Ergebnisse nutzen. Schreib ihn dir auf.
      </p>
      <p class="c-bon-player-code__hint" data-test="link-hint">
        Klappt der Link nich, tipp den Code einfach ein.
      </p>
      <div class="c-bon-player-code__actions">
        <button class="c-bon-player-code__btn" type="button" @click="copyLink">
          Link kopieren
        </button>
        <button class="c-bon-player-code__btn" type="button" @click="toggleQr">
          {{ qrSvg ? "QR-Code verstecken" : "QR-Code zeigen" }}
        </button>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally from our own link -->
      <div
        v-if="qrSvg"
        class="c-bon-player-code__qr"
        role="img"
        aria-label="QR-Code mit deinem Spielerlink"
        v-html="qrSvg"
      />
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
        <button class="c-bon-player-code__btn" type="button" data-test="back" @click="back">
          Zurück
        </button>
      </form>
    </template>

    <template v-else-if="state === 'none'">
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
          @click="showRedeem"
        >
          Ick hab schon een Code
        </button>
      </div>
    </template>

    <p class="c-bon-player-code__error" role="alert" data-test="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import {
  applyPlayerStats,
  createPlayerCode,
  playerLink,
  redeemPlayerCode,
  takeRedeemCode,
} from "@services/bonPlayerApi.ts";
import { nextTick, onMounted, ref } from "vue";

const props = defineProps<{ mode?: "none" | "redeem" }>();

const state = ref<"none" | "code" | "redeem" | "success">(
  props.mode === "redeem" ? "redeem" : "none",
);
const code = ref("");
const input = ref("");
const error = ref("");
const pending = ref(false);
const qrSvg = ref("");
const status = ref("");
const root = ref<HTMLElement>();

// The focused button vanishes with its state, so move focus to the new state's first element.
async function focusOn(selector: string) {
  await nextTick();
  root.value?.querySelector<HTMLElement>(selector)?.focus();
}

function showRedeem() {
  state.value = "redeem";
  void focusOn("input");
}

function back() {
  state.value = "none";
  error.value = "";
  void focusOn("[data-test=get]");
}

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
    void focusOn("[data-test=code]");
  });

const redeem = (value: string) =>
  run(async () => {
    const stats = await redeemPlayerCode(value);
    applyPlayerStats(stats);
    state.value = "success";
    status.value = `Willkomm'n zurück, ${stats.playerName || "Spieler"}!${
      stats.gamesPlayed > 0 ? ` Bestes Ergebnis: ${stats.highScore}` : ""
    }`;
    void focusOn("[data-test=status]");
  });

async function toggleQr() {
  if (qrSvg.value) {
    qrSvg.value = "";
    return;
  }
  try {
    const { renderSVG } = await import("uqr");
    qrSvg.value = renderSVG(playerLink(code.value));
  } catch {
    error.value = "Den QR-Code kriegen wa jerade nich hin.";
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(playerLink(code.value));
    status.value = "Link kopiert!";
    setTimeout(() => (status.value = ""), 2000);
  } catch {
    error.value = "Kopieren hat nich jeklappt, nimm den Code von Hand.";
  }
}

onMounted(() => {
  const stored = takeRedeemCode();
  if (stored) {
    state.value = "redeem";
    input.value = stored; // the link and storage no longer hold it, so a failed redeem must stay retryable
    void redeem(stored);
  } else if (props.mode === "redeem") {
    void focusOn("input");
  }
});
</script>

<style lang="scss">
@use "@styles/components/bon-player-code";
</style>
