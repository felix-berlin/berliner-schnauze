<!--
  BerlinerBaer.vue  ·  Kalle, das Maskottchen von berliner-schnauze.wtf
  Generiert aus dem Design-Canvas (Seite „v3 · Bären-Maskottchen“, Board „Kalle · Berliner Bär“).
  SVG und CSS nicht von Hand umbauen: Teile, Klassen und Drehpunkte hängen zusammen.
  Spezifikation: SPEC.md im Handoff-Ordner.
-->
<script lang="ts">
export type BaerStimmung =
  | 'idle'
  | 'locker'
  | 'auftritt'
  | 'abgang'
  | 'folgen'
  | 'winken'
  | 'nicken'
  | 'nee'
  | 'daumen'
  | 'zeigen'
  | 'abwinken'
  | 'pst'
  | 'kieken'
  | 'lauschen'
  | 'denken'
  | 'nuescht'
  | 'jubeln'
  | 'facepalm'
  | 'schreck'
  | 'kratzen'
  | 'gaehnen'
  | 'einnicken'
  | 'pennen'
  | 'schnauze'
  | 'tanzen'
  | 'futtern'
  | 'pils'
  | 'ganove'

let bvZaehler = 0
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** Stimmung, siehe SPEC §5 */
  stimmung?: BaerStimmung
  /** Breite in px. Höhe ergibt sich aus dem Seitenverhältnis. */
  groesse?: number
  /** 'auto' wählt nach Größe: unter 64px nur der Kopf */
  variante?: 'auto' | 'voll' | 'kopf' | 'lugen'
  /** Farbige Scheibe hinter dem Bären */
  scheibe?: boolean
  /** Bewegung endet nach rund 6 s und läuft bei Hover wieder. Standard: an, wenn kleiner als 200px. */
  ruhig?: boolean
  /** Antippen erlaubt: zuckt, beim dritten Mal kurz Schnauze! */
  antippbar?: boolean
  /** Blickrichtung für stimmung="folgen", jeweils -1 bis 1 */
  blickX?: number
  blickY?: number
  /** Gesetzt: role="img" mit diesem Text. Leer: rein dekorativ (aria-hidden). */
  label?: string
  /** Erzwingt ein Farbschema, sonst folgt der Bär [data-theme] der Seite */
  thema?: 'auto' | 'hell' | 'dunkel'
}>(), {
  stimmung: 'idle',
  groesse: 200,
  variante: 'auto',
  scheibe: false,
  ruhig: undefined,
  antippbar: false,
  blickX: 0,
  blickY: 0,
  label: '',
  thema: 'auto',
})

const emit = defineEmits<{
  /** Auftritt oder Abgang ist durchgelaufen */
  (e: 'fertig', stimmung: BaerStimmung): void
}>()

/* Masken-ID erst nach dem Mounten: seitenweit eindeutig, auch über mehrere Astro-Inseln.
   Vor der Hydration fehlen nur die schmalen Fugen zwischen Arm und Körper. */
const maskId = ref<string | undefined>()
onMounted(() => { maskId.value = `bv-${++bvZaehler}-m` })

const aktiv = ref<BaerStimmung>(props.stimmung)
const wechsel = ref(0)
const reaktion = ref('')
let tipps = 0
let reaktionsZaehler = 0
let timer: ReturnType<typeof setTimeout> | undefined

watch(() => props.stimmung, (neu) => {
  aktiv.value = neu
  wechsel.value++
  if (neu === 'auftritt' || neu === 'abgang') {
    clearTimeout(timer)
    timer = setTimeout(() => emit('fertig', neu), neu === 'auftritt' ? 900 : 2000)
  }
})
onBeforeUnmount(() => clearTimeout(timer))

const form = computed(() => {
  if (props.variante !== 'auto') return props.variante
  return props.groesse < 64 ? 'kopf' : 'voll'
})
const istRuhig = computed(() => props.ruhig ?? props.groesse < 200)

/* Konfiguration und Zustand als Attribute, die das SCSS ansteuert (data-variant, data-state). */
const variante_ = computed(() => [
  !props.scheibe && 'plain',
  form.value === 'voll' && props.groesse >= 200 && 'brauen',
  props.groesse < 96 && 'klein',
  form.value === 'kopf' && 'kopf',
  form.value === 'lugen' && 'lugen',
  istRuhig.value && 'calm',
  props.thema === 'dunkel' && 'dark',
  props.thema === 'hell' && 'light',
].filter(Boolean).join(' '))

