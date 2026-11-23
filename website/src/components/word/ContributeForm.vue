<template>
  <div
    v-if="isOpen"
    :id="`contribute-${type}`"
    ref="root"
    class="c-contribute-form"
    :data-state="done ? 'thanks' : 'open'"
    :data-type="type"
  >
    <div v-if="done" ref="thanks" class="thanks" role="status" tabindex="-1">
      <div class="bear"><BerlinerBaer :size="88" mood="thumbs-up" /></div>
      <div class="text">
        <p class="head"><b>{{ cfg.thanksTitle }}</b> Ick kiek ma drüber.</p>
        <p class="note">{{ cfg.thanksText }}</p>
        <button v-if="type !== 'error'" class="c-link" type="button" @click="again">
          Noch wat ergänzen
        </button>
      </div>
    </div>

    <form v-else novalidate :aria-labelledby="`${uid}-title`" @submit.prevent="onSubmit">
      <p :id="`${uid}-title`" class="title">{{ cfg.title }}</p>

      <div v-for="f in fields" :key="f.key" class="row">
        <template v-if="f.control === 'chips'">
          <span :id="`${uid}-${f.key}-label`" class="label">{{ f.label }}</span>
          <div class="chips" role="group" :aria-labelledby="`${uid}-${f.key}-label`">
            <button
              v-for="o in f.options"
              :key="o.value"
              class="c-choice"
              data-variant="chip"
              type="button"
              :aria-pressed="v[f.key] === o.value"
              @click="v[f.key] = o.value"
            >
              {{ o.label }}
            </button>
          </div>
        </template>

        <template v-else>
          <label class="label" :for="`${uid}-${f.key}`">
            {{ f.label }}<span v-if="f.optional" class="optional"> (optional)</span>
          </label>

          <textarea
            v-if="f.control === 'textarea'"
            :id="`${uid}-${f.key}`"
            v-model="v[f.key]"
            class="c-textarea"
            rows="4"
            :aria-describedby="describedBy(f)"
            :aria-invalid="refused?.field === f.key ? true : undefined"
            :placeholder="f.placeholder"
          />

          <select
            v-else-if="f.control === 'select'"
            :id="`${uid}-${f.key}`"
            v-model="v[f.key]"
            class="c-select"
            :aria-describedby="describedBy(f)"
          >
            <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>

          <div v-else-if="f.control === 'combo'" class="combo">
            <input
              :id="`${uid}-${f.key}`"
              v-model="v[f.key]"
              class="c-input"
              type="text"
              role="combobox"
              autocomplete="off"
              aria-autocomplete="list"
              :aria-activedescendant="active >= 0 ? `${uid}-opt-${active}` : undefined"
              :aria-controls="`${uid}-listbox`"
              :aria-describedby="describedBy(f)"
              :aria-expanded="listOpen"
              :aria-invalid="refused?.field === f.key ? true : undefined"
              :placeholder="f.placeholder"
              @blur="listOpen = false"
              @keydown="onComboKey"
            />
            <ul
              v-show="listOpen"
              :id="`${uid}-listbox`"
              class="listbox"
              role="listbox"
              :aria-label="f.label"
            >
              <li
                v-for="(s, i) in suggestions"
                :id="`${uid}-opt-${i}`"
                :key="s.slug"
                class="option"
                role="option"
                :aria-selected="i === active"
                @mousedown.prevent
                @click="pick(s.label)"
              >
                <span class="word">
                  <b>{{ matchOf(s.label) }}</b>{{ s.label.slice(matchOf(s.label).length) }}
                </span>
                <small class="meaning">{{ s.meaning }}</small>
              </li>
            </ul>
          </div>

          <input
            v-else
            :id="`${uid}-${f.key}`"
            v-model="v[f.key]"
            class="c-input"
            :aria-invalid="refused?.field === f.key ? true : undefined"
            :type="f.control"
            :aria-describedby="describedBy(f)"
            :autocapitalize="f.control === 'email' ? 'none' : undefined"
            :autocomplete="f.control === 'email' ? 'email' : f.key === 'name' ? 'nickname' : 'off'"
            :inputmode="f.control === 'email' ? 'email' : undefined"
            :placeholder="f.placeholder"
            :spellcheck="f.control === 'email' ? false : undefined"
          />

          <div class="under">
            <span v-if="f.hint" :id="`${uid}-${f.key}-hint`" class="hint">{{ f.hint }}</span>
            <span class="counter" :data-state="tooLong(f) ? 'over' : undefined">{{
              counter(f)
            }}</span>
            <!-- Live region stays in the DOM; its text only changes on a state change (near, over), not per keystroke. -->
            <span class="u-sr-only" aria-live="polite">{{ counterNote(f) }}</span>
          </div>
          <span v-if="refused?.field === f.key" :id="`${uid}-${f.key}-error`" class="error">{{
            refused.message
          }}</span>
        </template>
      </div>

      <TurnStile
        ref="turnstile"
        appearance="interaction-only"
        :site-key="TURNSTILE_SITE_KEY"
        :wrapper-id="`turnstile-${type}`"
        @error="onCaptchaError"
        @token="onToken"
      />

      <!-- The regions are always rendered: a live region is only announced when it exists before its text does. -->
      <div class="u-sr-only-empty" role="alert">
        <div v-if="failed" class="c-state" data-variant="error">
          <CircleAlert aria-hidden="true" height="18" width="18" />
          <span class="body">
            <b>Ditt hat nich jeklappt.</b>
            <span> Deine Eingaben sind noch da, versuch’s gleich nochmal.</span>
            <span v-if="reason" class="detail">{{ reason }}</span>
          </span>
        </div>
      </div>
      <!-- Nothing was sent (captcha still running): a calm status, not the error strip. -->
      <div class="u-sr-only-empty" role="status">
        <div v-if="waiting" class="c-state">
          <Hourglass aria-hidden="true" height="18" width="18" />
          <span class="body">{{ waiting }}</span>
        </div>
      </div>

      <p class="foot">{{ cfg.foot }}</p>
      <p v-if="!online" :id="`${uid}-offline`" class="hint">{{ OFFLINE_HINT }}</p>

      <div class="actions">
        <button
          class="c-button send"
          data-variant="primary"
          type="submit"
          :aria-busy="sending"
          :aria-describedby="online ? undefined : `${uid}-offline`"
          :aria-disabled="sending || !online || !ready"
        >
          {{ failed ? "Nochmal absenden" : cfg.send }}
        </button>
        <button class="c-link" type="button" @click="cancel">Abbrechen</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import BerlinerBaer from "@components/kalle/BerlinerBaer.vue";
