<template>
  <div class="c-bon-intro">
    <div class="inner">
      <section class="main" aria-labelledby="bon-title">
        <BonPlayerCode v-if="linkRedeem" />
        <p class="t-label">Spiel</p>
        <h1 id="bon-title" class="c-band">Berliner oder nicht?</h1>
        <p class="t-em lead">
          Echtes Berlinerisch – oder erfunden oder Hochdeutsch? Wisch oder tipp – du hast 3 Leben.
        </p>

        <div v-if="offline" class="c-state" data-variant="offline" role="status">
          <WifiOffIcon width="18" height="18" aria-hidden="true" />
          <span class="body">
            <b>Du bist offline.</b>
            <span>Die Karten kommen vom Server – spielen jeht wieder, sobald du Netz hast.</span>
          </span>
        </div>

        <form class="form" @submit.prevent="start">
          <BonName v-if="known" :name="known.name" :tag="known.tag" @saved="onSaved" />
          <div v-else class="name">
            <label for="bon-name" class="c-label">
              Dein Name <span class="optional">(optional)</span>
            </label>
            <input
              id="bon-name"
              v-model="name"
              class="c-input"
              :aria-invalid="problem ? 'true' : undefined"
              type="text"
              maxlength="24"
              placeholder="Anonym"
              autocomplete="nickname"
              :aria-describedby="problem ? 'bon-name-problem bon-name-hint' : 'bon-name-hint'"
              @input="problem = undefined"
            />
            <div
              v-if="problem === 'far-right'"
              id="bon-name-problem"
              class="c-state"
              data-variant="error"
              role="alert"
            >
              <AlertIcon width="18" height="18" aria-hidden="true" />
              <span class="body">
                <b>Rechtsextreme Namen jibt’s hier nich.</b>
                <span>Willst du raus aus der rechten Szene? Such dir Hilfe:</span>
                <a
                  class="c-textlink"
                  href="https://www.exit-deutschland.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  >EXIT-Deutschland</a
                >
              </span>
            </div>
            <span
              v-else-if="problem === 'offensive'"
              id="bon-name-problem"
              class="t-small"
              role="alert"
            >
              Den Namen nehmen wir nich. Such dir ’n anderen aus.
            </span>
            <span id="bon-name-hint" class="t-small">
              Steht neben deiner Platzierung. Leer jelassen = „Anonym“ mit Kennung, z. B. „Anonym
              #K7QX“. Max. 24 Zeichen.
            </span>
          </div>
          <div class="start">
            <span class="cta">
              <button
                class="c-button"
                data-variant="primary lg"
                type="submit"
                :aria-disabled="offline ? 'true' : undefined"
              >
                Los jeht’s
              </button>
            </span>
            <span v-if="highScore > 0" class="t-small">
              Dein Rekord: <b class="record">{{ highScore }} Punkte</b>
            </span>
          </div>
        </form>

        <BonPlayerCode v-if="redeeming" mode="redeem" @close="redeeming = false" />
        <div v-else-if="!linkRedeem" class="redeem">
          <button class="c-textlink" type="button" @click="redeeming = true">
            <KeyIcon width="18" height="18" aria-hidden="true" />
            <span>Spielercode einlösen</span>
          </button>
        </div>
        <a class="c-textlink" href="/games/berliner-oder-nicht/rangliste">Rangliste</a>
      </section>

      <aside
        class="c-section-card c-bon-rules"
        data-variant="sheet"
        aria-labelledby="bon-rules-title"
      >
        <div class="header">
          <h2 id="bon-rules-title" class="title">So jeht’s</h2>
        </div>
        <div class="body">
          <ul class="list">
            <li>
              <RowsIcon width="22" height="22" aria-hidden="true" />
              <span>
                <b>Wort lesen, entscheiden.</b><br />
                <span class="t-small">
                  Nach rechts wischen oder „Ja“ = Berlinerisch, nach links oder „Nee“ = erfunden
                  oder Hochdeutsch. Am Rechner gehen auch die Pfeiltasten.
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
                <span class="track">
                  <span v-for="label in MULTIPLIER_LABELS" :key="label">{{ label }}</span>
                </span>
              </span>
            </li>
          </ul>
          <p class="t-small tip">
            Tipp: Manche Wörter sind Abkürzungen für ’ne Redewendung – nich imma zu wörtlich nehmen.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import BonName from "@components/games/BonName.vue";
import BonPlayerCode from "@components/games/BonPlayerCode.vue";
import { useStore } from "@nanostores/vue";
import { fetchPlayerName, rememberName, type PlayerName } from "@services/bonPlayerApi.ts";
import { $bonStats } from "@stores/bonStats";
import { nameCategory, type NameCategory } from "payload-app/bon-names";
import { MULTIPLIER_LABELS } from "payload-app/bon-rules";
import AlertIcon from "virtual:icons/lucide/circle-alert";
import FlameIcon from "virtual:icons/lucide/flame";
import HeartIcon from "virtual:icons/lucide/heart";
import KeyIcon from "virtual:icons/lucide/key";
import RowsIcon from "virtual:icons/lucide/rows-2";
import WifiOffIcon from "virtual:icons/lucide/wifi-off";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{ highScore: number; offline: boolean; linkRedeem: boolean }>();
// The name is in $bonStats by then; useBon.start() reads it there.
const emit = defineEmits<{ start: [] }>();

const name = ref($bonStats.get().playerName ?? "");
const stats = useStore($bonStats);
// A redeemed code or a rename sets the store behind the field's back; start() must not write the stale value back.
watch(
  () => stats.value.playerName,
  (value) => (name.value = value),
);
const redeeming = ref(false);
const problem = ref<NameCategory>();
// Set once the server knows this player: the field gives way to the name editor.
const known = ref<PlayerName>();

onMounted(async () => {
  try {
    const player = await fetchPlayerName();
    if (!player) return;
    known.value = player;
    rememberName(player.name);
    name.value = $bonStats.get().playerName;
  } catch {
    // Without the name the field stays, as for a first-time visitor.
  }
});

function onSaved(player: PlayerName) {
  known.value = player;
  name.value = $bonStats.get().playerName;
}

function start() {
  if (props.offline) return;
  const trimmed = name.value.trim().slice(0, 24);
  // The server cleans names too (finish); this keeps one out of the local state and the share link.
  problem.value = nameCategory(trimmed);
  if (problem.value) return;
  $bonStats.setKey("playerName", trimmed);
  emit("start");
}
</script>

<style lang="scss">
@use "@styles/components/bon-intro";
@use "@styles/components/bon-rules";
</style>
