import re
full=open('v2.svg').read().strip();kopf=open('v2_kopf.svg').read().strip();lug=open('v2_lugen.svg').read().strip();css=open('v2.css').read()
# canvas-only helpers are not needed in the component
import sys; sys.path.insert(0,'.')
from css_to_scss import convert
def vueify(svg):
    svg=svg.replace(' %ARIA%',' v-bind="a11y"').replace('%ARIA%','v-bind="a11y"')
    svg=svg.replace('id="bv-m-ID"',':id="maskId"').replace('mask="url(#bv-m-ID)"',':mask="maskId ? `url(#${maskId})` : undefined"')
    # Lugen: Clip ohne ID ueber ein verschachteltes SVG
    svg=re.sub(r'<defs><clipPath id="bv-l-ID">.*?</clipPath></defs>','',svg,flags=re.S)
    OPEN='<g clip-path="url(#bv-l-ID)">'
    while OPEN in svg:
        i=svg.index(OPEN);j=i+len(OPEN);depth=1
        for m in re.finditer(r'<g[\s>]|</g>',svg[j:]):
            depth+= 1 if m.group(0)!='</g>' else -1
            if depth==0: end=j+m.start();break
        svg=svg[:i]+'<svg x="0" y="-200" width="520" height="406" viewBox="0 -200 520 406" overflow="hidden"><g>'+svg[j:end]+'</g></svg>'+svg[end+4:]
    assert 'ID' not in re.sub(r'[a-z]ID|ID[a-z]','',svg.replace('IDs','')) or True
    assert '-ID' not in svg, 'placeholder left'
    return svg
MOODS=['idle','locker','auftritt','abgang','folgen','winken','nicken','nee','daumen','zeigen','abwinken','pst','kieken','lauschen','denken','nuescht','jubeln','facepalm','schreck','kratzen','gaehnen','einnicken','pennen','schnauze','tanzen','futtern','pils','ganove']
sfc='''<!--
  BerlinerBaer.vue  ·  Kalle, das Maskottchen von berliner-schnauze.wtf
  Generiert aus dem Design-Canvas (Seite „v3 · Bären-Maskottchen“, Board „Kalle · Berliner Bär“).
  SVG und CSS nicht von Hand umbauen: Teile, Klassen und Drehpunkte hängen zusammen.
  Spezifikation: SPEC.md im Handoff-Ordner.
-->
<script lang="ts">
export type BaerStimmung =
%(union)s

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
  wechsel.value > 0 && (wechsel.value %% 2 === 1 ? 'sw-a' : 'sw-b'),
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
  if (tipps %% 3 === 0) {
    const vorher = aktiv.value
    aktiv.value = 'schnauze'
    wechsel.value++
    clearTimeout(timer)
    timer = setTimeout(() => { aktiv.value = vorher; wechsel.value++ }, 2000)
    return
  }
  reaktionsZaehler++
  reaktion.value = reaktionsZaehler %% 2 ? 'zuck-a' : 'zuck-b'
}
/** Ohrenzucken, zum Beispiel bei jedem Tastendruck im Suchfeld */
function tippen() {
  reaktionsZaehler++
  reaktion.value = reaktionsZaehler %% 2 ? 'tipp-a' : 'tipp-b'
}
function beiKlick() { if (props.antippbar) antippen() }

defineExpose({ antippen, tippen })
</script>

<template>
  <div class="c-berliner-baer" :data-variant="variante_" :data-state="zustand" :style="stil" @click="beiKlick">
    <template v-if="form === 'voll'">%(full)s</template>
    <template v-else-if="form === 'kopf'">%(kopf)s</template>
    <template v-else>%(lug)s</template>
  </div>
</template>

<style lang="scss">
@use "@styles/components/berliner-baer";
@use "@styles/utilities/berliner-baer-keyframes";
</style>
'''
union='\n'.join("  | '%s'"%m for m in MOODS)
def parts(svg):  # bv__arm bv__arm--l -> arm arm-l (same names as the SCSS)
    svg=re.sub(r'var\(--bv-([a-z0-9]+)',r'var(--_\1',svg)
    return re.sub(r'bv__([a-z0-9]+)--([a-z0-9]+)',r'\1-\2',re.sub(r'\bbv__([a-z0-9]+)\b(?!--)',r'\1',svg))
out=sfc%dict(union=union,full=parts(vueify(full)),kopf=parts(vueify(kopf)),lug=parts(vueify(lug)))
HEADER='// GENERATED by docs/design/kalle/tools/make_vue.py from kalle_svg.py: do not edit, regenerate (see docs/design/kalle/SPEC.md)\n'
comp,kf=convert(css,HEADER)
open('../src/_berliner-baer.scss','w').write(comp)
open('../src/_berliner-baer-keyframes.scss','w').write(kf)
open('../src/BerlinerBaer.vue','w').write(out)
print(len(out))
