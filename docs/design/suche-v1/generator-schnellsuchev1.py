from common import *
import json as _j
_src=open(S+'gen/fresh/suchev1.py').read()
exec(_src[:_src.index("CSS=FONTS")])   # FONTS, W, A, L_KI, IC, row()

IC2=dict(IC)
IC2.update({
'clock':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
'shuffle':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6c1 1.7 2.3 2.7 4.3 2.7H21M3 17h3.5c1.3 0 2.3-.4 3.1-1.2M14.4 8.2c.8-.8 1.8-1.2 3.1-1.2H21"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/></svg>',
'list':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
'plus':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
'arrow':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
'filter':IC['filter'],
})

DATA=_j.dumps({'W':[row(t) for t in W],'A':[row(t) for t in A],'KI':[row(t) for t in L_KI]},ensure_ascii=False)

CSS=FONTS+r'''
.q1{--page:#efe6db;--card:#fff;--card2:#fbf1e6;--card3:#f5dfca;--t3:#535e69;--line:rgb(43 51 59 / 14%);--d-bl:#3d6f9c;
  --fira:'Fira Sans Extra Condensed',var(--font-body),sans-serif;
  position:relative;min-height:860px;overflow:hidden;background:var(--page);color:var(--color-body);font-family:var(--font-body);letter-spacing:.3px}
[data-theme="dark"].q1{--page:#1b2127;--card:#2e363f;--card2:#38424c;--card3:#46525e;--t3:#a8b2bc;--line:rgb(255 255 255 / 12%);--d-bl:#8fb4d6}
.q1 *{box-sizing:border-box}
.q1 button{font:inherit;letter-spacing:inherit;color:inherit}
.q1 a{color:inherit;text-decoration:none}

/* angedeutete Seite dahinter */
.q1__bg{position:absolute;inset:0;padding:40px 24px;filter:blur(3px);opacity:.9}
.q1__bg i{display:block;max-width:1160px;margin:0 auto 16px;border-radius:4px;background:var(--card)}
.q1__bg i:nth-child(1){height:280px}.q1__bg i:nth-child(2){height:180px}.q1__bg i:nth-child(3){height:320px}
.q1__scrim{position:absolute;inset:0;background:rgb(16 20 24 / 55%);backdrop-filter:blur(2px)}
[data-theme="light"] .q1__scrim{background:rgb(27 33 39 / 28%);backdrop-filter:blur(4px)}

/* Dialog */
.q1__dlg{position:relative;z-index:2;display:flex;flex-direction:column;width:min(720px,calc(100% - 48px));max-height:calc(100% - 128px);margin:72px auto 0;background:var(--card);border-radius:6px;box-shadow:0 24px 64px rgb(0 0 0/40%),0 0 0 1px var(--line);overflow:hidden;animation:q1in .18s ease}
.q1--m{min-height:844px}
.q1--m .q1__dlg{width:100%;max-height:none;height:844px;margin:0;border-radius:0;box-shadow:none}
.q1--m .q1__bg,.q1--m .q1__scrim{display:none}

/* Eingabe */
.q1__top{display:flex;align-items:center;gap:6px;padding:0 10px 0 20px;height:64px;border-bottom:1px solid var(--line)}
.q1__top>svg{flex:0 0 auto;color:var(--t3)}
.q1__top input{flex:1;min-width:0;height:100%;padding:0 8px 0 10px;border:0;background:none;color:var(--color-ink-strong);font:inherit;font-size:1.25rem;letter-spacing:.3px;outline:none}
.q1__top input::placeholder{color:var(--t3);opacity:1}
.q1__top input::-webkit-search-cancel-button{display:none}
.q1__ib{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:4px;background:none;color:var(--t3);cursor:pointer}
.q1__ib:hover{background:var(--card2);color:var(--color-ink-strong)}
.q1__ki{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 12px;border:1.5px solid var(--orange-500);border-radius:4px;background:none;font-size:.875rem;font-weight:700;color:var(--color-ink-strong);cursor:pointer;white-space:nowrap}
.q1__ki svg{width:18px;height:18px;color:var(--orange-500)}
.q1__ki:hover,.q1__ki[aria-pressed="true"]{background:var(--card2)}
.q1__esc{height:24px;margin-left:4px;padding:0 7px;border:1px solid var(--line);border-radius:3px;background:none;font-size:.8125rem;color:var(--t3);cursor:pointer}
.q1__cancel{min-height:44px;padding:0 4px 0 8px;border:0;background:none;font-size:1rem;font-weight:700;color:var(--color-ink-strong);cursor:pointer}
.q1--m .q1__top{height:60px;padding:0 8px 0 16px}
.q1--m .q1__top input{font-size:1.125rem}
.q1--m .q1__ki{width:44px;height:44px;padding:0;justify-content:center}
.q1--m .q1__ki span{display:none}
.q1--m .q1__ib{width:44px;height:44px}

/* Liste */
.q1__body{flex:1;overflow:auto;padding:6px 0 10px;overscroll-behavior:contain}
.q1__grp{margin:0;padding:0;list-style:none}
.q1__gh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:12px 20px 6px;font-size:.8125rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}
.q1__gh button{padding:0;border:0;background:none;font-size:.8125rem;font-weight:400;letter-spacing:.3px;text-transform:none;color:var(--t3);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.q1__it{position:relative;display:flex;align-items:center;gap:12px;min-height:48px;margin:0 8px;padding:6px 12px;border-radius:4px;cursor:pointer}
.q1__it:hover{background:var(--card2)}
.q1__it.is-act{background:var(--card2);box-shadow:inset 3px 0 0 var(--orange-500)}
.q1__ic{display:grid;place-items:center;flex:0 0 32px;height:32px;border-radius:4px;background:var(--card2);color:var(--t3)}
.q1__it.is-act .q1__ic,.q1__it:hover .q1__ic{background:var(--card3);color:var(--color-ink-strong)}
.q1__ic--0{background:none!important}
.q1__pl{border:0;cursor:pointer;color:var(--color-ink-strong)}
.q1__pl:hover{background:var(--orange-600)!important;color:#fff!important}
.q1__bi{display:inline-grid;place-items:center;width:22px;height:22px;margin-left:6px;border-radius:50%;vertical-align:-3px;background:color-mix(in srgb,var(--orange-500) 16%,transparent);color:var(--color-accent-text)}
.q1__bi--wdt{background:var(--orange-600);color:#fff}
.q1__links{display:flex;gap:16px}
.q1__links a{display:inline-flex;align-items:center;gap:6px;min-height:36px;font-size:.875rem;color:var(--color-body)}
.q1__links a svg{width:16px;height:16px;color:var(--t3)}
.q1__links a:hover{text-decoration:underline;text-underline-offset:3px}
.q1__kh{display:inline-flex;align-items:center;gap:6px}
.q1--m .q1__kh{display:none}
.q1--m .q1__links{gap:12px}
.q1--m .q1__links a{min-height:44px;font-size:.8125rem;white-space:nowrap}
.q1--m .q1__links a svg{display:none}
.q1--m .q1__full{font-size:.8125rem;white-space:nowrap}
.q1--m .q1__foot{gap:12px;padding-left:16px;padding-right:12px}
.q1__ic--ki{color:var(--orange-500)!important}
.q1__tx{flex:1;min-width:0;display:flex;align-items:baseline;gap:10px}
.q1__w{flex:0 0 auto;font-size:1.125rem;font-weight:700;color:var(--color-ink-strong);white-space:nowrap}
.q1__w small{font-size:.9375rem;font-weight:400;color:var(--t3)}
.q1__m{flex:1;min-width:0;font-size:.9375rem;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.q1__m b{font-weight:400;color:var(--color-body)}
.q1 mark{background:color-mix(in srgb,var(--orange-500) 22%,transparent);color:var(--color-ink-strong);border-radius:2px}
.q1__lt{flex:1;min-width:0}
.q1__lt b{display:block;font-size:1rem;font-weight:700;color:var(--color-ink-strong)}
.q1__lt small{display:block;font-size:.8125rem;color:var(--t3)}
.q1__b{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;min-height:22px;padding:0 8px;border-radius:999px;font-size:.8125rem;font-weight:700}
.q1__b--wdt{background:var(--orange-600);color:#fff}
.q1__b--tr{background:color-mix(in srgb,var(--orange-500) 16%,transparent);color:var(--color-accent-text)}
.q1__ret{flex:0 0 auto;display:none;align-items:center;gap:4px;font-size:.8125rem;color:var(--t3)}
.q1__ret span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:3px;background:var(--card3);color:var(--color-ink-strong)}
.q1__it.is-act .q1__ret{display:inline-flex}
.q1__x{flex:0 0 auto;display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:50%;background:none;color:var(--t3);cursor:pointer;opacity:0}
.q1__it:hover .q1__x,.q1__it.is-act .q1__x{opacity:1}
.q1__x:hover{background:var(--card3);color:var(--color-ink-strong)}
.q1--m .q1__it{min-height:52px;margin:0;padding:6px 16px;border-radius:0}
.q1--m .q1__gh{padding:14px 16px 6px}
.q1--m .q1__tx{flex-direction:column;gap:0}
.q1--m .q1__m{width:100%}
.q1--m .q1__x{opacity:1;width:44px;height:44px}
.q1--m .q1__ret{display:none!important}
.q1--m .q1__it.is-act{background:none;box-shadow:none}
.q1__sep{height:1px;margin:8px 20px;background:var(--line)}
.q1__prog{flex:0 0 120px;height:4px;border-radius:999px;background:var(--card3);overflow:hidden}
.q1__prog i{display:block;width:38%;height:100%;border-radius:999px;background:var(--orange-500);animation:q1p 1.4s ease-in-out infinite}
.q1__why{display:block;margin-top:1px;font-size:.8125rem;color:var(--t3)}

/* Leer */
.q1__empty{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;padding:20px 24px 12px}
.q1__empty h2{margin:0;font-family:var(--fira);font-weight:600;font-size:1.375rem;letter-spacing:.3px;color:var(--color-ink-strong)}
.q1__empty p{margin:4px 0 0;font-size:.9375rem;color:var(--t3)}
.q1__mein{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}
.q1__mein a{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;background:var(--card2);font-weight:700;color:var(--color-ink-strong)}
.q1__mein a:hover{background:var(--card3)}
.q1--m .q1__empty{grid-template-columns:1fr;padding:16px}

/* Skeleton */
.q1__sk{display:flex;gap:12px;align-items:center;height:48px;margin:0 8px;padding:0 12px}
.q1__sk i{display:block;height:14px;border-radius:3px;background:linear-gradient(90deg,var(--card2),var(--card3),var(--card2));background-size:200% 100%;animation:q1sh 1.4s linear infinite}
.q1__sk i:first-child{width:110px;height:18px}.q1__sk i:last-child{flex:1;max-width:320px}

/* Fuß */
.q1__foot{display:flex;align-items:center;gap:18px;padding:10px 16px 10px 20px;border-top:1px solid var(--line);background:var(--card);font-size:.8125rem;color:var(--t3)}
.q1__foot>span{display:inline-flex;align-items:center;gap:6px}
.q1__kbd{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 5px;border-radius:3px;background:var(--card2);color:var(--color-ink-strong);font-size:.8125rem}
.q1__foot .q1__sp{flex:1}
.q1__full{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 4px;font-size:.875rem;font-weight:700;color:var(--color-ink-strong)}
.q1__full:hover{text-decoration:underline;text-underline-offset:3px}
.q1--m .q1__foot{justify-content:space-between;padding:8px 16px calc(8px + env(safe-area-inset-bottom))}
.q1--m .q1__foot>span{display:none}
.q1--m .q1__full{min-height:44px}

.q1 :focus-visible{outline:2px solid var(--orange-400);outline-offset:2px}
@keyframes q1in{from{opacity:0;transform:translateY(-8px) scale(.99)}to{opacity:1;transform:none}}
@keyframes q1p{0%{transform:translateX(-100%)}100%{transform:translateX(270%)}}
@keyframes q1sh{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.q1 *{animation:none!important;transition:none!important}}
'''

