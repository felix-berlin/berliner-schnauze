<template>
  <section
    ref="root"
    class="c-section-card c-section-card--sheet c-bon-player-code"
    aria-labelledby="bon-player-code-title"
  >
    <div class="c-section-card__header c-bon-player-code__header">
      <h2 id="bon-player-code-title" class="c-section-card__title c-bon-player-code__title">
        <KeyIcon class="c-bon-player-code__icon" width="18" height="18" aria-hidden="true" />
        {{ title }}
      </h2>
    </div>
    <div class="c-section-card__body c-bon-player-code__body">
      <!-- Persistent live region: screen readers only announce changes to an existing one. -->
      <div
        :class="state === 'success' ? 'c-bon-player-code__done' : 'u-sr-only'"
        role="status"
        aria-live="polite"
        tabindex="-1"
        data-test="status"
      >
        <div v-if="state === 'success'" class="c-state c-state--done">
          <CheckIcon aria-hidden="true" height="18" width="18" />
          <span class="c-state__body">
            <b>Willkommen zurück, {{ welcomeName }}!</b>
            <span>{{ welcomeText }}</span>
            <span v-if="bestScore">Bestes Ergebnis: {{ bestScore }}</span>
          </span>
        </div>
        <template v-else>{{ status }}</template>
      </div>

      <template v-if="state === 'success'">
        <button
          v-if="mode === 'redeem'"
          class="c-button c-button--primary c-button--lg c-bon-player-code__continue"
          type="button"
          data-test="continue"
          @click="emit('close')"
        >
          Weiterspielen
        </button>
      </template>

      <div v-else-if="linking" class="c-bon-player-code__linking" aria-hidden="true">
        <p>Spielercode aus dem Link wird einjelöst …</p>
        <span class="c-skeleton c-skeleton--line" />
        <span class="c-skeleton c-skeleton--line c-bon-player-code__short" />
      </div>

      <template v-else-if="state === 'code' && code">
        <p
          class="c-bon-player-code__code"
          role="img"
          :aria-label="spelled"
          tabindex="-1"
          data-test="code"
        >
          <span v-for="block in code.split('-')" :key="block" class="c-bon-player-code__block">{{
            block
          }}</span>
        </p>
        <div class="c-infotext c-bon-player-code__warning">
          <b>Wer diesen Code hat, kann deinen Namen und deine Ergebnisse nutzen.</b>
          Schreib ihn dir auf – und zeig den QR-Code nich rum.
        </div>
        <div class="c-bon-player-code__actions">
          <button class="c-choice" type="button" data-test="copy-code" @click="copy('code')">
            {{ copied === "code" ? "Code kopiert" : "Code kopieren" }}
          </button>
          <button class="c-choice" type="button" data-test="copy-link" @click="copy('link')">
            {{ copied === "link" ? "Link kopiert" : "Link kopieren" }}
          </button>
          <button class="c-choice" type="button" data-test="qr-toggle" @click="toggleQr">
            {{ qrSvg ? "QR-Code ausblenden" : "QR-Code zeigen" }}
          </button>
        </div>
        <figure v-if="qrSvg" class="c-bon-player-code__figure">
          <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally from our own link -->
          <div
            class="c-bon-player-code__qr"
            role="img"
            aria-label="QR-Code mit deinem Spielerlink"
            data-test="qr"
            v-html="qrSvg"
          />
          <figcaption class="t-small">
            Mit dem Handy scannen – dann biste dort gleich als {{ name }} drin.
          </figcaption>
        </figure>
      </template>

      <form
        v-else-if="state === 'redeem'"
        class="c-bon-player-code__form"
        @submit.prevent="redeem(input)"
      >
        <p>
          Gib deinen Spielercode ein, dann spielste mit deinem Namen und deinen Ergebnissen weiter.
        </p>
        <label for="bon-player-code-input" class="c-bon-player-code__label">Spielercode</label>
        <input
          id="bon-player-code-input"
          v-model="input"
          class="c-input c-bon-player-code__input"
          type="text"
          placeholder="XXXX-XXXX-XXXX"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          :aria-invalid="wrong ? 'true' : undefined"
          aria-describedby="bon-player-code-hint bon-player-code-error"
        />
        <span id="bon-player-code-hint" class="t-small">
          Groß- und Kleinschreibung, Leerzeichen und Bindestriche sind egal.
        </span>
        <div class="c-bon-player-code__actions">
          <button
            class="c-choice"
            type="submit"
            data-test="submit"
            :disabled="pending || !input.trim()"
            :aria-disabled="locked ? 'true' : undefined"
          >
            Weiterspielen
          </button>
          <button class="c-choice" type="button" data-test="back" @click="cancel">Abbrechen</button>
        </div>
      </form>

      <template v-else-if="state === 'none'">
        <p>
          Mit ’nem Spielercode nimmste deinen Namen und deine Ergebnisse auf ein anderes Jerät mit –
          oder holst sie zurück, wenn die Cookies weg sind.
        </p>
        <div class="c-bon-player-code__actions">
          <button
            class="c-choice"
            type="button"
            data-test="get"
            :disabled="pending"
            @click="getCode"
          >
            Spielercode holen
          </button>
          <button class="c-textlink" type="button" data-test="show-redeem" @click="showRedeem">
            Hab schon ’n Code
          </button>
        </div>
      </template>

      <!-- Persistent assertive region (also the field's error description); the box only exists with a message. -->
      <div
        id="bon-player-code-error"
        class="c-bon-player-code__error"
        aria-live="assertive"
        aria-atomic="true"
        data-test="error"
      >
        <div v-if="error" class="c-state c-state--error">
          <CircleAlertIcon aria-hidden="true" height="18" width="18" />
          <span class="c-state__body">
            <b>{{ error }}</b>
            <span v-if="errorHint">{{ errorHint }}</span>
          </span>
        </div>
      </div>
    </div>
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
import { $bonStats } from "@stores/bonStats";
import { normalizeCode } from "@utils/bonPlayerCode.ts";
import { ANONYM } from "payload-app/bon-names";
import CheckIcon from "virtual:icons/lucide/check";
import CircleAlertIcon from "virtual:icons/lucide/circle-alert";
import KeyIcon from "virtual:icons/lucide/key";
import { computed, nextTick, onMounted, ref } from "vue";

const props = defineProps<{ mode?: "none" | "redeem" }>();
const emit = defineEmits<{ close: [] }>();

const state = ref<"none" | "code" | "redeem" | "success">(
  props.mode === "redeem" ? "redeem" : "none",
);
const code = ref("");
const input = ref("");
const error = ref("");
const errorHint = ref("");
const wrong = ref(false); // 3a: the code is wrong or malformed
const locked = ref(false); // 3b: the server said 429; stays until the form is left
const linking = ref(false);
const fromLink = ref(false);
const pending = ref(false);
const qrSvg = ref("");
const copied = ref<"" | "code" | "link">("");
const status = ref("");
const root = ref<HTMLElement>();
const name = ref("");
const welcomeName = ref("");
const bestScore = ref(0);

const TITLES = {
  code: () => `Dein Spielercode für ${name.value}:`,
  none: () => "Auf anderem Jerät weiterspielen",
  redeem: () => "Spielercode einlösen",
  success: () => "Spielercode",
} as const;
const title = computed(() => TITLES[state.value]());
const spelled = computed(() =>
  code.value
    .split("-")
    .map((block) => [...block].join(" "))
    .join(", "),
);
const welcomeText = computed(() =>
  fromLink.value
    ? "Der Link hat dich anjemeldet. Dein Name und deine Ergebnisse sind jetzt hier."
    : "Dein Name und deine Ergebnisse sind jetzt in diesem Browser.",
);

// The focused button vanishes with its state, so move focus to the new state's first element.
async function focusOn(selector: string) {
  await nextTick();
  root.value?.querySelector<HTMLElement>(selector)?.focus();
}

function clearError() {
  error.value = "";
  errorHint.value = "";
  wrong.value = false;
}

function showRedeem() {
  state.value = "redeem";
  void focusOn("input");
}

function cancel() {
  clearError();
  locked.value = false;
  if (props.mode === "redeem") return emit("close");
  state.value = "none";
  void focusOn("[data-test=get]");
}

async function run(action: () => Promise<void>) {
  if (pending.value) return;
  pending.value = true;
  clearError();
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
    name.value = $bonStats.get().playerName || ANONYM;
    state.value = "code";
    void focusOn("[data-test=code]");
  });