import TurnStile from "@components/TurnStile.vue";
import { OFFLINE_HINT, useOnline } from "@composables/useOnline.ts";
import { BEZIRK_NAMES } from "@lib/bezirkNames.ts";
import {
  FACT_KIND_LABEL,
  FACT_KIND_ORDER,
  REPORT_KIND_LABEL,
  REPORT_KIND_ORDER,
} from "@lib/contribute.ts";
import { rememberSubmission } from "@lib/ownSubmissions.ts";
import { RELATION_LABEL, RELATION_ORDER } from "@lib/wordNetwork.ts";
import { suggestWords, type WordSuggestion } from "@lib/wordSuggest.ts";
import { useStore } from "@nanostores/vue";
import { closeContributeForm, openForm } from "@stores/contribute.ts";
import { captchaWaitToast } from "@utils/captchaToast.ts";
import { reportError } from "@utils/reportError.ts";
import { TURNSTILE_SITE_KEY } from "astro:env/client";
import {
  EXAMPLE_MAX,
  FACT_MAX,
  HIGHDEUTSCH_MAX,
  MISSING,
  RELATED_MAX,
  REPORT_EMAIL_MAX,
  REPORT_TEXT_MAX,
  STORY_TEXT_MAX,
  SUBMISSION_NAME_MAX,
  TOO_LONG,
} from "payload-app/submission-limits";
import CircleAlert from "virtual:icons/lucide/circle-alert";
import Hourglass from "virtual:icons/lucide/hourglass";
import { computed, nextTick, reactive, ref, useId, useTemplateRef, watch } from "vue";