def WROW(lst):
    return ('<sc-for list="{{%s}}" as="r" hint-placeholder-count="4"><li class="{{r.cls}}" id="{{r.id}}" role="option" aria-selected="{{r.sel}}" onMouseEnter="{{r.hov}}">'
     '<sc-if value="{{r.audio}}" hint-placeholder-val="{{false}}"><button class="q1__ic q1__pl" aria-label="{{r.playL}}" tabindex="-1" title="Anhören">'+IC2['play']+'</button></sc-if><sc-if value="{{r.noAudio}}" hint-placeholder-val="{{true}}"><span class="q1__ic q1__ic--0" aria-hidden="true"></span></sc-if><span class="q1__tx"><span class="q1__w"><sc-for list="{{r.wp}}" as="p" hint-placeholder-count="1"><sc-if value="{{p.mk}}" hint-placeholder-val="{{false}}"><mark>{{p.t}}</mark></sc-if><sc-if value="{{p.pl}}" hint-placeholder-val="{{true}}">{{p.t}}</sc-if></sc-for><sc-if value="{{r.hasArt}}" hint-placeholder-val="{{true}}"><small>, {{r.art}}</small></sc-if><sc-if value="{{r.wdt}}" hint-placeholder-val="{{false}}"><span class="q1__bi q1__bi--wdt" title="Wort des Tages" aria-label="Wort des Tages" role="img">'+IC2['cal']+'</span></sc-if><sc-if value="{{r.trend}}" hint-placeholder-val="{{false}}"><span class="q1__bi" title="Gerade beliebt" aria-label="Gerade beliebt" role="img">'+IC2['trend']+'</span></sc-if></span>'
     '<span class="q1__m"><sc-for list="{{r.mp}}" as="p" hint-placeholder-count="1"><sc-if value="{{p.mk}}" hint-placeholder-val="{{false}}"><mark>{{p.t}}</mark></sc-if><sc-if value="{{p.pl}}" hint-placeholder-val="{{true}}">{{p.t}}</sc-if></sc-for><sc-if value="{{r.hasWhy}}" hint-placeholder-val="{{false}}"><span class="q1__why">{{r.why}}</span></sc-if></span></span>'
     
     '<span class="q1__ret" aria-hidden="true"><span>'+IC2['enter']+'</span></span></li></sc-for>')%lst