const WRONG_HINT = "Guck nochmal jenau hin – vielleicht ’n Zeichen vertippt?";

function fail(message: string, hint = "") {
  error.value = message;
  errorHint.value = hint;
}

async function redeem(value: string) {
  if (locked.value || pending.value) return;
  clearError();
  const canonical = normalizeCode(value);
  if (!canonical) {
    // No server call for something that cannot be a code.
    wrong.value = true;
    return fail("Den Code kenn ick nich.", WRONG_HINT);
  }
  pending.value = true;
  try {
    const stats = await redeemPlayerCode(canonical);
    applyPlayerStats(stats);
    state.value = "success";
    // "Anonym" is no name to greet.
    welcomeName.value =
      stats.playerName && stats.playerName !== ANONYM ? stats.playerName : "Spieler";
    bestScore.value = stats.gamesPlayed > 0 ? stats.highScore : 0;
    status.value = "";
    void focusOn("[data-test=status]");
  } catch (e) {
    const httpStatus = (e as { status?: number }).status;
    const message = e instanceof Error ? e.message : String(e);
    if (httpStatus === 429) {
      locked.value = true;
      fail("Zu ville Versuche.", "Mach ma Pause und probier’s in 10 Minuten nochmal.");
    } else if (httpStatus === 404) {
      wrong.value = true;
      fail(message, WRONG_HINT);
    } else fail(message);
  } finally {
    pending.value = false;
    linking.value = false;
    if (state.value !== "success") status.value = "";
  }
}

async function toggleQr() {
  if (qrSvg.value) {
    qrSvg.value = "";
    return;
  }
  try {
    const { renderSVG } = await import("uqr");
    // The 12px white border is CSS padding on the 200px box; black on white in dark mode too.
    qrSvg.value = renderSVG(playerLink(code.value), {
      blackColor: "#000",
      border: 0,
      ecc: "M",
      whiteColor: "#fff",
    });
  } catch {
    error.value = "Den QR-Code kriegen wa jerade nich hin.";
  }
}

async function copy(what: "code" | "link") {
  try {
    await navigator.clipboard.writeText(what === "code" ? code.value : playerLink(code.value));
    copied.value = what;
    status.value = what === "code" ? "Code kopiert" : "Link kopiert";
    setTimeout(() => {
      copied.value = "";
      status.value = "";
    }, 2000);
  } catch {
    error.value = "Kopieren hat nich jeklappt, nimm den Code von Hand.";
  }
}

onMounted(() => {
  const stored = takeRedeemCode();
  if (stored) {
    state.value = "redeem";
    fromLink.value = true;
    linking.value = true;
    status.value = "Spielercode aus dem Link wird einjelöst …";
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