type FormType = "error" | "example" | "fact" | "related" | "story";
type Field = {
  control: "chips" | "combo" | "email" | "select" | "text" | "textarea";
  hint?: string;
  key: Key;
  label: string;
  max?: number;
  optional?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
};
type Key =
  | "bezirk"
  | "email"
  | "highdeutsch"
  | "kind"
  | "name"
  | "relation"
  | "reportKind"
  | "target"
  | "text";

const props = defineProps<{
  /** Only for `story`: the "Frage der Woche" as the label of the text field (SPEC §8.2 mock). */
  prompt?: string;
  type: FormType;
  /** Slug of the word the contribution is about. */
  word: string;
}>();

// SPEC §13 limits; the server enforces the same (api/contribute, stories, reports).
const LIMIT = {
  email: REPORT_EMAIL_MAX,
  highdeutsch: HIGHDEUTSCH_MAX,
  name: SUBMISSION_NAME_MAX,
  target: RELATED_MAX,
};
const TEXT_MAX: Record<FormType, number> = {
  error: REPORT_TEXT_MAX,
  example: EXAMPLE_MAX,
  fact: FACT_MAX,
  related: 0,
  story: STORY_TEXT_MAX,
};
const COUNTER_FROM = 0.8;
const COMMUNITY = "Leer lassen, dann steht da „aus der Community“.";

const NAME_HINT: Record<Exclude<FormType, "error">, string> = {
  example: `Steht nach der Prüfung klein unter deinem Beispiel. ${COMMUNITY}`,
  fact: `Steht nach der Prüfung klein unter deinem Eintrag bei Wissenswertes. ${COMMUNITY}`,
  related: `Steht nach der Prüfung klein bei der Verknüpfung als „vorjeschlagen von …“. ${COMMUNITY}`,
  story: `Steht nach der Prüfung unter deiner Jeschichte. ${COMMUNITY}`,
};
const THANKS_NOUN = {
  example: "Beispiel",
  fact: "Eintrag",
  related: "Vorschlag",
  story: "Jeschichte",
} as const;

const CONFIGS = {
  error: {
    endpoint: "/api/reports",
    foot: "Wird vor jeder Änderung jeprüft.",
    send: "Meldung absenden",
    thanksText:
      "Wenn wat falsch is, wird’s korrigiert. Deine Meldung is nirgends öffentlich zu sehen.",
    thanksTitle: "Danke für den Hinweis!",
    title: "Fehler melden",
  },
  example: { title: "Beispiel ergänzen" },
  fact: { title: "Wissenswertes ergänzen" },
  related: { title: "Wort verknüpfen" },
  story: { title: "Deine Jeschichte" },
};
const cfg = computed(() => {
  if (props.type === "error") return CONFIGS.error;
  return {
    endpoint: props.type === "story" ? "/api/stories" : "/api/contribute",
    foot: "Wird vor der Veröffentlichung jeprüft.",
    send: "Absenden",
    thanksText: `Dein ${THANKS_NOUN[props.type]} erscheint, sobald ick et jeprüft hab. Dit dauert meistens een paar Tage.`,
    thanksTitle: "Danke dir!",
    title: CONFIGS[props.type].title,
  };
});

const options = (labels: Record<string, string>, order: readonly string[]) =>
  order.map((value) => ({ label: labels[value]!, value }));
// The 12 Bezirke alphabetically, then "outside" (SPEC §8.2); the values are the STORY_BEZIRKE keys.
const BEZIRK_OPTIONS = [
  { label: "Keene Angabe", value: "" },
  ...Object.entries(BEZIRK_NAMES)
    .map(([value, label]) => ({ label, value }))
    .toSorted((a, b) => a.label.localeCompare(b.label, "de")),
  { label: "Nich aus Berlin", value: "outside" },
];

const nameField = (type: Exclude<FormType, "error">): Field => ({
  control: "text",
  hint: NAME_HINT[type],
  key: "name",
  label: "Dein Name",
  max: LIMIT.name,
  optional: true,
  placeholder: "Vorname oder Spitzname",
});