def AROW(lst):
    return ('<sc-for list="{{%s}}" as="a" hint-placeholder-count="2"><li class="{{a.cls}}" id="{{a.id}}" role="option" aria-selected="{{a.sel}}" onMouseEnter="{{a.hov}}" onClick="{{a.go}}">'
     '<span class="{{a.icCls}}"><sc-if value="{{a.iKi}}" hint-placeholder-val="{{false}}">'+IC2['spark']+'</sc-if><sc-if value="{{a.iList}}" hint-placeholder-val="{{false}}">'+IC2['list']+'</sc-if><sc-if value="{{a.iShuf}}" hint-placeholder-val="{{false}}">'+IC2['shuffle']+'</sc-if><sc-if value="{{a.iPlus}}" hint-placeholder-val="{{false}}">'+IC2['plus']+'</sc-if><sc-if value="{{a.iClock}}" hint-placeholder-val="{{false}}">'+IC2['clock']+'</sc-if><sc-if value="{{a.iFilter}}" hint-placeholder-val="{{false}}">'+IC2['filter']+'</sc-if></span>'
     '<span class="q1__lt"><b>{{a.t}}</b><sc-if value="{{a.hasSub}}" hint-placeholder-val="{{true}}"><small>{{a.sub}}</small></sc-if></span>'
     '<sc-if value="{{a.run}}" hint-placeholder-val="{{false}}"><span class="q1__prog" role="progressbar" aria-label="Suche nach Bedeutung läuft"><i></i></span></sc-if>'
     '<sc-if value="{{a.rm}}" hint-placeholder-val="{{false}}"><button class="q1__x" tabindex="-1" aria-hidden="true" title="{{a.rmL}}" onClick="{{a.rmF}}">'+IC2['xs']+'</button></sc-if>'
     '<span class="q1__ret" aria-hidden="true"><span>'+IC2['enter']+'</span></span></li></sc-for>')%lst