const zustand = computed(() => [
  aktiv.value,
  wechsel.value > 0 && (wechsel.value % 2 === 1 ? 'sw-a' : 'sw-b'),
  reaktion.value,
].filter(Boolean).join(' '))

const stil = computed(() => ({
  width: `${props.groesse}px`,
  '--_lx': String(Math.max(-1, Math.min(1, props.blickX))),
  '--_ly': String(Math.max(-1, Math.min(1, props.blickY))),
}))

const a11y = computed((): Record<string, string> => props.label
  ? { role: 'img', 'aria-label': props.label }
  : { 'aria-hidden': 'true', focusable: 'false' })

/** Kurzes Zucken. Die Stimmung läuft darunter weiter. */
function antippen() {
  tipps++
  if (tipps % 3 === 0) {
    const vorher = aktiv.value
    aktiv.value = 'schnauze'
    wechsel.value++
    clearTimeout(timer)
    timer = setTimeout(() => { aktiv.value = vorher; wechsel.value++ }, 2000)
    return
  }
  reaktionsZaehler++
  reaktion.value = reaktionsZaehler % 2 ? 'zuck-a' : 'zuck-b'
}
/** Ohrenzucken, zum Beispiel bei jedem Tastendruck im Suchfeld */
function tippen() {
  reaktionsZaehler++
  reaktion.value = reaktionsZaehler % 2 ? 'tipp-a' : 'tipp-b'
}
function beiKlick() { if (props.antippbar) antippen() }

defineExpose({ antippen, tippen })
</script>

<template>
  <div class="c-berliner-baer" :data-variant="variante_" :data-state="zustand" :style="stil" @click="beiKlick">
    <template v-if="form === 'voll'"><svg class="svg" viewBox="-140 -70 800 950" v-bind="a11y">