const fields = computed<Field[]>(() => {
  switch (props.type) {
    case "example":
      return [
        {
          control: "textarea",
          key: "text",
          label: "Satz uff Berlinerisch",
          max: TEXT_MAX.example,
          placeholder: "Zwee Schrippen und ’n Kaffee, bitte.",
        },
        {
          control: "text",
          key: "highdeutsch",
          label: "Uff Hochdeutsch",
          max: LIMIT.highdeutsch,
          optional: true,
        },
        nameField("example"),
      ];
    case "story":
      return [
        {
          control: "textarea",
          key: "text",
          label: props.prompt || "Deine Jeschichte",
          max: TEXT_MAX.story,
          placeholder: "Erzähl ma, kurz und jerne uff Berlinerisch.",
        },
        {
          control: "select",
          // The mock names a district as the example until one is chosen.
          hint: `Steht als „aus ${BEZIRK_OPTIONS.find((o) => o.value === v.bezirk && o.value)?.label ?? "Pankow"}“ bei deiner Jeschichte. Nur der Bezirk, nie mehr.`,
          key: "bezirk",
          label: "Wo wohnste?",
          optional: true,
          options: BEZIRK_OPTIONS,
        },
        nameField("story"),
      ];
    case "fact":
      return [
        {
          control: "chips",
          key: "kind",
          label: "Wat für Wissen?",
          options: options(FACT_KIND_LABEL, FACT_KIND_ORDER),
        },
        {
          control: "textarea",
          key: "text",
          label: "Dein Text",
          max: TEXT_MAX.fact,
          placeholder: "Erzähl ma, wat de weeßt. Gern mit Quelle, wenn de eene hast.",
        },
        nameField("fact"),
      ];
    case "related":
      return [
        { control: "combo", key: "target", label: "Welchet Wort?", max: LIMIT.target },
        {
          control: "chips",
          key: "relation",
          label: "Wie hängen die zusammen?",
          options: RELATION_ORDER.map((value) => ({ label: RELATION_LABEL[value], value })),
        },
        nameField("related"),
      ];
    default:
      return [
        {
          control: "chips",
          key: "reportKind",
          label: "Wat stimmt nich?",
          options: options(REPORT_KIND_LABEL, REPORT_KIND_ORDER),
        },
        {
          control: "textarea",
          key: "text",
          label: "Wat stimmt nich, und wat wär richtig?",
          max: TEXT_MAX.error,
          placeholder: "Beschreib kurz, wat falsch is und wat stattdessen richtig wär.",
        },
        {
          control: "email",
          hint: "Nur, falls ick Rückfragen hab. Wird nie anjezeigt und nach der Klärung jelöscht.",
          key: "email",
          label: "Deine E-Mail",
          max: LIMIT.email,
          optional: true,
          placeholder: "name@beispiel.de",
        },
      ];
  }
});

// The draft lives in this component, so it survives the form being closed by another one (SPEC §13).
const blank = (): Record<Key, string> => ({
  bezirk: "",
  email: "",
  highdeutsch: "",
  kind: "herkunft",
  name: "",
  relation: "gleich",
  reportKind: "meaning",
  target: "",
  text: "",
});
const v = reactive(blank());

const uid = useId();
const online = useOnline();
const $open = useStore(openForm);
const isOpen = computed(() => $open.value === props.type);
const root = useTemplateRef<HTMLElement>("root");
const thanks = useTemplateRef<HTMLElement>("thanks");
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");

const sending = ref(false);
const done = ref(false);
const failed = ref(false);
const reason = ref("");
const waiting = ref("");
const refused = ref<null | { field: Key; message: string }>(null);

// --- required fields, limits, counter -------------------------------------------------------------
const requiredKey: Key = props.type === "related" ? "target" : "text";
const tooLong = (f: Field): boolean => !!f.max && v[f.key].trim().length > f.max;
const over = computed(() => fields.value.some(tooLong));
const ready = computed(() => v[requiredKey].trim().length > 0 && !over.value);
const counter = (f: Field): string =>
  f.max && v[f.key].length >= f.max * COUNTER_FROM ? `${v[f.key].length} / ${f.max}` : "";