def GRP(cond,title,inner,extra=''):
    return ('<sc-if value="{{%s}}" hint-placeholder-val="{{true}}"><div role="group" aria-label="%s"><div class="q1__gh" aria-hidden="true"><span>%s</span>%s</div><ul class="q1__grp" role="presentation">%s</ul></div></sc-if>')%(cond,title.replace('{{','').replace('}}',''),title,extra,inner)

BODY=('<div class="{{rootCls}}" data-theme="{{theme}}"><div class="q1__bg" aria-hidden="true"><i></i><i></i><i></i></div><div class="q1__scrim" aria-hidden="true"></div>'
 '<div class="q1__dlg" role="dialog" aria-modal="true" aria-label="Schnellsuche">'
 '<div class="q1__top">'+IC2['search']+'<input type="search" role="combobox" aria-expanded="true" aria-controls="q1list" aria-activedescendant="{{actId}}" aria-autocomplete="list" autocomplete="off" value="{{q}}" onInput="{{typed}}" onKeyDown="{{keyd}}" placeholder="{{ph}}" aria-label="Wort oder Bedeutung suchen">'
 '<sc-if value="{{hasQ}}" hint-placeholder-val="{{false}}"><button class="q1__ib" onClick="{{clearQ}}" aria-label="Suche leeren">'+IC2['x']+'</button></sc-if>'
 '<sc-if value="{{isDesk}}" hint-placeholder-val="{{true}}"><button class="q1__esc" aria-label="Schließen">esc</button></sc-if><sc-if value="{{isMob}}" hint-placeholder-val="{{false}}"><button class="q1__cancel">Abbrechen</button></sc-if></div>'
 '<div class="q1__body" id="q1list" role="listbox" aria-label="Vorschläge">'
 # leer: Verlauf, WdT, beliebt, Abkürzungen
 '<sc-if value="{{isIdle}}" hint-placeholder-val="{{true}}">'
 +GRP('hasRecent','Zuletzt jesucht',AROW('recent'),'<button onClick="{{clearRecent}}">Verlauf löschen</button>')
 +GRP('isIdle','Heute',WROW('today'))
 +GRP('isIdle','Gerade beliebt',WROW('trendRows'))
 +'</sc-if>'
 # Laden
 '<sc-if value="{{isLoad}}" hint-placeholder-val="{{false}}"><div aria-busy="true" aria-label="Treffer werden jeladen" style="padding-top: 10px;"><div class="q1__sk"><i></i><i></i></div><div class="q1__sk"><i></i><i></i></div><div class="q1__sk"><i></i><i></i></div><div class="q1__sk"><i></i><i></i></div></div></sc-if>'
 # Treffer
 '<sc-if value="{{hasHits}}" hint-placeholder-val="{{false}}">'
 +GRP('hasKiTop','Klingt nach ’ner Beschreibung',AROW('kiTop'))
 +GRP('hasKiRes','Nach Bedeutung',WROW('kiRows'),'<span style="text-transform: none; letter-spacing: .3px; font-weight: 400;">Chrome-KI, lokal in deinem Browser</span>')
 +GRP('hasW','Im Wort',WROW('wRows'))
 +GRP('hasM','In der Bedeutung',WROW('mRows'))
 +'<div class="q1__sep" role="presentation"></div><ul class="q1__grp" role="presentation">'+AROW('hitActions')+'</ul></sc-if>'
 # Nichts
 '<sc-if value="{{isNone}}" hint-placeholder-val="{{false}}"><div class="q1__empty">'+kalle('nuescht',84,'q1e')+'<div><h2>Nüscht jefunden für „{{q}}“</h2><p>Weder im Wort noch in den Bedeutungen.</p><div class="q1__mein"><span style="font-size: .8125rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3); margin-right: 4px;">Meinste</span><a href="#">Schrippe</a><a href="#">Schippe</a><a href="#">Strippe</a></div></div></div>'
 '<div class="q1__sep" role="presentation"></div><ul class="q1__grp" role="presentation">'+AROW('noneActions')+'</ul></sc-if>'
 '</div>'
 '<div class="q1__foot"><sc-if value="{{isIdleFoot}}" hint-placeholder-val="{{true}}"><nav class="q1__links" aria-label="Mehr"><a href="#">'+IC2['shuffle']+'Zufälliges Wort</a><a href="#">'+IC2['plus']+'Wort vorschlagen</a></nav><sc-if value="{{onRecent}}" hint-placeholder-val="{{false}}"><span class="q1__kh"><span class="q1__kbd">Entf</span> aus Verlauf entfernen</span></sc-if></sc-if>'
 '<sc-if value="{{isHitsFoot}}" hint-placeholder-val="{{false}}"><span class="q1__kh"><span class="q1__kbd">'+IC2['up']+'</span><span class="q1__kbd">'+IC2['down']+'</span> navigieren</span><span class="q1__kh"><span class="q1__kbd">'+IC2['enter']+'</span> öffnen</span><span class="q1__kh"><span class="q1__kbd">{{modKey}}</span><span class="q1__kbd">'+IC2['enter']+'</span> alle Treffer</span></sc-if><span class="q1__sp"></span>'
 '<a class="q1__full" href="#">{{fullTxt}}'+IC2['arrow']+'</a></div>'
 '</div></div>')