<defs><mask :id="maskId" maskUnits="userSpaceOnUse" x="-200" y="-200" width="920" height="1200"><rect x="-200" y="-200" width="920" height="1200" fill="#fff"></rect><g class="upper"><g class="arm arm-l"><path d="M88.0 319.0L44 300" fill="none" stroke="#000" stroke-width="96" stroke-linecap="round"></path><g class="fore fore-l"><path d="M44 300L18.2 160.7" fill="none" stroke="#000" stroke-width="96" stroke-linecap="round"></path><ellipse cx="14" cy="138" rx="58" ry="54" fill="#000"></ellipse></g></g><g class="arm arm-r"><path d="M432.0 319.0L476 300" fill="none" stroke="#000" stroke-width="96" stroke-linecap="round"></path><g class="fore fore-r"><path d="M476 300L501.8 160.7" fill="none" stroke="#000" stroke-width="96" stroke-linecap="round"></path><ellipse cx="506" cy="138" rx="58" ry="54" fill="#000"></ellipse></g></g></g></mask></defs>
<circle class="disc" cx="260" cy="440" r="360"></circle>
<ellipse class="shadow" cx="260" cy="829" rx="200" ry="11"></ellipse>
<g class="pop"><g class="react"><g class="all"><g :mask="maskId ? `url(#${maskId})` : undefined"><g class="leg leg-l"><path d="M178 600L152 708" fill="none" stroke="var(--_ink)" stroke-width="108" stroke-linecap="round"></path><g class="shin shin-l"><path d="M152 708L158 784" fill="none" stroke="var(--_ink)" stroke-width="84" stroke-linecap="round"></path><g class="foot foot-l"><path d="M86 824Q70 822 76 806Q90 790 124 784H194Q210 790 212 806Q210 824 194 824Z" fill="var(--_ink)"></path><g class="toes" fill="var(--_red)"><path transform="translate(104 806) rotate(200) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(130 809) rotate(187) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(156 809) rotate(173) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(182 806) rotate(160) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g></g></g></g><g class="leg leg-r"><path d="M342 600L368 708" fill="none" stroke="var(--_ink)" stroke-width="108" stroke-linecap="round"></path><g class="shin shin-r"><path d="M368 708L362 784" fill="none" stroke="var(--_ink)" stroke-width="84" stroke-linecap="round"></path><g class="foot foot-r"><path transform="translate(520 0) scale(-1 1)" d="M86 824Q70 822 76 806Q90 790 124 784H194Q210 790 212 806Q210 824 194 824Z" fill="var(--_ink)"></path><g class="toes" fill="var(--_red)"><path transform="translate(416 806) rotate(160) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(390 809) rotate(173) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(364 809) rotate(187) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(338 806) rotate(200) scale(0.7)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g></g></g></g><g class="upper"><g class="body"><g class="breath"><path d="M192 236L146 288Q100 298 94 342Q92 384 112 424Q140 472 158 520Q150 580 164 632Q206 672 260 668Q314 672 356 632Q370 580 362 520Q380 472 408 424Q428 384 426 342Q420 298 374 288L328 236Z" fill="var(--_ink)"></path><g class="gang"><path d="M152 302L214 296 260 372 306 296 368 302Q398 400 366 516L300 546 260 522 220 546 154 516Q122 400 152 302Z" fill="var(--_vest)"></path><path class="detail" d="M176 330V506M202 320V524M228 330V536M292 330V536M318 320V524M344 330V506" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="2.5"></path><path d="M214 296L260 372 306 296" fill="none" stroke="var(--_ink)" stroke-width="6" stroke-linejoin="round"></path><g class="detail" fill="#e9d7b0"><circle cx="260" cy="410" r="5.5"></circle><circle cx="260" cy="450" r="5.5"></circle><circle cx="260" cy="490" r="5.5"></circle></g><path d="M312 446h40" fill="none" stroke="var(--_ink)" stroke-width="5" stroke-linecap="round"></path><path class="detail" d="M262 452Q296 492 336 448" fill="none" stroke="#e1b125" stroke-width="4" stroke-linecap="round"></path><path d="M186 286Q260 340 334 286L330 314Q260 366 190 314Z" fill="var(--_red)"></path><path d="M250 336l-24 56 32-16 8 24 14-62z" fill="#c22a13"></path></g></g></g><g class="head"><g class="nod"><g transform="translate(260 300) scale(.93) translate(-260 -300)">
<g class="ear ear-l"><g class="earin"><circle cx="150" cy="96" r="36" fill="var(--_ink)"></circle><path d="M136 92c3-10 10-17 20-19" fill="none" stroke="var(--_white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<g class="ear ear-r"><g class="earin"><circle cx="370" cy="96" r="36" fill="var(--_ink)"></circle><path d="M384 92c-3-10-10-17-20-19" fill="none" stroke="var(--_white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<path d="M200 68H320Q374 82 394 150L406 214Q402 264 352 292L300 316Q260 326 220 316L168 292Q118 264 114 214L126 150Q146 82 200 68Z" fill="var(--_ink)"></path>
<path d="M212 190H308Q336 236 324 280 292 310 260 310 228 310 196 280 184 236 212 190Z" fill="var(--_ink2)"></path>
<g class="blush" fill="var(--_red)"><ellipse cx="170" cy="232" rx="18" ry="11"></ellipse><ellipse cx="350" cy="232" rx="18" ry="11"></ellipse></g><g class="eyes"><g class="eye eye-l"><g class="wide"><g class="blink"><circle cx="208" cy="160" r="14" fill="var(--_white)"></circle><g class="glance"><circle class="pupil" cx="208" cy="162" r="8.5" fill="var(--_ink)"></circle><circle cx="204.5" cy="158" r="2.8" fill="var(--_white)"></circle></g></g></g></g>
<g class="eye eye-r"><g class="wide"><g class="blink"><circle cx="312" cy="160" r="14" fill="var(--_white)"></circle><g class="glance"><circle class="pupil" cx="312" cy="162" r="8.5" fill="var(--_ink)"></circle><circle cx="308.5" cy="158" r="2.8" fill="var(--_white)"></circle></g></g></g></g></g>
<g class="brows" fill="none" stroke="var(--_brow)" stroke-width="11" stroke-linecap="round"><path class="brow brow-l" d="M184 130Q208 117 232 126"></path><path class="brow brow-r" d="M288 126Q312 117 336 130"></path></g><g class="lid" fill="var(--_ink)"><path d="M190 138h38v20l-38-9z"></path><path d="M330 138h-38v20l38-9z"></path></g>
<path class="sleep" d="M192 162q16 11 32 0M296 162q16 11 32 0" fill="none" stroke="var(--_white)" stroke-width="6" stroke-linecap="round"></path>
<g class="grr" fill="var(--_ink)"><path d="M188 134h44v34l-44-18z"></path><path d="M332 134h-44v34l44-18z"></path></g>
<path d="M222 192q38-16 76 0q-4 32-38 40q-34-8-38-40z" fill="var(--_nose)"></path><ellipse cx="246" cy="198" rx="11" ry="5" fill="var(--_white)" opacity=".5"></ellipse>
<g class="blep"><ellipse cx="260" cy="272" rx="12" ry="12" fill="var(--_red)"></ellipse></g>
<g class="smile" fill="none" stroke="var(--_nose)" stroke-width="6" stroke-linecap="round"><path d="M260 232v22"></path><path class="curve" d="M232 252q28 20 56 0"></path></g>
<g class="yawn"><ellipse cx="260" cy="262" rx="28" ry="36" fill="var(--_mouth)"></ellipse><ellipse cx="260" cy="286" rx="15" ry="9" fill="var(--_red)"></ellipse></g><g class="open"><path d="M206 240q54-12 108 0l-10 50q-44 18-88 0z" fill="var(--_mouth)"></path>
<path d="M212 240l13 30 12-33zm96 0l-13 30-12-33zm-66-4l8 17 8-18zm36 0l-8 17-8-18z" fill="var(--_white)"></path><path d="M226 294l8-22 10 26zm68 0l-8-22-10 26z" fill="var(--_white)"></path>
<g class="tongue"><path d="M238 268C236 314 246 340 260 340S284 314 282 268Z" fill="var(--_red)"></path><path d="M260 278v40" fill="none" stroke="var(--_mouth)" stroke-width="4" stroke-linecap="round"></path></g></g>
<g class="gang"><g transform="rotate(-7 260 90)"><path d="M134 118Q124 62 196 40Q262 20 332 38Q400 58 386 118Q260 98 134 118Z" fill="var(--_cap)"></path><path d="M262 30Q214 50 204 106M262 30Q262 70 262 102M262 30Q312 50 318 106" fill="none" stroke="var(--_cap2)" stroke-width="3.5" stroke-linecap="round"></path><circle cx="262" cy="31" r="7" fill="var(--_cap2)"></circle><path d="M134 118Q260 98 386 118L382 130Q260 112 138 130Z" fill="var(--_cap2)"></path><path d="M172 126Q260 110 348 126Q342 152 260 156Q178 152 172 126Z" fill="var(--_cap2)"></path><path d="M190 134Q260 122 330 134" fill="none" stroke="var(--_cap)" stroke-width="3" stroke-linecap="round" opacity=".7"></path></g><g transform="rotate(16 290 262)"><rect x="286" y="254" width="64" height="16" rx="6" fill="#7a4a1e"></rect><rect x="340" y="254" width="12" height="16" rx="5" fill="var(--_red)"></rect><rect x="300" y="254" width="6" height="16" fill="#e1b125"></rect></g><path class="smoke" d="M358 276q-16-22 2-40t-4-44" fill="none" stroke="#c9d1d8" stroke-width="6" stroke-linecap="round"></path></g></g></g></g></g></g><g class="upper"><g class="arm arm-l"><path d="M132 338L44 300" fill="none" stroke="var(--_ink)" stroke-width="80" stroke-linecap="round"></path><g class="fore fore-l"><g class="claws" fill="var(--_red)"><path transform="translate(-26 116) rotate(-40) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(-8 98) rotate(-21) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(14 92) rotate(0) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(36 98) rotate(21) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(54 116) rotate(40) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g><path d="M44 300L18.2 160.7" fill="none" stroke="var(--_ink)" stroke-width="80" stroke-linecap="round"></path><ellipse cx="14" cy="138" rx="50" ry="46" fill="var(--_ink)"></ellipse><g class="knuckles" fill="var(--_red)"><path transform="translate(-19.5 105.6) rotate(-10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(-1.8 102.3) rotate(-10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(15.9 99.0) rotate(-10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(33.6 95.7) rotate(-10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g></g></g><g class="arm arm-r"><path d="M388 338L476 300" fill="none" stroke="var(--_ink)" stroke-width="80" stroke-linecap="round"></path><g class="fore fore-r"><g class="claws" fill="var(--_red)"><path transform="translate(546 116) rotate(40) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(528 98) rotate(21) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(506 92) rotate(0) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(484 98) rotate(-21) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(466 116) rotate(-40) scale(0.95)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g><path d="M476 300L501.8 160.7" fill="none" stroke="var(--_ink)" stroke-width="80" stroke-linecap="round"></path><rect class="thumb" x="424" y="122" width="64" height="30" rx="15" fill="var(--_ink)"></rect><ellipse cx="506" cy="138" rx="50" ry="46" fill="var(--_ink)"></ellipse><g class="knuckles" fill="var(--_red)"><path transform="translate(539.5 105.6) rotate(10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(521.8 102.3) rotate(10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(504.1 99.0) rotate(10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(486.4 95.7) rotate(10.5) scale(0.42)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g><g class="prop prop-pils"><g transform="translate(506 150) scale(1.4) translate(-506 -150)"><path d="M496 60L500 24h12l4 36z" fill="#6b3d1c"></path><rect x="498" y="14" width="16" height="11" rx="2" fill="#e9d7b0"></rect><rect x="488" y="58" width="36" height="96" rx="8" fill="#7a4a1e"></rect><rect x="488" y="86" width="36" height="42" fill="#f4ecd8"></rect><rect x="488" y="100" width="36" height="9" fill="var(--_red)"></rect><path d="M495 64v16" fill="none" stroke="#a9733c" stroke-width="4" stroke-linecap="round"></path><g fill="var(--_ink)"><rect x="474" y="126" width="62" height="15" rx="7.5"></rect><rect x="474" y="146" width="62" height="15" rx="7.5"></rect></g></g></g><g class="prop prop-schrippe"><ellipse cx="500" cy="124" rx="44" ry="29" fill="#d9a253"></ellipse><path d="M470 118q30-14 60 0" fill="none" stroke="#a8672a" stroke-width="6" stroke-linecap="round"></path><ellipse cx="486" cy="134" rx="12" ry="5" fill="#eabd78"></ellipse></g><g class="gang"><g class="coin"><circle cx="436" cy="138" r="20" fill="#e1b125"></circle><circle cx="436" cy="138" r="12" fill="none" stroke="#b98d12" stroke-width="3.5"></circle></g></g></g></g></g><g class="shout" fill="none" stroke="var(--_red)" stroke-width="10" stroke-linecap="round"><path d="M196 44l-14-36M260 30v-42M324 44l14-36"></path></g></g></g></g>
<g class="waves" fill="none" stroke="var(--_red)" stroke-width="9" stroke-linecap="round"><path d="M44 62q-16 24 0 48"></path><path d="M18 46q-26 40 0 80"></path><path d="M-8 30q-36 56 0 112"></path></g>
<text class="bang" x="376" y="96" fill="var(--_red)" font-family="Berlin, sans-serif" font-weight="700" font-size="110">!</text>
<g class="dots" fill="var(--_red)"><circle cx="372" cy="92" r="9"></circle><circle cx="402" cy="70" r="11"></circle><circle cx="438" cy="44" r="14"></circle></g>
<text class="hick" x="352" y="92" fill="var(--_red)" font-family="Berlin, sans-serif" font-weight="700" font-size="54">Hick!</text>
<g class="bubbles" fill="none" stroke="var(--_red)" stroke-width="5"><circle cx="150" cy="90" r="9"></circle><circle cx="118" cy="120" r="6"></circle><circle cx="170" cy="130" r="5"></circle></g>
<text class="pst" x="378" y="250" fill="var(--_red)" font-family="Berlin, sans-serif" font-weight="700" font-size="56">Pst!</text>
<g class="crumbs" fill="#d9a253"><circle cx="270" cy="286" r="5"></circle><circle cx="292" cy="292" r="4"></circle><circle cx="252" cy="296" r="4"></circle></g>
<text class="q" x="380" y="84" fill="var(--_red)" font-family="Berlin, sans-serif" font-weight="700" font-size="104">?</text>
<g class="zzz" fill="var(--_red)" font-family="Berlin, sans-serif" font-weight="700"><text x="396" y="130" font-size="60">Z</text><text x="446" y="76" font-size="46">z</text><text x="484" y="32" font-size="34">z</text></g>
</svg></template>
    <template v-else-if="form === 'kopf'"><svg class="svg" viewBox="96 50 328 284" v-bind="a11y"><g class="head"><g class="nod"><g transform="translate(260 300) scale(.93) translate(-260 -300)">
<g class="ear ear-l"><g class="earin"><circle cx="150" cy="96" r="36" fill="var(--_ink)"></circle><path d="M136 92c3-10 10-17 20-19" fill="none" stroke="var(--_white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<g class="ear ear-r"><g class="earin"><circle cx="370" cy="96" r="36" fill="var(--_ink)"></circle><path d="M384 92c-3-10-10-17-20-19" fill="none" stroke="var(--_white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<path d="M200 68H320Q374 82 394 150L406 214Q402 264 352 292L300 316Q260 326 220 316L168 292Q118 264 114 214L126 150Q146 82 200 68Z" fill="var(--_ink)"></path>
<path d="M212 190H308Q336 236 324 280 292 310 260 310 228 310 196 280 184 236 212 190Z" fill="var(--_ink2)"></path>
<g class="blush" fill="var(--_red)"><ellipse cx="170" cy="232" rx="18" ry="11"></ellipse><ellipse cx="350" cy="232" rx="18" ry="11"></ellipse></g><g class="eyes"><g class="eye eye-l"><g class="wide"><g class="blink"><circle cx="208" cy="160" r="14" fill="var(--_white)"></circle><g class="glance"><circle class="pupil" cx="208" cy="162" r="8.5" fill="var(--_ink)"></circle><circle cx="204.5" cy="158" r="2.8" fill="var(--_white)"></circle></g></g></g></g>
<g class="eye eye-r"><g class="wide"><g class="blink"><circle cx="312" cy="160" r="14" fill="var(--_white)"></circle><g class="glance"><circle class="pupil" cx="312" cy="162" r="8.5" fill="var(--_ink)"></circle><circle cx="308.5" cy="158" r="2.8" fill="var(--_white)"></circle></g></g></g></g></g>
<g class="brows" fill="none" stroke="var(--_brow)" stroke-width="11" stroke-linecap="round"><path class="brow brow-l" d="M184 130Q208 117 232 126"></path><path class="brow brow-r" d="M288 126Q312 117 336 130"></path></g><g class="lid" fill="var(--_ink)"><path d="M190 138h38v20l-38-9z"></path><path d="M330 138h-38v20l38-9z"></path></g>
<path class="sleep" d="M192 162q16 11 32 0M296 162q16 11 32 0" fill="none" stroke="var(--_white)" stroke-width="6" stroke-linecap="round"></path>
<g class="grr" fill="var(--_ink)"><path d="M188 134h44v34l-44-18z"></path><path d="M332 134h-44v34l44-18z"></path></g>
<path d="M222 192q38-16 76 0q-4 32-38 40q-34-8-38-40z" fill="var(--_nose)"></path><ellipse cx="246" cy="198" rx="11" ry="5" fill="var(--_white)" opacity=".5"></ellipse>
<g class="blep"><ellipse cx="260" cy="272" rx="12" ry="12" fill="var(--_red)"></ellipse></g>
<g class="smile" fill="none" stroke="var(--_nose)" stroke-width="6" stroke-linecap="round"><path d="M260 232v22"></path><path class="curve" d="M232 252q28 20 56 0"></path></g>
<g class="yawn"><ellipse cx="260" cy="262" rx="28" ry="36" fill="var(--_mouth)"></ellipse><ellipse cx="260" cy="286" rx="15" ry="9" fill="var(--_red)"></ellipse></g><g class="open"><path d="M206 240q54-12 108 0l-10 50q-44 18-88 0z" fill="var(--_mouth)"></path>
<path d="M212 240l13 30 12-33zm96 0l-13 30-12-33zm-66-4l8 17 8-18zm36 0l-8 17-8-18z" fill="var(--_white)"></path><path d="M226 294l8-22 10 26zm68 0l-8-22-10 26z" fill="var(--_white)"></path>
<g class="tongue"><path d="M238 268C236 314 246 340 260 340S284 314 282 268Z" fill="var(--_red)"></path><path d="M260 278v40" fill="none" stroke="var(--_mouth)" stroke-width="4" stroke-linecap="round"></path></g></g>
<g class="gang"><g transform="rotate(-7 260 90)"><path d="M134 118Q124 62 196 40Q262 20 332 38Q400 58 386 118Q260 98 134 118Z" fill="var(--_cap)"></path><path d="M262 30Q214 50 204 106M262 30Q262 70 262 102M262 30Q312 50 318 106" fill="none" stroke="var(--_cap2)" stroke-width="3.5" stroke-linecap="round"></path><circle cx="262" cy="31" r="7" fill="var(--_cap2)"></circle><path d="M134 118Q260 98 386 118L382 130Q260 112 138 130Z" fill="var(--_cap2)"></path><path d="M172 126Q260 110 348 126Q342 152 260 156Q178 152 172 126Z" fill="var(--_cap2)"></path><path d="M190 134Q260 122 330 134" fill="none" stroke="var(--_cap)" stroke-width="3" stroke-linecap="round" opacity=".7"></path></g><g transform="rotate(16 290 262)"><rect x="286" y="254" width="64" height="16" rx="6" fill="#7a4a1e"></rect><rect x="340" y="254" width="12" height="16" rx="5" fill="var(--_red)"></rect><rect x="300" y="254" width="6" height="16" fill="#e1b125"></rect></g><path class="smoke" d="M358 276q-16-22 2-40t-4-44" fill="none" stroke="#c9d1d8" stroke-width="6" stroke-linecap="round"></path></g></g></g></g></svg></template>
    <template v-else><svg class="svg" viewBox="60 60 400 172" v-bind="a11y">
<svg x="0" y="-200" width="520" height="406" viewBox="0 -200 520 406" overflow="hidden"><g><g class="head"><g class="nod"><g transform="translate(260 300) scale(.93) translate(-260 -300)">
<g class="ear ear-l"><g class="earin"><circle cx="150" cy="96" r="36" fill="var(--_ink)"></circle><path d="M136 92c3-10 10-17 20-19" fill="none" stroke="var(--_white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<g class="ear ear-r"><g class="earin"><circle cx="370" cy="96" r="36" fill="var(--_ink)"></circle><path d="M384 92c-3-10-10-17-20-19" fill="none" stroke="var(--_white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<path d="M200 68H320Q374 82 394 150L406 214Q402 264 352 292L300 316Q260 326 220 316L168 292Q118 264 114 214L126 150Q146 82 200 68Z" fill="var(--_ink)"></path>
<path d="M212 190H308Q336 236 324 280 292 310 260 310 228 310 196 280 184 236 212 190Z" fill="var(--_ink2)"></path>
<g class="blush" fill="var(--_red)"><ellipse cx="170" cy="232" rx="18" ry="11"></ellipse><ellipse cx="350" cy="232" rx="18" ry="11"></ellipse></g><g class="eyes"><g class="eye eye-l"><g class="wide"><g class="blink"><circle cx="208" cy="160" r="14" fill="var(--_white)"></circle><g class="glance"><circle class="pupil" cx="208" cy="162" r="8.5" fill="var(--_ink)"></circle><circle cx="204.5" cy="158" r="2.8" fill="var(--_white)"></circle></g></g></g></g>
<g class="eye eye-r"><g class="wide"><g class="blink"><circle cx="312" cy="160" r="14" fill="var(--_white)"></circle><g class="glance"><circle class="pupil" cx="312" cy="162" r="8.5" fill="var(--_ink)"></circle><circle cx="308.5" cy="158" r="2.8" fill="var(--_white)"></circle></g></g></g></g></g>
<g class="brows" fill="none" stroke="var(--_brow)" stroke-width="11" stroke-linecap="round"><path class="brow brow-l" d="M184 130Q208 117 232 126"></path><path class="brow brow-r" d="M288 126Q312 117 336 130"></path></g><g class="lid" fill="var(--_ink)"><path d="M190 138h38v20l-38-9z"></path><path d="M330 138h-38v20l38-9z"></path></g>
<path class="sleep" d="M192 162q16 11 32 0M296 162q16 11 32 0" fill="none" stroke="var(--_white)" stroke-width="6" stroke-linecap="round"></path>
<g class="grr" fill="var(--_ink)"><path d="M188 134h44v34l-44-18z"></path><path d="M332 134h-44v34l44-18z"></path></g>
<path d="M222 192q38-16 76 0q-4 32-38 40q-34-8-38-40z" fill="var(--_nose)"></path><ellipse cx="246" cy="198" rx="11" ry="5" fill="var(--_white)" opacity=".5"></ellipse>
<g class="blep"><ellipse cx="260" cy="272" rx="12" ry="12" fill="var(--_red)"></ellipse></g>
<g class="smile" fill="none" stroke="var(--_nose)" stroke-width="6" stroke-linecap="round"><path d="M260 232v22"></path><path class="curve" d="M232 252q28 20 56 0"></path></g>
<g class="yawn"><ellipse cx="260" cy="262" rx="28" ry="36" fill="var(--_mouth)"></ellipse><ellipse cx="260" cy="286" rx="15" ry="9" fill="var(--_red)"></ellipse></g><g class="open"><path d="M206 240q54-12 108 0l-10 50q-44 18-88 0z" fill="var(--_mouth)"></path>
<path d="M212 240l13 30 12-33zm96 0l-13 30-12-33zm-66-4l8 17 8-18zm36 0l-8 17-8-18z" fill="var(--_white)"></path><path d="M226 294l8-22 10 26zm68 0l-8-22-10 26z" fill="var(--_white)"></path>
<g class="tongue"><path d="M238 268C236 314 246 340 260 340S284 314 282 268Z" fill="var(--_red)"></path><path d="M260 278v40" fill="none" stroke="var(--_mouth)" stroke-width="4" stroke-linecap="round"></path></g></g>
<g class="gang"><g transform="rotate(-7 260 90)"><path d="M134 118Q124 62 196 40Q262 20 332 38Q400 58 386 118Q260 98 134 118Z" fill="var(--_cap)"></path><path d="M262 30Q214 50 204 106M262 30Q262 70 262 102M262 30Q312 50 318 106" fill="none" stroke="var(--_cap2)" stroke-width="3.5" stroke-linecap="round"></path><circle cx="262" cy="31" r="7" fill="var(--_cap2)"></circle><path d="M134 118Q260 98 386 118L382 130Q260 112 138 130Z" fill="var(--_cap2)"></path><path d="M172 126Q260 110 348 126Q342 152 260 156Q178 152 172 126Z" fill="var(--_cap2)"></path><path d="M190 134Q260 122 330 134" fill="none" stroke="var(--_cap)" stroke-width="3" stroke-linecap="round" opacity=".7"></path></g><g transform="rotate(16 290 262)"><rect x="286" y="254" width="64" height="16" rx="6" fill="#7a4a1e"></rect><rect x="340" y="254" width="12" height="16" rx="5" fill="var(--_red)"></rect><rect x="300" y="254" width="6" height="16" fill="#e1b125"></rect></g><path class="smoke" d="M358 276q-16-22 2-40t-4-44" fill="none" stroke="#c9d1d8" stroke-width="6" stroke-linecap="round"></path></g></g></g></g></g></svg><g class="lugpaws"><g fill="var(--_red)"><path transform="translate(104 214) rotate(196) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(124 218) rotate(185) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(144 218) rotate(175) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(164 214) rotate(164) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(356 214) rotate(196) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(376 218) rotate(185) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(396 218) rotate(175) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path><path transform="translate(416 214) rotate(164) scale(0.6)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path></g><svg x="0" y="-200" width="520" height="406" viewBox="0 -200 520 406" overflow="hidden"><g><ellipse cx="134" cy="206" rx="46" ry="32" fill="var(--_ink)"></ellipse><ellipse cx="386" cy="206" rx="46" ry="32" fill="var(--_ink)"></ellipse></g></svg></g></svg></template>
  </div>
</template>

<style lang="scss">
@use "@styles/components/berliner-baer";
@use "@styles/utilities/berliner-baer-keyframes";
</style>