const counterNote = (f: Field): string =>
  tooLong(f)
    ? "Ditt is zu lang."
    : f.max && v[f.key].length >= f.max * COUNTER_FROM
      ? "Fast am Limit."
      : "";
const describedBy = (f: Field): string | undefined => {
  const ids = [
    f.hint && `${uid}-${f.key}-hint`,
    refused.value?.field === f.key && `${uid}-${f.key}-error`,
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
};
watch(v, () => {
  if (refused.value && ready.value) refused.value = null;
  waiting.value = "";
});

// --- Turnstile ------------------------------------------------------------------------------------
// A token works once; the widget issues the next one after reset().
const token = ref("");
const captchaFailed = ref(false);
let sendWhenReady = false;
// Closing unmounts the widget: a click waiting for its token must not fire on the next widget, and a token from before
// the close may be spent or expired.
const dropPendingCaptcha = (): void => {
  sendWhenReady = false;
  token.value = "";
  waiting.value = "";
};
const onToken = (value: string): void => {
  token.value = value;
  if (value) {
    captchaFailed.value = false;
    waiting.value = "";
    if (sendWhenReady) {
      sendWhenReady = false;
      void onSubmit();
    }
  }
};
const onCaptchaError = (): void => {
  captchaFailed.value = true;
};

// --- open / close ---------------------------------------------------------------------------------
const FIRST_FIELD = "textarea, input, select, [aria-pressed]";
watch(
  isOpen,
  (open) => {
    if (open) root.value?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
    else {
      dropPendingCaptcha();
      if (done.value) again();
    }
  },
  { flush: "post", immediate: true },
);

const cancel = (): void => {
  dropPendingCaptcha();
  closeContributeForm(props.type);
  // The trigger lives outside this island (SectionCard, WordReportLine): hand the focus back to the first visible one.
  const selector = props.type === "error" ? "[data-report]" : `[data-contribute="${props.type}"]`;
  void nextTick(() =>
    [...document.querySelectorAll<HTMLElement>(selector)]
      .find((el) => el.checkVisibility?.() ?? true)
      ?.focus(),
  );
};

const again = (): void => {
  Object.assign(v, blank());
  done.value = false;
  failed.value = false;
  reason.value = "";
  void nextTick(() => root.value?.querySelector<HTMLElement>(FIRST_FIELD)?.focus());
};

// --- related: the word picker ---------------------------------------------------------------------
const suggestions = ref<WordSuggestion[]>([]);
const active = ref(-1);
const listOpen = ref(false);
let picked = "";
let asked = 0;
watch(
  () => v.target,
  async (term) => {
    if (props.type !== "related") return;
    const query = term.trim();
    if (query.length < 2 || query === picked) {
      suggestions.value = [];
      listOpen.value = false;
      return;
    }
    const mine = ++asked;
    // No index (offline, failed load) only means no suggestions: free text stays allowed.
    const found = await suggestWords(query, props.word).catch(() => []);
    if (mine !== asked) return;
    suggestions.value = found;
    active.value = -1;
    listOpen.value = found.length > 0;
  },
);
const pick = (label: string): void => {
  picked = label;
  v.target = label;
  listOpen.value = false;
  active.value = -1;
};
const matchOf = (label: string): string => {
  const term = v.target.trim();
  return label.toLowerCase().startsWith(term.toLowerCase()) ? label.slice(0, term.length) : "";
};
const onComboKey = (e: KeyboardEvent): void => {
  if (e.isComposing) return;
  const count = suggestions.value.length;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!count) return;
    e.preventDefault();
    listOpen.value = true;
    const step = e.key === "ArrowDown" ? 1 : -1;
    active.value = (active.value + step + count) % count;
  } else if (e.key === "Enter" && listOpen.value && active.value >= 0) {
    e.preventDefault(); // takes the suggestion, does not submit
    pick(suggestions.value[active.value]!.label);
  } else if (e.key === "Escape" && listOpen.value) {
    e.stopPropagation();
    listOpen.value = false;
  }
};