SCRIPT=r'''const D = @@DATA@@;
const QS = { leer: '', tippen: 'schrip', bedeutung: 'brötchen', ki: 'jemand ist lustig', nichts: 'schrippö', laden: 'bul' };
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function hl(t, q) {
  if (!q || q.length < 2) return [{ t, mk: false, pl: true }];
  return t.split(new RegExp('(' + esc(q) + ')', 'ig')).filter(Boolean).map(s => { const mk = s.toLowerCase() === q.toLowerCase(); return { t: s, mk, pl: !mk }; });
}
class Component extends DCLogic {
  constructor(props) {
    super(props);
    const z = (props && props.zustand) || 'leer';
    const ki = (props && props.ki) || 'aus';
    this.state = { q: QS[z] ?? '', z, act: z === 'leer' ? -1 : 0, ki: z === 'ki' ? ki : 'aus',
      recent: ['Schrippe', 'jwd', 'Kiez', 'wie sagt man zu Brötchen'] };
  }
  componentWillUnmount() { clearTimeout(this.t); }
  renderVals() {
    const st = this.state, p = this.props || {};
    const mob = (p.size || 'desktop') === 'mobile';
    const q = st.q || '', qt = q.trim(), ql = qt.toLowerCase();
    const set = s => this.setState(s);
    const describe = qt.split(/\s+/).filter(Boolean).length >= 3;
    const kiGo = () => { clearTimeout(this.t); set({ ki: 'laeuft' }); this.t = setTimeout(() => this.setState({ ki: 'fertig' }), 1600); };

    let mode = 'idle';
    if (st.z === 'laden') mode = 'load';
    else if (qt) mode = 'hits';
    let wHits = [], mHits = [];
    if (mode === 'hits') {
      const all = D.W.concat(D.A, D.KI.filter(k => !D.W.some(w => w.w === k.w)));
      const seen = new Set();
      const uniq = all.filter(r => !seen.has(r.w) && seen.add(r.w));
      wHits = uniq.filter(r => r.w.toLowerCase().includes(ql)).sort((a, b) => (b.w.toLowerCase().startsWith(ql) ? 1 : 0) - (a.w.toLowerCase().startsWith(ql) ? 1 : 0));
      mHits = uniq.filter(r => !r.w.toLowerCase().includes(ql) && r.m.some(m => m.toLowerCase().includes(ql)));
      if (describe) mHits = uniq.filter(r => r.m.some(m => m.toLowerCase().includes('lustig')));
      if (!wHits.length && !mHits.length && st.ki !== 'fertig' && st.ki !== 'laeuft') mode = 'none';
    }
    const total = wHits.length + mHits.length;
    const showW = wHits.slice(0, 5), showM = mHits.slice(0, 4);
    const kiRes = st.ki === 'fertig' ? D.KI.slice(0, 3) : [];

    // Navigierbare Einträge
    const nav = [];
    const word = (r, grp) => {
      const i = nav.length; nav.push(r.w);
      const hlq = describe ? 'lustig' : qt;
      return { id: 'q' + i, cls: 'q1__it' + (i === st.act ? ' is-act' : ''), sel: String(i === st.act), hov: () => set({ act: i }),
        audio: r.audio, noAudio: !r.audio, playL: r.w + ' anhören', wp: hl(r.w, grp === 'w' ? qt : ''), art: r.art, hasArt: !!r.art,
        mp: hl(r.m.join(', '), grp === 'm' ? hlq : ''), wdt: r.f.includes('wdt'), trend: r.f.includes('trend'),
        hasWhy: grp === 'ki' && !!r.why, why: r.why };
    };
    const act = (o) => {
      const i = nav.length; nav.push(o.t);
      return Object.assign({ id: 'q' + i, cls: 'q1__it' + (i === st.act ? ' is-act' : ''), sel: String(i === st.act), hov: () => set({ act: i }),
        icCls: 'q1__ic' + (o.ic === 'ki' ? ' q1__ic--ki' : ''), iKi: o.ic === 'ki', iList: o.ic === 'list', iShuf: o.ic === 'shuf', iPlus: o.ic === 'plus', iClock: o.ic === 'clock', iFilter: o.ic === 'filter',
        hasSub: !!o.sub, sub: o.sub || '', run: !!o.run, rm: !!o.rmF, rmL: o.rmL || '', rmF: o.rmF || (() => {}), go: o.go || (() => {}) }, { t: o.t });
    };

    const recent = mode === 'idle' ? st.recent.slice(0, 3).map(t => act({ t, ic: 'clock', rmL: '„' + t + '“ aus dem Verlauf entfernen', rmF: (e) => { if (e && e.stopPropagation) e.stopPropagation(); set({ recent: st.recent.filter(x => x !== t) }); }, go: () => set({ q: t, z: 'live', act: 0 }) })) : [];
    const today = mode === 'idle' ? [word(D.W[0], 'x')] : [];
    const trendRows = mode === 'idle' ? [word(D.W[8], 'x'), word(D.W[10], 'x'), word(D.W[9], 'x')] : [];
    const shortcuts = mode === 'idle' ? [
      act({ t: 'Zufälliges Wort', sub: 'Lass dich überraschen', ic: 'shuf' }),
      act({ t: 'Alle Wörter von A bis Z', sub: 'Mit Filtern nach Gebrauch, Inhalt und Wortform', ic: 'list' }),
      act({ t: 'Wort vorschlagen', sub: 'Fehlt een Wort? Schick’s mir.', ic: 'plus' }) ] : [];

    const mkKi = () => st.ki === 'laeuft'
      ? act({ t: 'Ick such nach Bedeutung …', sub: 'Chrome-KI vergleicht „' + qt + '“ mit den Bedeutungen', ic: 'ki', run: true })
      : act({ t: 'Nach Bedeutung suchen: „' + qt + '“', sub: describe ? 'Findet passende Wörter, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.' : 'Findet passende Wörter, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.', ic: 'ki', go: kiGo });
    const kiFirst = mode === 'hits' && describe && st.ki !== 'fertig';
    const kiTop = kiFirst ? [mkKi()] : [];
    const kiRows = kiRes.map(r => word(r, 'ki'));
    const wRows = showW.map(r => word(r, 'w'));
    const mRows = showM.map(r => word(r, 'm'));
    const kiRow = (mode === 'hits' && !kiFirst && st.ki !== 'fertig') ? mkKi() : null;
    const hitActions = mode === 'hits' ? (kiRow ? [kiRow] : []).concat([
      act({ t: total === 1 ? 'Treffer auf der Suchseite ansehen' : 'Alle ' + total + ' Treffer anzeigen', sub: 'Mit Filtern und Sortierung', ic: 'filter' }) ]) : [];
    const noneActions = mode === 'none' ? [
      (st.ki === 'laeuft' ? mkKi() : act({ t: 'Nach Bedeutung suchen: „' + qt + '“', sub: 'Vielleicht passt een Wort, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.', ic: 'ki', go: kiGo })),
      act({ t: 'Wort vorschlagen: „' + qt + '“', sub: 'Wenn’s dit Wort jibt, prüf ick’s und nehm’s uff.', ic: 'plus' }) ] : [];

    // Reihenfolge der Tastaturnavigation = Reihenfolge im DOM: KI-Ergebnis, Wort, Bedeutung, Aktionen
    const n = nav.length;
    const recentN = mode === 'idle' ? Math.min(3, st.recent.length) : 0;
    const onRecent = mode === 'idle' && st.act >= 0 && st.act < recentN;
    const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
    return {
      theme: p.theme || 'dark',
      rootCls: 'q1 ' + (mob ? 'q1--m' : 'q1--d'),
      isDesk: !mob, isMob: mob,
      q, hasQ: !!qt, ph: mob ? 'Wort oder Bedeutung' : 'Such ’n Wort oder wat et bedeutet',
      typed: (e) => { const v = e && e.target ? e.target.value : ''; set({ q: v, z: 'live', act: v.trim() ? 0 : -1, ki: 'aus' }); },
      keyd: (e) => {
        if (!e) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); set({ act: (st.act + 1) % Math.max(n, 1) }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); set({ act: st.act <= 0 ? n - 1 : st.act - 1 }); }
        else if (e.key === 'Delete' && mode === 'idle' && st.act >= 0 && st.act < recentN) { e.preventDefault(); const t = st.recent[st.act]; set({ recent: st.recent.filter(x => x !== t), act: -1 }); }
        else if (e.key === 'Enter' && e.shiftKey && qt) { e.preventDefault(); kiGo(); }
      },
      clearQ: () => set({ q: '', z: 'live', act: -1, ki: 'aus' }),
      kiGo, kiPressed: String(st.ki === 'laeuft' || st.ki === 'fertig'),
      actId: n && st.act >= 0 ? 'q' + st.act : '', isHitsFoot: mode !== 'idle', isIdleFoot: mode === 'idle', onRecent, modKey: mac ? '⌘' : 'Strg',
      isIdle: mode === 'idle', isLoad: mode === 'load', hasHits: mode === 'hits', isNone: mode === 'none',
      hasRecent: mode === 'idle' && st.recent.length > 0, recent, clearRecent: () => set({ recent: [], act: -1 }),
      today, trendRows, shortcuts,
      hasKiTop: kiTop.length > 0, kiTop, hasKiRes: kiRows.length > 0, kiRows, hasW: wRows.length > 0, wRows, hasM: mRows.length > 0, mRows,
      hitActions, noneActions,
      fullTxt: mode === 'hits' ? 'Zur Suchseite' : 'Alle Wörter A–Z',
    };
  }
}'''.replace('@@DATA@@',DATA)

PROPS2={"theme":{"editor":"enum","options":["dark","light"],"default":"dark"},
 "size":{"editor":"enum","options":["mobile","desktop"],"default":"desktop"},
 "zustand":{"editor":"enum","options":["leer","tippen","bedeutung","ki","nichts","laden"],"default":"leer"},
 "ki":{"editor":"enum","options":["aus","laeuft","fertig"],"default":"aus"}}

html=comp('Schnellsuche v1',CSS,BODY,SCRIPT,kalle_css=True)
html=html.replace(_j.dumps(PROPS),_j.dumps(PROPS2,ensure_ascii=False))
open(S+'canvas/project/SchnellsucheV1.dc.html','w').write(html)
print('ok',len(html))
