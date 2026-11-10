import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f'expected {count} match(es), got {n}: {old[:80]!r}')
    s = s.replace(old, new)


def cut(start, end_marker):
    """Remove text from start up to and including end_marker; return it."""
    global s
    a = s.index(start)
    b = s.index(end_marker, a) + len(end_marker)
    block = s[a:b]
    s = s[:a] + s[b:]
    return block


rep('<title>Wortseite mobil v2</title>', '<title>Wortseite Desktop v2 Bilder im Hero</title>')

# 1) top tab bar -> left sidebar inside a 3-column grid
a = s.index('<nav aria-label="Inhalt der Wortseite" style="position: sticky; top: 0;')
b = s.index('</nav>', a) + len('</nav>')
sidebar = '''<div class="bs-d">
<nav class="c-sidebar" aria-label="Inhalt der Wortseite" style="position: sticky; top: 1rem;">
<div class="c-sidebar__word"><p class="c-sidebar__word-title">{{d.word}}</p><p class="c-sidebar__word-subtitle">{{posLabel}}</p></div>
<div class="c-sidebar__nav">
<sc-for list="{{tabs}}" as="t" hint-placeholder-count="7"><a class="{{t.cls}}" href="{{t.href}}" aria-current="{{t.current}}" onClick="{{t.pick}}">{{t.label}}</a></sc-for>
</div>
</nav>'''
s = s[:a] + sidebar + s[b:]

rep('<main style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem 1rem 3rem; container-type: inline-size;">',
    '<main style="min-width: 0; display: flex; flex-direction: column; gap: 1.25rem; container-type: inline-size;">')

# 2) images: out of main, into the right column
images = cut('<sc-if value="{{hasImages}}" hint-placeholder-val="{{true}}">\n<section aria-label="Bilder"', 'Erfahre mehr über dieses Wort ↗</a>\n</section>\n</sc-if>')
images = images.replace('<section aria-label="Bilder" style="display: flex; flex-direction: column; gap: 0.5rem;">',
                        '<section class="bs-heroimg" aria-label="Bilder" style="display: flex; flex-direction: column; gap: 0.5rem;">')
images = images.replace('<sc-if value="{{hasImages}}" hint-placeholder-val="{{true}}">', '<sc-if value="{{hasImages}}" hint-placeholder-val="{{true}}">', 1)
hero_end = s.index('</header>')
s = s[:hero_end] + images + '\n' + s[hero_end:]
rep('</main>\n', '</main>\n</div>\n')
rep('<header id="n-bedeutung" class="c-word-hero"', '<header id="n-bedeutung" class="c-word-hero bs-hero"')

# 3) hero headline bigger
rep('style="font-size: clamp(2rem, 11cqi, 2.75rem);"', 'style="font-size: clamp(2.5rem, 6cqi, 3.75rem);"')

# 4) Orthographie + Grammatik side by side
rep('<section class="c-section-card" aria-labelledby="n-ortho">', '<div class="bs-2col">\n<section class="c-section-card" aria-labelledby="n-ortho">')
rep('</section>\n\n<section class="c-section-card" aria-labelledby="n-quant">', '</section>\n</div>\n\n<section class="c-section-card" aria-labelledby="n-quant">')

# 5) larger letter tiles
rep('max-width: 44px; height: 52px;', 'max-width: 64px; height: 72px;')
rep("font-size: 1.15rem; font-weight: 700; color: var(--color-ink-strong); background: var(--surface-chip); border-radius: var(--radius-xxs);'",
    "font-size: 1.6rem; font-weight: 700; color: var(--color-ink-strong); background: var(--surface-chip); border-radius: var(--radius-xxs);'")

# 6) sidebar link classes
rep("({ label, href, current: tab === id ? 'true' : 'false',",
    "({ label, href, cls: 'c-sidebar__link' + (tab === id ? ' is-active' : ''), current: tab === id ? 'true' : 'false',")

# 7) desktop layout css
css = '''
.bs-d{max-width:1160px;margin:0 auto;padding:32px 24px 80px;display:grid;grid-template-columns:200px minmax(0,1fr);gap:2rem;align-items:start}
.bs-hero.c-word-hero{display:grid !important;grid-template-columns:minmax(0,1fr) minmax(220px,38%);column-gap:2rem;align-items:start}
.bs-hero > *{grid-column:1}
.bs-hero > .bs-heroimg{grid-column:2;grid-row:1 / span 3}
.bs-heroimg .c-image-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;overflow:visible}
.bs-heroimg .c-image-strip > figure{flex:none;margin:0}
.bs-heroimg .c-image-strip > figure:first-child{grid-column:1 / -1}
.bs-heroimg .c-image-strip > figure:not(:first-child) figcaption{display:none}
.bs-heroimg .c-image-strip__btn{box-shadow:var(--paper-lift)}
.bs-2col{display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start}
.bs-d .c-shelf{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible}
.bs-d .c-book{flex:none;display:grid;grid-template-columns:64px minmax(0,1fr);grid-auto-rows:min-content;column-gap:1rem;row-gap:.25rem;align-content:start;padding:.875rem}
.bs-d .c-book > :first-child{grid-row:1 / span 5;width:64px;aspect-ratio:3 / 4 !important;padding:0 !important}
.bs-d .c-book > :first-child > span{display:none}
.bs-d .c-book > :not(:first-child){grid-column:2}
.bs-d .c-book > :last-child{margin-top:.25rem !important;min-height:32px !important}
.bs-d #n-umfeld .c-section-card__body{display:grid;grid-template-columns:1fr 1fr;gap:2rem}
.bs-d nav[aria-labelledby="n-weiter"]{display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem !important}
.bs-d nav[aria-labelledby="n-weiter"] > h2,.bs-d nav[aria-labelledby="n-weiter"] > sc-if,.bs-d nav[aria-labelledby="n-weiter"] > div{grid-column:1/-1}
.bs-d .c-section-card__header{padding:1rem 1.5rem}
.bs-d .c-section-card__body{padding:0 1.5rem 1.5rem}
.bs-d .c-section-card__footer{padding:.75rem 1.5rem}
.bs-d .c-word-hero{padding:2rem !important}
.bs-d .bs-kbdhint{display:inline-flex}
.bs-d .bs-submitrow .c-button--primary{flex:0 0 auto}
@media (max-width:1000px){.bs-hero.c-word-hero{grid-template-columns:1fr}.bs-hero > .bs-heroimg{grid-column:1;grid-row:auto}}
@media (max-width:807px){.bs-d{display:flex;flex-direction:column}.c-sidebar{position:static !important}.bs-2col,.bs-d #n-umfeld .c-section-card__body{grid-template-columns:1fr}}
'''
rep('/*desktop*/', css.strip() + '\n.c-sidebar__word-title{overflow-wrap:anywhere}')

rep('"$preview":{"width":390,"height":4900}', '"$preview":{"width":1280,"height":3400}')

rep('isDesktop() { return false; }', 'isDesktop() { return true; }')
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