// --- sending --------------------------------------------------------------------------------------
const clean = (s: string): string => s.trim();
const body = (turnstileToken: string): Record<string, string> => {
  const optional = (entries: Record<string, string>) =>
    Object.fromEntries(Object.entries(entries).filter(([, value]) => value));
  const base = { turnstileToken, word: props.word };
  switch (props.type) {
    case "example":
      return {
        ...base,
        ...optional({ highdeutsch: clean(v.highdeutsch), name: clean(v.name) }),
        text: clean(v.text),
        type: "example",
      };
    case "fact":
      return {
        ...base,
        ...optional({ name: clean(v.name) }),
        kind: v.kind,
        text: clean(v.text),
        type: "fact",
      };
    case "related":
      return {
        ...base,
        ...optional({ name: clean(v.name) }),
        relatedText: clean(v.target),
        relation: v.relation,
        type: "related",
      };
    case "story":
      return {
        ...base,
        ...optional({ bezirk: v.bezirk, name: clean(v.name) }),
        text: clean(v.text),
      };
    default:
      return {
        ...base,
        ...optional({ email: clean(v.email) }),
        kind: v.reportKind,
        text: clean(v.text),
      };
  }
};

const refuse = (): void => {
  const field = requiredKey;
  refused.value = { field, message: over.value ? TOO_LONG : MISSING };
  document.getElementById(`${uid}-${field}`)?.focus();
};

const fail = (why = "", field?: string): void => {
  failed.value = true;
  reason.value = why;
  // A 400 about an optional field (e-mail, name ...) marks that field like a refused click does.
  const key =
    field === "kind" && props.type === "error"
      ? "reportKind"
      : field === "relatedText"
        ? "target"
        : field;
  const target = fields.value.find((f) => f.key === key && f.control !== "chips");
  if (target && why) {
    refused.value = { field: target.key, message: why };
    void nextTick(() => document.getElementById(`${uid}-${target.key}`)?.focus());
  }
};

const onSubmit = async (): Promise<void> => {
  // aria-disabled, not :disabled: the button keeps the focus while sending or offline. The flag is set
  // before the first await, so a double click cannot send twice.
  if (sending.value || !online.value) return;
  if (!ready.value) return refuse();
  if (!token.value) {
    waiting.value = captchaWaitToast(captchaFailed.value).message;
    sendWhenReady = !captchaFailed.value; // the click is not lost: it sends as soon as the token arrives
    return;
  }
  sending.value = true;
  failed.value = false;
  reason.value = "";
  waiting.value = "";
  const sent = token.value;
  try {
    const res = await fetch(cfg.value.endpoint, {
      body: JSON.stringify(body(sent)),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = (await res.json().catch(() => null)) as null | {
      error?: string;
      field?: string;
      message?: string;
    };
    if (!res.ok) {
      // Only the status goes to Sentry, never the input (the report carries an e-mail address).
      if (res.status >= 500) reportError(new Error(`[contribute] ${props.type} -> ${res.status}`));
      // The server's German text (field message, captcha refusal, rate limit) when it sent one.
      const fallback = res.status === 429 ? "Ma langsam, Keule – versuch's gleich nochmal." : "";
      fail(data?.message ?? data?.error ?? fallback, data?.field);
    } else {
      succeed();
    }
  } catch (error) {
    // Offline (per navigator.onLine) is expected; anything else, a TypeError from our own code included, is reported.
    if (online.value) reportError(error);
    fail();
  } finally {
    sending.value = false;
    // The token is spent; the widget issues the next one.
    token.value = "";
    turnstile.value?.reset();
  }
};

const succeed = (): void => {
  if (props.type !== "story" && props.type !== "error") {
    rememberSubmission(props.word, props.type, props.type === "related" ? v.target : v.text);
  }
  Object.assign(v, blank());
  done.value = true;
  void nextTick(() => thanks.value?.focus());
};
</script>

<style lang="scss">
@use "@styles/components/contribute-form";
</style>
