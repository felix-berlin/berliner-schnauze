from common import *
import json as _j

FONTS=''.join(ff('Fira Sans Extra Condensed','fira-sans-extra-condensed-latin-%d-normal.woff2'%w,w) for w in (600,800))

# --- Mock-Daten (erfunden bzw. öffentliche Wörterbuch-Inhalte, keine Nutzerdaten) ---
# w, art, pos, bedeutungen, audio, jesagt% (None = unter 10 Stimmen), region, flags
W=[
 ('Schrippe','die','Substantiv',['Brötchen','zwei aneinander jebackene: Doppelte'],1,63,'beides','wdt bsp bild jesch wiss ber0'),
 ('Splitterbrötchen','das','Substantiv',['Gebäck aus Blätterteig mit Rosinen'],0,21,'ost','bsp'),
 ('Wasserschrippe','die','Substantiv',['Brötchen ohne Fett, nur mit Wasser jebacken'],0,22,'beides',''),
 ('Knüppel','der','Substantiv',['längliches Brötchen','Stock, Prügel'],1,31,'ost','bsp'),
 ('Doppelte','die','Substantiv',['zwei aneinander jebackene Brötchen'],0,18,'west',''),
 ('Kaiserschrippe','die','Substantiv',['rundes Brötchen mit Sternmuster'],0,12,'west',''),
 ('Schusterjunge','der','Substantiv',['Roggenbrötchen','Lehrling beim Schuster'],0,None,'beides','wiss'),
 ('Stulle','die','Substantiv',['belegtes Brot, Butterbrot'],1,71,'beides','bsp bild'),
 ('Bulette','die','Substantiv',['Frikadelle'],1,78,'beides','trend bsp bild jesch'),
 ('Kiez','der','Substantiv',['Viertel, Wohngegend'],1,88,'beides','bsp wiss'),
 ('Späti','der','Substantiv',['Spätkauf, kleiner Laden mit langen Öffnungszeiten'],0,91,'beides','bild'),
 ('Icke','','Pronomen',['ich'],1,82,'beides','bsp'),
 ('Bammel','der','Substantiv',['Angst'],0,44,'beides',''),
 ('Molle','die','Substantiv',['Glas Bier'],1,24,'beides','bsp'),
]
# Startzustand: A, wie im Screenshot
A=[('aalen','','Verb',['sich genüßlich ausruhen','sich rekeln'],1,37,'beides','bsp'),
 ('Aas','das','Substantiv',['unbeliebter Mensch','hinterhältiger Mensch','Schimpfwort'],0,29,'beides',''),
 ('aasen','','Verb',['verschwenden','verjeuden'],0,33,'beides','bsp'),
 ('Aasig','','Adjektiv',['sehr (verstärkend)'],0,None,'beides',''),
 ('ab','','Adjektiv',['erschöpft','abjearbeitet'],0,52,'beides',''),
 ('Ab Notam','','Redewendung',['sich (etwas) merken'],0,14,'beides','wiss'),
 ('abäschern','','Verb',['sich sehr bemühen','sich übermäßig anstrengen'],1,26,'ost','bsp'),
 ('Abbachern','','Verb',['sich abarbeiten'],0,None,'beides',''),
 ('abbeißen','','Verb',['einen Schnaps trinken'],0,11,'beides',''),
 ('abblitzen','','Verb',['einen Korb bekommen','zurückjewiesen werden'],0,48,'beides','bsp'),
 ('abbrummen','','Verb',['eine Strafe absitzen'],0,35,'beides',''),
 ('abdampfen','','Verb',['wegjehen, sich verdrücken'],1,41,'beides','bsp'),
]
# Suche „jemand ist lustig“: Stichworttreffer und KI-Vorschläge
L_KW=[('Jux','der','Substantiv',['Scherz, lustiger Streich'],0,34,'beides',''),
 ('Ulknudel','die','Substantiv',['witziger, lustiger Mensch'],1,47,'beides','bsp'),
 ('Klamauk','der','Substantiv',['lauter Spaß, Albernheit'],0,39,'beides','')]
L_KI=[('Ulknudel','die','Substantiv',['witziger, lustiger Mensch'],1,47,'beides','bsp','Meint jemanden, der andere zum Lachen bringt.'),
 ('Stimmungskanone','die','Substantiv',['jemand, der jede Feier in Schwung bringt'],0,29,'beides','','Lustig in Jesellschaft, uff Feiern.'),
 ('Quatschkopp','der','Substantiv',['jemand, der viel Unsinn redet'],1,36,'beides','','Eher albern als witzig, oft liebevoll jemeint.'),
 ('uffjedreht','','Adjektiv',['ausgelassen, in Feierlaune'],0,24,'beides','','Beschreibt die Stimmung, nicht die Person.'),
 ('Spaßvogel','der','Substantiv',['jemand, der gern Witze macht'],0,None,'beides','','Bundesweit bekannt, in Berlin ooch.')]

def row(t):
    return {'w':t[0],'art':t[1],'pos':t[2],'m':t[3],'audio':bool(t[4]),'use':t[5],'reg':t[6],'f':t[7].split(),'why':(t[8] if len(t)>8 else '')}
DATA=_j.dumps({'W':[row(t) for t in W],'A':[row(t) for t in A],'KW':[row(t) for t in L_KW],'KI':[row(t) for t in L_KI]},ensure_ascii=False)

LETTERS=[('A',412),('Ä',3),('B',498),('C',21),('D',287),('E',196),('F',301),('G',336),('H',344),('I',58),('J',212),('K',561),('L',203),('M',327),('N',121),('O',96),('Ö',8),('P',268),('Q',43),('R',214),('S',703),('T',209),('U',156),('Ü',12),('V',88),('W',236),('X',1),('Y',2),('Z',117)]

IC={
'search':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
'x':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
'xs':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
'chev':'<svg class="s1__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
'play':'<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
'filter':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
'sort':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>',
'spark':'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5z"/></svg>',
'lock':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
'enter':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 5v7a3 3 0 0 1-3 3H6"/><path d="m10 11-4 4 4 4"/></svg>',
'up':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
'down':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
'cal':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
'trend':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
'check':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
'thumbu':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7"/></svg>',
'thumbd':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V3h3v11zM17 14l-4 7a2 2 0 0 1-3-2l1-5H5a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 6.4 3H17"/></svg>',
}

CSS=FONTS+r'''
.s1{--page:#efe6db;--card:#fff;--card2:#fbf1e6;--card3:#f5dfca;--d-bl:#3d6f9c;--d-ye:#8a6d00;--d-gr:#7d8994;--ok:#2e7d4f;--t3:#535e69;--line:rgb(43 51 59 / 14%);
  --fira:'Fira Sans Extra Condensed',var(--font-body),sans-serif;
  background:var(--page);color:var(--color-body);font-family:var(--font-body);letter-spacing:.3px;min-height:100%;
  background-image:radial-gradient(var(--dot,rgb(43 51 59 / 10%)) 1.1px,transparent 1.2px);background-size:22px 22px}
[data-theme="dark"].s1{--page:#1b2127;--card:#2e363f;--card2:#38424c;--card3:#46525e;--d-bl:#8fb4d6;--d-ye:#f0d722;--d-gr:#9aa5b1;--ok:#6cc08b;--t3:#a8b2bc;--line:rgb(255 255 255 / 12%);--dot:rgb(255 255 255 / 5%)}
.s1 *{box-sizing:border-box}
.s1 a{color:inherit}
.s1 button{font:inherit;letter-spacing:inherit;color:inherit}
.s1__in{max-width:1208px;margin:0 auto;padding:40px 24px 80px}
.s1--m .s1__in{padding:24px 16px 64px}

/* Kopf */
.s1__head{display:grid;gap:6px;margin-bottom:16px}
.s1__head h1{margin:0;font-family:var(--fira);font-weight:800;font-size:2rem;line-height:1;text-transform:uppercase;letter-spacing:.5px;color:var(--color-ink-strong)}
.s1__head p{margin:0;font-size:1rem;color:var(--t3)}
.s1--m .s1__head h1{font-size:1.75rem}
.s1--m .s1__head p{font-size:.9375rem}

/* Suchfeld */
.s1__field{position:relative;display:flex;align-items:center;height:64px;background:var(--card);border:2px solid var(--line);border-radius:4px;box-shadow:var(--paper-lift);transition:border-color .15s}
.s1__field:focus-within{border-color:var(--orange-500)}
.s1__field>svg{position:absolute;left:20px;color:var(--t3);pointer-events:none}
.s1__field input{flex:1;height:100%;min-width:0;padding:0 8px 0 56px;border:0;background:none;color:var(--color-ink-strong);font:inherit;font-size:1.375rem;letter-spacing:.3px;outline:none}
.s1__field input::placeholder{color:var(--t3);opacity:1}
.s1__field input::-webkit-search-cancel-button{display:none}
.s1__clr{display:grid;place-items:center;width:44px;height:44px;margin-right:10px;border:0;border-radius:4px;background:none;color:var(--t3);cursor:pointer}
.s1__clr:hover{background:var(--card2);color:var(--color-ink-strong)}
.s1__kibtn{display:inline-flex;align-items:center;gap:6px;min-height:44px;margin-right:12px;padding:0 14px;border:1.5px solid var(--orange-500);border-radius:4px;background:none;color:var(--color-ink-strong);font-size:.875rem;font-weight:700;white-space:nowrap;cursor:pointer}
.s1__kibtn svg{color:var(--orange-500);width:18px;height:18px}
.s1__kibtn:hover,.s1__kibtn[aria-pressed="true"]{background:var(--card2)}
.s1--m .s1__kibtn{width:44px;padding:0;justify-content:center;margin-right:6px}
.s1--m .s1__kibtn span{display:none}
.s1--m .s1__clr{margin-right:4px}
.s1__slash{margin-right:16px;padding:2px 8px;border:1px solid var(--line);border-radius:3px;font-size:.8125rem;color:var(--t3)}
.s1--m .s1__field{height:56px}
.s1--m .s1__field input{font-size:1.125rem;padding-left:48px}
.s1--m .s1__field>svg{left:16px}

/* Meta-Zeile */
.s1__meta{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:12px 0 0;font-size:.9375rem;color:var(--t3)}
.s1__meta b{color:var(--color-ink-strong)}
.s1__keys{display:flex;gap:16px;font-size:.8125rem}
.s1__keys span{display:inline-flex;align-items:center;gap:6px}
.s1__kbd{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 4px;border-radius:3px;background:var(--card2);color:var(--color-ink-strong)}
.s1--m .s1__keys{display:none}

/* Filterleiste */
.s1__bar{position:relative;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:20px 0 0;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.s1__chip{position:relative;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 12px 0 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);font-size:.9375rem;cursor:pointer;white-space:nowrap}
.s1__chip:hover{background:var(--card2)}
.s1__chip[aria-expanded="true"]{border-color:var(--color-ink-strong);background:var(--card2)}
.s1__chip.is-on{border-color:var(--color-ink-strong);font-weight:700}
.s1__chip .s1__n{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--color-ink-strong);color:var(--card);font-size:.8125rem;font-weight:700}
.s1__chip[aria-expanded="true"] .s1__chev{transform:rotate(180deg)}
.s1__chev{transition:transform .2s;color:var(--t3)}
.s1__tog{padding:0 14px}
.s1__tic{display:none}
.s1__tog[aria-pressed="true"]{background:var(--color-ink-strong);border-color:var(--color-ink-strong);color:var(--card);font-weight:700}
.s1__tog[aria-pressed="true"] .s1__tic{display:inline-grid}
.s1__tog[aria-pressed="true"]:hover{background:var(--color-ink-strong)}

.s1__sp{flex:1}
.s1__sort{display:inline-flex;align-items:center;gap:8px;font-size:.9375rem;color:var(--t3)}
.s1__sort select{min-height:40px;padding:0 34px 0 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--color-ink-strong);font:inherit;font-size:.9375rem;appearance:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 19px) 50%,calc(100% - 14px) 50%;background-size:5px 5px;background-repeat:no-repeat}

/* Aktive Filter */
.s1__act{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 0}
.s1__act .s1__lbl{margin-right:4px}
.s1__pill{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 6px 0 12px;border:0;border-radius:999px;background:var(--card2);font-size:.875rem;cursor:pointer}
.s1__pill b{font-weight:700}
.s1__pill span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;color:var(--t3)}
.s1__pill:hover span{background:var(--card3);color:var(--color-ink-strong)}
.s1__reset{min-height:32px;padding:0 4px;border:0;background:none;font-size:.875rem;color:var(--t3);text-decoration:underline;text-underline-offset:3px;cursor:pointer}

/* Popover */
.s1__pop{position:absolute;top:calc(100% + 8px);z-index:20;width:380px;padding:20px;background:var(--card);border-radius:4px;box-shadow:0 14px 32px rgb(0 0 0/28%),0 0 0 1px var(--line);animation:s1in .18s ease}
.s1__pop h3{margin:0 0 4px;font-family:var(--fira);font-weight:600;font-size:1.25rem;letter-spacing:.3px;color:var(--color-ink-strong)}
.s1__pop>p{margin:0 0 16px;font-size:.875rem;line-height:1.45;color:var(--t3)}
.s1__grp{margin:0 0 16px;padding:0;border:0}
.s1__grp legend{margin-bottom:8px;padding:0}
.s1__opts{display:flex;flex-wrap:wrap;gap:6px}
.s1__opt{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);font-size:.9375rem;cursor:pointer}
.s1__opt:hover{background:var(--card2)}
.s1__opt[aria-pressed="true"]{border-color:var(--color-ink-strong);background:var(--card3);color:var(--color-ink-strong);font-weight:700}
.s1__sel{width:100%;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:4px;background:var(--card);color:var(--color-ink-strong);font:inherit;font-size:.9375rem}
.s1__inp{width:100%;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:4px;background:var(--card);color:var(--color-ink-strong);font:inherit;font-size:.9375rem}
.s1__two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.s1__two label{display:grid;gap:6px;font-size:.875rem;font-weight:700;color:var(--color-ink-strong)}
.s1__popf{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px -20px -20px;padding:14px 20px;border-top:1px solid var(--line)}
.s1__popf small{font-size:.8125rem;color:var(--t3)}
.s1__ok{min-height:40px;padding:0 16px;border:0;border-radius:4px;background:var(--orange-600);color:#fff!important;font-weight:700;cursor:pointer}
.s1__chk{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 4px;border-radius:4px;font-size:.9375rem;cursor:pointer;width:100%;border:0;background:none;text-align:left}
.s1__chk:hover{background:var(--card2)}
.s1__chk i{display:grid;place-items:center;flex:0 0 20px;height:20px;border:1.5px solid var(--t3);border-radius:3px;color:#fff}
.s1__chk[aria-checked="true"] i{background:var(--orange-600);border-color:var(--orange-600)}
.s1__chk small{margin-left:auto;font-size:.8125rem;color:var(--t3)}
.s1__letters{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.s1__letters button{display:grid;place-items:center;gap:0;min-height:48px;padding:4px 0;border:1px solid var(--line);border-radius:4px;background:var(--card);cursor:pointer;line-height:1.1}
.s1__letters button b{font-size:1rem;color:var(--color-ink-strong)}
.s1__letters button small{font-size:.8125rem;color:var(--t3)}
.s1__letters button:hover{background:var(--card2)}
.s1__letters button[aria-pressed="true"]{background:var(--color-ink-strong);border-color:var(--color-ink-strong)}
.s1__letters button[aria-pressed="true"] b,.s1__letters button[aria-pressed="true"] small{color:var(--card)}

/* Label */
.s1__lbl{font-size:.8125rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);line-height:1.4}

/* Register A-Z (Startzustand) */
.s1__reg{display:flex;flex-wrap:wrap;gap:4px;margin:20px 0 0}
.s1__reg a{display:grid;place-items:center;min-width:40px;height:44px;padding:0 6px;border-radius:4px;text-decoration:none;font-weight:700;color:var(--color-ink-strong);line-height:1}
.s1__reg a small{display:block;margin-top:2px;font-size:.8125rem;font-weight:400;color:var(--t3)}
.s1__reg a:hover{background:var(--card2)}
.s1__reg a.on{background:var(--color-ink-strong);color:var(--card)}
.s1__reg a.on small{color:inherit;opacity:.8}
.s1__regw{margin:20px 0 0;padding:14px 16px 10px;background:var(--card);border-radius:4px;box-shadow:var(--paper-lift)}
.s1__regh{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin:0 0 8px;font-size:.875rem;color:var(--t3)}
.s1__regw .s1__reg{margin:0}
.s1--m .s1__regw{margin:16px -16px 0;padding:12px 16px 8px;border-radius:0}
.s1--m .s1__regw .s1__reg{margin:0 -16px;padding:0 16px}
.s1--d .s1__reg{flex-wrap:nowrap;gap:2px}
.s1--d .s1__reg a{flex:1 1 0;min-width:0;padding:0}
.s1--m .s1__reg{flex-wrap:nowrap;overflow-x:auto;margin:16px -16px 0;padding:0 16px;scrollbar-width:none}

/* Ergebnisliste */
.s1__list{margin:16px 0 0;padding:0;list-style:none;background:var(--card);border-radius:4px;box-shadow:var(--paper-lift)}
.s1__sec{margin:24px 0 0}
.s1__sech{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 8px}
.s1__sech h2{margin:0;font-family:var(--fira);font-weight:600;font-size:1.5rem;letter-spacing:.3px;color:var(--color-ink-strong)}
.s1__sech small{font-size:.875rem;color:var(--t3)}
.s1__r{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 24px;align-items:center;padding:14px 20px 14px 24px;border-top:1px solid var(--line);cursor:pointer}
.s1__r:first-child{border-top:0}
.s1__div{padding:10px 24px 8px;border-top:1px solid var(--line);background:var(--card2);font-size:.8125rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);list-style:none}
.s1__div+.s1__r{border-top:0}
.s1--m .s1__div{padding:10px 16px 8px}
.s1__r:hover{background:var(--card2)}
.s1__r.is-act{background:var(--card2);box-shadow:inset 3px 0 0 var(--orange-500)}
.s1__r1{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;min-width:0}
.s1__wa{white-space:nowrap}
.s1__w{font-size:1.5rem;font-weight:700;line-height:1.15;color:var(--color-ink-strong);text-decoration:none}
.s1__w:hover{text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px}
.s1__art{font-size:1.125rem;color:var(--t3)}
.s1__pos{position:relative;top:-2px;padding-left:12px;border-left:1px solid var(--line);font-size:.8125rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);line-height:1.2}
.s1__m{grid-column:1;margin:0;font-size:1rem;line-height:1.5;color:var(--color-body)}
.s1__dot{display:inline-block;width:5px;height:5px;margin:0 10px 0 9px;border-radius:50%;background:var(--t3);vertical-align:middle;position:relative;top:-1px}
.s1__sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.s1__w mark{background:color-mix(in srgb,var(--orange-500) 22%,transparent);color:inherit;border-radius:2px}
.s1__m mark{background:color-mix(in srgb,var(--orange-500) 22%,transparent);color:var(--color-ink-strong);border-radius:2px;padding:0 1px}
.s1__why{grid-column:1;margin:2px 0 0;font-size:.8125rem;color:var(--t3)}
.s1__why b{font-weight:700;color:var(--color-body)}
.s1__side{grid-column:2;grid-row:1 / span 3;display:flex;align-items:center;gap:16px}
.s1__use{display:grid;grid-template-columns:auto 64px auto;align-items:center;gap:8px;font-size:.8125rem;color:var(--t3);min-width:148px}
.s1__use b{font-weight:700;color:var(--color-ink-strong);font-variant-numeric:tabular-nums;text-align:right;min-width:36px}
.s1__bar6{position:relative;height:6px;border-radius:999px;background:var(--card3);overflow:hidden}
.s1__bar6 i{position:absolute;inset:0 auto 0 0;border-radius:999px;background:var(--d-bl)}
.s1__nouse{min-width:148px;font-size:.8125rem;color:var(--t3);text-align:right}
.s1__play{display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--line);border-radius:50%;background:var(--card);color:var(--color-ink-strong);cursor:pointer}
.s1__play:hover{background:var(--orange-600);border-color:var(--orange-600);color:#fff}
.s1__noplay{width:36px}
.s1__b{display:inline-flex;align-items:center;gap:5px;min-height:24px;padding:0 9px;border-radius:999px;font-size:.8125rem;font-weight:700;align-self:center}
.s1__b--wdt{background:var(--orange-600);color:#fff}
.s1__b--tr{background:color-mix(in srgb,var(--orange-500) 16%,transparent);color:var(--color-accent-text)}
.s1__b--ki{background:var(--card3);color:var(--color-ink-strong)}
.s1--m .s1__r{grid-template-columns:minmax(0,1fr) auto;padding:14px 16px;gap:4px 12px}
.s1--m .s1__w{font-size:1.25rem}
.s1--m .s1__side{grid-row:1;grid-column:2;align-self:start}
.s1--m .s1__use,.s1--m .s1__nouse{display:none}
.s1__uset{display:none}
.s1--m .s1__uset{display:block;font-size:.8125rem;color:var(--t3);white-space:nowrap;font-variant-numeric:tabular-nums}
.s1--m .s1__side{flex-direction:column;align-items:flex-end;gap:6px}
.s1--m .s1__why{display:none}
.s1--m .s1__kilist .s1__why{display:block}
.s1__usem{display:none;grid-template-columns:auto 72px auto;justify-content:start;align-items:center;gap:8px;margin-top:4px;font-size:.8125rem;color:var(--t3)}
.s1__usem b{font-weight:700;color:var(--color-ink-strong)}
.s1--m .s1__m,.s1--m .s1__why{grid-column:1 / -1}
.s1--m .s1__play{position:relative;width:36px;height:36px}
.s1--m .s1__play::before{content:"";position:absolute;inset:-4px}
.s1--m .s1__pos{border-left:0;padding-left:0}
.s1--m .s1__r1{gap:2px 10px}
.s1__more{display:flex;align-items:center;justify-content:center;gap:16px;margin:20px 0 0;font-size:.875rem;color:var(--t3)}
.s1__obtn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:1.5px solid var(--orange-500);border-radius:4px;background:none;font-size:.9375rem;font-weight:700;color:var(--color-ink-strong);cursor:pointer;text-decoration:none}
.s1__obtn:hover{background:var(--card2)}
.s1__tl{border:0;background:none;padding:0;min-height:44px;font-size:.9375rem;color:var(--t3);text-decoration:underline;text-underline-offset:3px;cursor:pointer}

/* KI */
.s1__ki{margin:20px 0 0;padding:20px 24px;border-radius:4px;background:var(--card2);border:1px solid var(--line);animation:s1in .25s ease}
.s1__kih{display:flex;align-items:flex-start;gap:14px}
.s1__kiic{display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:50%;background:var(--card);color:var(--orange-500)}
.s1__kih h2{margin:0;font-family:var(--fira);font-weight:600;font-size:1.375rem;letter-spacing:.3px;line-height:1.15;color:var(--color-ink-strong)}
.s1__kih p{margin:4px 0 0;font-size:1rem;line-height:1.5}
.s1__kib{flex:1;min-width:0}
.s1__kia{display:flex;align-items:center;flex-wrap:wrap;gap:12px 20px;margin:16px 0 0 54px}
.s1__priv{display:inline-flex;align-items:center;gap:6px;font-size:.8125rem;color:var(--t3)}
.s1__prog{height:6px;margin:16px 0 0 54px;border-radius:999px;background:var(--card3);overflow:hidden}
.s1__prog i{display:block;height:100%;width:38%;border-radius:999px;background:var(--orange-500);animation:s1prog 1.4s ease-in-out infinite}
.s1__progd i{animation:none;width:var(--p)}
.s1__kis{margin:8px 0 0 54px;font-size:.875rem;color:var(--t3)}
.s1__kilist{margin:16px 0 0;padding:0;list-style:none;background:var(--card);border-radius:4px}
.s1__kif{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;margin:14px 0 0;font-size:.8125rem;color:var(--t3)}
.s1__kif .s1__sp{flex:1}
.s1__fb{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);font-size:.875rem;cursor:pointer}
.s1__fb:hover{background:var(--card3)}
.s1__fb[aria-pressed="true"]{border-color:var(--color-ink-strong);font-weight:700}
.s1--m .s1__ki{padding:16px}
.s1--m .s1__kia,.s1--m .s1__prog,.s1--m .s1__kis{margin-left:0}
.s1--m .s1__kiic{flex-basis:36px;height:36px}

/* Leer */
.s1__empty{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin:24px 0 0;padding:28px;background:var(--card);border-radius:4px;box-shadow:var(--paper-lift)}
.s1__empty h2{margin:0;font-family:var(--fira);font-weight:600;font-size:1.75rem;letter-spacing:.3px;color:var(--color-ink-strong)}
.s1__empty p{margin:6px 0 0;font-size:1rem;line-height:1.5}
.s1__mein{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0 0}
.s1__mein a{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:999px;background:var(--card2);font-weight:700;text-decoration:none;color:var(--color-ink-strong)}
.s1__mein a:hover{background:var(--card3)}
.s1__eact{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0 0}
.s1--m .s1__empty{grid-template-columns:1fr;padding:20px;text-align:left}

/* Skeleton */
.s1__sk{display:grid;gap:10px;padding:18px 24px;border-top:1px solid var(--line)}
.s1__sk:first-child{border-top:0}
.s1__sk i{display:block;height:14px;border-radius:3px;background:linear-gradient(90deg,var(--card2) 0%,var(--card3) 50%,var(--card2) 100%);background-size:200% 100%;animation:s1sh 1.4s linear infinite}
.s1__sk i:first-child{height:22px;width:28%}
.s1__sk i:last-child{width:62%}

/* Mobil: Filter-Button und Sheet */
.s1__mbar{display:flex;align-items:center;gap:8px;margin:12px 0 0}
.s1__fbtn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:4px;background:var(--card);font-size:.9375rem;font-weight:700;cursor:pointer}
.s1__fbtn .s1__n{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--orange-600);color:#fff;font-size:.8125rem}
.s1__mbar .s1__sort{margin-left:auto}
.s1__mbar .s1__sort select{min-height:44px}
.s1--m .s1__act{flex-wrap:nowrap;overflow-x:auto;margin:12px -16px 0;padding:0 16px;scrollbar-width:none}
.s1--m .s1__pill{flex:0 0 auto;min-height:36px}
.s1__scrim{position:absolute;inset:0;z-index:30;background:rgb(0 0 0/45%)}
.s1__sheet{position:absolute;left:0;right:0;bottom:0;z-index:31;max-height:86%;display:flex;flex-direction:column;background:var(--card);border-radius:12px 12px 0 0;box-shadow:0 -8px 24px rgb(0 0 0/25%);animation:s1up .25s ease}
.s1__grab{width:40px;height:4px;margin:8px auto 0;border-radius:999px;background:var(--card3)}
.s1__shh{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 20px;border-bottom:1px solid var(--line)}
.s1__shh h2{margin:0;font-family:var(--fira);font-weight:600;font-size:1.375rem;color:var(--color-ink-strong)}
.s1__shb{overflow:auto;padding:0 20px}
.s1__acc{border-bottom:1px solid var(--line)}
.s1__acc summary{display:flex;align-items:center;justify-content:space-between;min-height:56px;font-weight:700;color:var(--color-ink-strong);cursor:pointer;list-style:none}
.s1__acc summary::-webkit-details-marker{display:none}
.s1__acc summary small{margin-left:auto;margin-right:10px;font-weight:400;font-size:.875rem;color:var(--t3)}
.s1__acc[open] .s1__chev{transform:rotate(180deg)}
.s1__acc>div{padding:0 0 18px}
.s1__shf{display:flex;align-items:center;gap:12px;padding:12px 20px 20px;border-top:1px solid var(--line)}
.s1__shf .s1__ok{flex:1;min-height:48px;font-size:1rem}
.s1__mroot{position:relative}
.s1--sheet{min-height:844px}

@keyframes s1in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes s1up{from{transform:translateY(30%)}to{transform:none}}
@keyframes s1prog{0%{transform:translateX(-100%)}100%{transform:translateX(270%)}}
@keyframes s1sh{to{background-position:-200% 0}}
.s1 :focus-visible{outline:2px solid var(--orange-400);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.s1 *{animation:none!important;transition:none!important}}
'''

# ---------- Markup ----------
def ROWS(lst, extra=''):
    return '''<sc-for list="{{%s}}" as="r" hint-placeholder-count="6"><sc-if value="{{r.div}}" hint-placeholder-val="{{false}}"><li class="s1__div" role="presentation">Ab hier: Treffer in der Bedeutung</li></sc-if><li class="{{r.cls}}" id="{{r.id}}" role="option" aria-selected="{{r.act}}">
<div class="s1__r1"><span class="s1__wa"><a class="s1__w" href="#"><sc-for list="{{r.wparts}}" as="p" hint-placeholder-count="1"><sc-if value="{{p.mk}}" hint-placeholder-val="{{false}}"><mark>{{p.t}}</mark></sc-if><sc-if value="{{p.pl}}" hint-placeholder-val="{{true}}">{{p.t}}</sc-if></sc-for></a><sc-if value="{{r.hasArt}}" hint-placeholder-val="{{true}}"><span class="s1__art">, {{r.art}}</span></sc-if></span><span class="s1__pos">{{r.pos}}</span>
<sc-if value="{{r.wdt}}" hint-placeholder-val="{{false}}"><span class="s1__b s1__b--wdt">%s Wort des Tages</span></sc-if><sc-if value="{{r.trend}}" hint-placeholder-val="{{false}}"><span class="s1__b s1__b--tr">%s Gerade beliebt</span></sc-if><sc-if value="{{r.ki}}" hint-placeholder-val="{{false}}"><span class="s1__b s1__b--ki">KI-Vorschlag</span></sc-if></div>
<p class="s1__m"><sc-for list="{{r.parts}}" as="p" hint-placeholder-count="2"><sc-if value="{{p.sep}}" hint-placeholder-val="{{false}}"><span class="s1__dot" aria-hidden="true"></span><span class="s1__sr">; </span></sc-if><sc-if value="{{p.mk}}" hint-placeholder-val="{{false}}"><mark>{{p.t}}</mark></sc-if><sc-if value="{{p.pl}}" hint-placeholder-val="{{true}}">{{p.t}}</sc-if></sc-for></p>
<sc-if value="{{r.hasWhy}}" hint-placeholder-val="{{false}}"><p class="s1__why">{{r.whyA}}<b>{{r.whyB}}</b>{{r.whyC}}</p></sc-if>
<sc-if value="{{r.hasUse}}" hint-placeholder-val="{{true}}"><span class="s1__usem"><span>jesagt</span><span class="s1__bar6" aria-hidden="true"><i style="{{r.useW}}"></i></span><b>{{r.useP}}</b></span></sc-if>
<div class="s1__side"><sc-if value="{{r.hasUse}}" hint-placeholder-val="{{true}}"><span class="s1__uset">{{r.useT}}</span></sc-if><sc-if value="{{r.hasUse}}" hint-placeholder-val="{{true}}"><span class="s1__use" title="Anteil „Sag ick selbst“ in der Umfrage"><span>jesagt</span><span class="s1__bar6" aria-hidden="true"><i style="{{r.useW}}"></i></span><b>{{r.useP}}</b></span></sc-if><sc-if value="{{r.noUse}}" hint-placeholder-val="{{false}}"><span class="s1__nouse">zu wenig Stimmen</span></sc-if>
<sc-if value="{{r.audio}}" hint-placeholder-val="{{true}}"><button class="s1__play" aria-label="{{r.playL}}">%s</button></sc-if><sc-if value="{{r.noAudio}}" hint-placeholder-val="{{false}}"><span class="s1__noplay"></span></sc-if></div>
</li></sc-for>'''%(lst,IC['cal'],IC['trend'],IC['play'])

def chip(key,label):
    return '<div style="position: relative;"><button class="{{c_%s.cls}}" aria-expanded="{{c_%s.exp}}" aria-haspopup="dialog" onClick="{{c_%s.tg}}">%s<sc-if value="{{c_%s.hasN}}" hint-placeholder-val="{{false}}"><span class="s1__n">{{c_%s.n}}</span></sc-if>%s</button>@@POP_%s@@</div>'%(key,key,key,label,key,key,IC['chev'],key)

def opt(lst):
    return '<div class="s1__opts"><sc-for list="{{%s}}" as="o" hint-placeholder-count="3"><button class="s1__opt" aria-pressed="{{o.on}}" onClick="{{o.pick}}">{{o.t}}</button></sc-for></div>'%lst
def chk(lst):
    return '<div><sc-for list="{{%s}}" as="o" hint-placeholder-count="4"><button class="s1__chk" role="checkbox" aria-checked="{{o.on}}" onClick="{{o.pick}}"><i>%s</i>{{o.t}}<small>{{o.n}}</small></button></sc-for></div>'%(lst,IC['check'])

def pop(key,title,intro,inner,left='0'):
    return '<sc-if value="{{c_%s.open}}" hint-placeholder-val="{{false}}"><div class="s1__pop" role="dialog" aria-label="%s" style="left: %s;"><h3>%s</h3><p>%s</p>%s<div class="s1__popf"><small>{{countTxt}}</small><button class="s1__ok" onClick="{{closePop}}">Fertig</button></div></div></sc-if>'%(key,title,left,title,intro,inner)

G_GEBRAUCH=('<fieldset class="s1__grp"><legend class="s1__lbl">Wie oft jesagt?</legend>'+opt('o_oft')+'</fieldset>'
 '<fieldset class="s1__grp"><legend class="s1__lbl">Eher wo?</legend>'+opt('o_reg')+'</fieldset>'
 '<fieldset class="s1__grp"><legend class="s1__lbl">Im Bezirk</legend><select class="s1__sel" aria-label="Bezirk"><option>Alle Bezirke</option><option>Charlottenburg-Wilmersdorf</option><option>Friedrichshain-Kreuzberg</option><option>Lichtenberg</option><option>Marzahn-Hellersdorf</option><option>Mitte</option><option>Neukölln</option><option>Pankow</option><option>Reinickendorf</option><option>Spandau</option><option>Steglitz-Zehlendorf</option><option>Tempelhof-Schöneberg</option><option>Treptow-Köpenick</option></select></fieldset>'
 '<fieldset class="s1__grp"><legend class="s1__lbl">Altersgruppe</legend>'+opt('o_alt')+'</fieldset>')
G_INHALT=chk('o_inh')
G_FORM=('<div class="s1__two" style="margin-bottom: 16px;"><label>Beginnt mit<input class="s1__inp" placeholder="z. B. ab"></label><label>Endet auf<input class="s1__inp" placeholder="z. B. -ken"></label></div>'
 '<div style="margin-bottom: 16px;"><label style="display: grid; gap: 6px; font-size: .875rem; font-weight: 700; color: var(--color-ink-strong);">Reimt sich auf<input class="s1__inp" placeholder="z. B. Schrippe"></label></div>'
 '<fieldset class="s1__grp"><legend class="s1__lbl">Silben</legend>'+opt('o_sil')+'</fieldset>'
 '<fieldset class="s1__grp"><legend class="s1__lbl">Länge</legend>'+opt('o_len')+'</fieldset>')
G_BUCH='<div class="s1__letters"><sc-for list="{{lettersPop}}" as="l" hint-placeholder-count="12"><button aria-pressed="{{l.on}}" onClick="{{l.pick}}"><b>{{l.t}}</b><small>{{l.n}}</small></button></sc-for></div><div style="height: 16px;"></div>'
G_ART=chk('o_pos')
G_THEMA=chk('o_thema')

BAR=('<div class="s1__bar" role="toolbar" aria-label="Filter">'
 +'<sc-if value="{{showBuchChip}}" hint-placeholder-val="{{true}}">'+chip('buch','Buchstabe')+'</sc-if>'+chip('art','Wortart')+chip('thema','Thema')+chip('gebrauch','Gebrauch')+chip('inhalt','Inhalt')+chip('form','Wortform')
 +'<button class="s1__chip s1__tog" aria-pressed="{{berolOn}}" onClick="{{tgBerol}}" title="Nur Berliner Spitznamen für Orte, Straßen und Plätze"><span class="s1__tic" aria-hidden="true">'+IC['check']+'</span>Nur Berolinismen</button>'
 '<span class="s1__sp"></span><label class="s1__sort">'+IC['sort']+'<span>Sortieren</span><select aria-label="Sortieren"><option>Beste Treffer</option><option>A–Z</option><option>Gerade beliebt</option><option>Neu dabei</option><option>Am meisten jesagt</option></select></label></div>')
BAR=BAR.replace('@@POP_buch@@',pop('buch','Buchstabe','Springt zu allen Wörtern mit diesem Anfangsbuchstaben.',G_BUCH))
BAR=BAR.replace('@@POP_art@@',pop('art','Wortart','Mehrere möglich. Redewendungen haben eigene Wortart.',G_ART))
BAR=BAR.replace('@@POP_thema@@',pop('thema','Thema','Mehrere möglich.',G_THEMA))
BAR=BAR.replace('@@POP_gebrauch@@',pop('gebrauch','Gebrauch','Aus der Umfrage „Sagste det noch?“. Zählt nur Wörter mit mindestens 10 Stimmen.',G_GEBRAUCH))
BAR=BAR.replace('@@POP_inhalt@@',pop('inhalt','Inhalt','Zeigt nur Wörter, die dit schon haben. „Hier fehlt noch wat“ zeigt Wörter zum Mitmachen.',G_INHALT,'-60px'))
BAR=BAR.replace('@@POP_form@@',pop('form','Wortform','Für Rätsel, Reime und Wortspiele.',G_FORM,'-180px'))

ACT=('<sc-if value="{{hasAct}}" hint-placeholder-val="{{false}}"><div class="s1__act" aria-label="Aktive Filter"><span class="s1__lbl s1__dsk">Aktiv</span>'
 '<sc-for list="{{actList}}" as="a" hint-placeholder-count="2"><button class="s1__pill" onClick="{{a.rm}}" aria-label="{{a.aria}}">{{a.k}}: <b>{{a.v}}</b><span>'+IC['xs']+'</span></button></sc-for>'
 '<button class="s1__reset" onClick="{{resetAll}}">Alles zurücksetzen</button></div></sc-if>')

MBAR=('<div class="s1__mbar"><button class="s1__fbtn" onClick="{{openSheet}}" aria-haspopup="dialog">'+IC['filter']+'Filter<sc-if value="{{hasAct}}" hint-placeholder-val="{{false}}"><span class="s1__n">{{actN}}</span></sc-if></button>'
 '<label class="s1__sort"><select aria-label="Sortieren"><option>Beste Treffer</option><option>A–Z</option><option>Gerade beliebt</option><option>Neu dabei</option><option>Am meisten jesagt</option></select></label></div>')

def acc(title,inner,cnt=''):
    return '<details class="s1__acc"%s><summary>%s<small>%s</small>%s</summary><div>%s</div></details>'%(' open' if title=='Gebrauch' else '',title,cnt,IC['chev'],inner)
SHEET=('<sc-if value="{{sheetOpen}}" hint-placeholder-val="{{false}}"><div class="s1__scrim" onClick="{{closeSheet}}"></div><div class="s1__sheet" role="dialog" aria-modal="true" aria-labelledby="shh"><div class="s1__grab" aria-hidden="true"></div>'
 '<div class="s1__shh"><h2 id="shh">Filter</h2><button class="s1__clr" onClick="{{closeSheet}}" aria-label="Filter schließen">'+IC['x']+'</button></div><div class="s1__shb">'
 +acc('Buchstabe',G_BUCH,'Alle')+acc('Wortart',G_ART,'{{posSum}}')+acc('Thema',G_THEMA,'Alle')+acc('Gebrauch',G_GEBRAUCH,'{{useSum}}')+acc('Inhalt',G_INHALT,'{{inhSum}}')+acc('Wortform',G_FORM,'Alle')
 +'<button class="s1__chk" role="switch" aria-checked="{{berolOn}}" onClick="{{tgBerol}}" style="min-height: 56px; font-weight: 700;"><i>'+IC['check']+'</i>Nur Berolinismen</button>'
 '</div><div class="s1__shf"><button class="s1__reset" onClick="{{resetAll}}">Zurücksetzen</button><button class="s1__ok" onClick="{{closeSheet}}">{{sheetBtn}}</button></div></div></sc-if>')

KI=('<sc-if value="{{kiShow}}" hint-placeholder-val="{{false}}"><section class="s1__ki" aria-labelledby="kih" aria-live="polite"><div class="s1__kih"><span class="s1__kiic">'+IC['spark']+'</span><div class="s1__kib">'
 '<h2 id="kih">{{kiTitle}}</h2><p>{{kiText}}</p></div></div>'
 '<sc-if value="{{kiOffer}}" hint-placeholder-val="{{true}}"><div class="s1__kia"><button class="s1__obtn" onClick="{{kiStart}}">'+IC['spark']+'{{kiBtn}}</button><button class="s1__tl" onClick="{{kiNo}}">{{kiNoTxt}}</button><span class="s1__priv">'+IC['lock']+'Läuft lokal in deinem Browser. Deine Suche verlässt dein Gerät nicht.</span></div></sc-if>'
 '<sc-if value="{{kiRun}}" hint-placeholder-val="{{false}}"><div class="{{progCls}}" role="progressbar" aria-label="{{kiStep}}" style="{{progP}}"><i></i></div><p class="s1__kis">{{kiStep}} <button class="s1__tl" style="min-height: 0; margin-left: 8px; font-size: .875rem;" onClick="{{kiStop}}">Abbrechen</button></p></sc-if>'
 '<sc-if value="{{kiDone}}" hint-placeholder-val="{{false}}"><ul class="s1__kilist" role="listbox" aria-label="KI-Vorschläge">'+ROWS('kiRows')+'</ul>'
 '<div class="s1__kif"><span class="s1__priv">'+IC['lock']+'Von Chrome-KI lokal sortiert. Kann danebenliegen.</span><span class="s1__sp"></span><span>Hat’s jepasst?</span>'
 '<button class="s1__fb" aria-pressed="{{fbUp}}" onClick="{{fbU}}">'+IC['thumbu']+'Ja</button><button class="s1__fb" aria-pressed="{{fbDown}}" onClick="{{fbD}}">'+IC['thumbd']+'Nee</button></div></sc-if>'
 '</section></sc-if>')

EMPTY=('<sc-if value="{{isEmpty}}" hint-placeholder-val="{{false}}"><section class="s1__empty" aria-live="polite">'+kalle('nuescht',120,'s1e')+'<div><h2>Nüscht jefunden für „{{q}}“</h2>'
 '<p>Weder im Wort noch in den Bedeutungen. Vielleicht ’n Tippfehler?</p>'
 '<div class="s1__mein"><span class="s1__lbl">Meinste</span><a href="#">Schrippe</a><a href="#">Schippe</a><a href="#">Strippe</a></div>'
 '<div class="s1__eact"><button class="s1__obtn" onClick="{{kiFromEmpty}}">'+IC['spark']+'Nach Bedeutung suchen</button><a class="s1__obtn" href="#">Wort vorschlagen</a></div></div></section></sc-if>')

LIST=('<sc-if value="{{isStart}}" hint-placeholder-val="{{true}}"><div class="s1__regw"><p class="s1__regh"><span class="s1__lbl">Springen zu</span><span>Alle Wörter von A bis Z. Die Zahl zeigt, wie viele mit dem Buchstaben anfangen.</span></p><nav class="s1__reg" aria-label="Springen zu Buchstabe"><sc-for list="{{reg}}" as="l" hint-placeholder-count="29"><a href="#" class="{{l.c}}" aria-current="{{l.cur}}" aria-label="{{l.aria}}">{{l.t}}<small aria-hidden="true">{{l.n}}</small></a></sc-for></nav></div>'
 '<div class="s1__sec"><div class="s1__sech"><h2>{{startH}}</h2><small>{{startN}}</small></div><ul class="s1__list" role="listbox" aria-label="Wörter">'+ROWS('rows')+'</ul></div></sc-if>'
 '<sc-if value="{{isLoad}}" hint-placeholder-val="{{false}}"><div class="s1__list" aria-busy="true" aria-label="Treffer werden jeladen"><div class="s1__sk"><i></i><i></i><i></i></div><div class="s1__sk"><i></i><i></i><i></i></div><div class="s1__sk"><i></i><i></i><i></i></div><div class="s1__sk"><i></i><i></i><i></i></div><div class="s1__sk"><i></i><i></i><i></i></div></div></sc-if>'
 '<sc-if value="{{hasRows}}" hint-placeholder-val="{{false}}"><div class="s1__sec"><div class="s1__sech"><h2>{{listH}}</h2><small>{{listN}}</small></div><ul class="s1__list" id="treffer" role="listbox" aria-label="Treffer">'+ROWS('rows')+'</ul></div></sc-if>'
 '<sc-if value="{{showMore}}" hint-placeholder-val="{{true}}"><div class="s1__more"><span>{{moreTxt}}</span><button class="s1__obtn">Mehr laden</button></div></sc-if>')

BODY=('<div class="{{rootCls}}" data-theme="{{theme}}"><div class="s1__in">'
 '<header class="s1__head"><h1>Wörter suchen</h1><p>5.928 Wörter und Redewendungen. Such uff Berlinerisch oder Hochdeutsch.</p></header>'
 '<div role="search"><label for="sq" class="s1__lbl" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);">Wort oder Bedeutung suchen</label>'
 '<div class="s1__field">'+IC['search']+'<input id="sq" type="search" role="combobox" aria-expanded="true" aria-controls="treffer" aria-activedescendant="{{actId}}" autocomplete="off" value="{{q}}" onInput="{{typed}}" onKeyDown="{{keyd}}" placeholder="{{ph}}">'
 '<sc-if value="{{hasQ}}" hint-placeholder-val="{{false}}"><button class="s1__clr" onClick="{{clearQ}}" aria-label="Suche leeren">'+IC['x']+'</button></sc-if><sc-if value="{{hasQ}}" hint-placeholder-val="{{false}}"><button class="s1__kibtn" onClick="{{kiStart}}" aria-pressed="{{kiPressed}}" aria-label="Nach Bedeutung suchen mit Chrome-KI" title="Nach Bedeutung suchen (Shift + Enter)">'+IC['spark']+'<span>Nach Bedeutung</span></button></sc-if><sc-if value="{{showSlash}}" hint-placeholder-val="{{true}}"><kbd class="s1__slash" aria-hidden="true">/</kbd></sc-if></div>'
 '<div class="s1__meta"><span aria-live="polite">{{metaA}}<b>{{metaB}}</b>{{metaC}}</span><span class="s1__keys"><span><span class="s1__kbd">'+IC['up']+'</span><span class="s1__kbd">'+IC['down']+'</span> navigieren</span><span><span class="s1__kbd">'+IC['enter']+'</span> öffnen</span><span><span class="s1__kbd" style="padding: 0 6px;">Shift</span><span class="s1__kbd">'+IC['enter']+'</span> nach Bedeutung</span></span></div></div>'
 '<sc-if value="{{isDesk}}" hint-placeholder-val="{{true}}">'+BAR+'</sc-if><sc-if value="{{isMob}}" hint-placeholder-val="{{false}}">'+MBAR+'</sc-if>'
 +ACT+KI+EMPTY+'<sc-if value="{{isFEmpty}}" hint-placeholder-val="{{false}}"><section class="s1__empty" aria-live="polite">'+kalle('kratzen',110,'s1f')+'<div><h2>Mit diesen Filtern: nüscht</h2><p>Keen Wort passt zu allen Filtern uff eenmal. Nimm een paar raus.</p><div class="s1__eact"><button class="s1__obtn" onClick="{{resetAll}}">Alle Filter zurücksetzen</button></div></div></section></sc-if>'+LIST+
 '</div>'+SHEET+'</div>')

SCRIPT=r'''const D = @@DATA@@;
const LET = @@LET@@;
const POS = ['Substantiv','Verb','Adjektiv','Adverb','Pronomen','Redewendung'];
const THEMEN = ['Essen & Trinken','Berlin & Orte','Alltag & Wohnen','Leute & Typen','Schimpfwörter','Alkohol & Kneipe'];
const INH = [['audio','Anhören','2.104'],['bsp','Beispiele','3.877'],['bsph','Beispiele mit Hörprobe','612'],['bild','Bilder','948'],['jesch','Jeschichten','231'],['wiss','Wissenswertes','1.402'],['luecke','Hier fehlt noch wat','3.311']];
const OFT = ['Egal','Oft (ab 50 %)','Manchmal','Kaum noch (unter 20 %)'];
const REG = ['Egal','Eher Ost','Eher West','Beides'];
const ALT = ['Alle','unter 30','30 bis 59','ab 60'];
const SIL = ['Alle','1','2','3','4+'];
const LEN = ['Alle','kurz (bis 5)','mittel (6–10)','lang (ab 11)'];
const QS = { start: '', suche: 'brötchen', ki: 'jemand ist lustig', leer: 'schrippö', laden: 'bulette' };

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parts(ms, q) {
  const out = [];
  const t = (q || '').trim();
  const terms = t.length >= 3 ? t.split(/\s+/).filter(x => x.length >= 3) : [];
  ms.forEach((m, i) => {
    let segs = [{ t: m, mk: false }];
    if (terms.length) {
            segs = m.split(new RegExp('(' + terms.map(esc).join('|') + ')', 'ig')).filter(Boolean).map(s => ({ t: s, mk: terms.some(x => s.toLowerCase() === x.toLowerCase()) }));
    }
    segs.forEach((s, j) => out.push({ t: s.t, mk: s.mk, pl: !s.mk, sep: i > 0 && j === 0 }));
  });
  return out;
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const z = (props && props.zustand) || 'start';
    const pop = (props && props.popover) || 'zu';
    const act = (props && props.aktiv) === 'ja';
    const ki = (props && props.ki) || 'angebot';
    this.state = {
      q: QS[z] ?? '', z, pop: pop === 'zu' ? '' : pop,
      oft: act ? 1 : 0, reg: 0, alt: 0, sil: 0, len: 0,
      inh: act ? ['audio'] : [], pos: [], thema: [], berol: false, letter: '',
      ki: z === 'ki' ? ki : 'aus', fb: '', act: 0, model: ki === 'laden' ? 'fehlt' : 'da', dis: false,
      sheet: (props && props.sheet) === 'offen',
    };
  }
  componentWillUnmount() { clearTimeout(this.t1); clearTimeout(this.t2); }
  runKi() {
    clearTimeout(this.t1); clearTimeout(this.t2);
    this.setState({ ki: 'laeuft', kiP: 0 });
    this.t1 = setTimeout(() => this.setState({ kiP: 1 }), 900);
    this.t2 = setTimeout(() => this.setState({ ki: 'fertig' }), 1900);
  }
  renderVals() {
    const st = this.state, p = this.props || {};
    const size = p.size || 'desktop', mob = size === 'mobile';
    const q = st.q || '', qt = q.trim(), ql = qt.toLowerCase();
    const words = qt.split(/\s+/).filter(Boolean);
    const describe = words.length >= 3;
    const set = s => this.setState(s);

    // Treffer berechnen
    let base, mode;
    if (st.z === 'laden') mode = 'laden';
    else if (!qt) { base = D.A.map(r => ({ ...r })); mode = 'start'; }
    else if (describe) { base = D.KW.map(r => ({ ...r, why: '', inM: true })); mode = 'suche'; }
    else {
      const inW = D.W.filter(r => r.w.toLowerCase().includes(ql)).map(r => ({ ...r, why: '', inM: false }));
      const inM = D.W.filter(r => !r.w.toLowerCase().includes(ql) && r.m.some(m => m.toLowerCase().includes(ql)))
        .map(r => ({ ...r, why: '', inM: true }));
      base = inW.concat(inM); mode = base.length ? 'suche' : 'leer';
    }
    const TH = { Schrippe: 'Essen & Trinken', Splitterbrötchen: 'Essen & Trinken', Wasserschrippe: 'Essen & Trinken', Knüppel: 'Essen & Trinken', Doppelte: 'Essen & Trinken', Kaiserschrippe: 'Essen & Trinken', Schusterjunge: 'Essen & Trinken', Stulle: 'Essen & Trinken', Bulette: 'Essen & Trinken', Molle: 'Alkohol & Kneipe', abbeißen: 'Alkohol & Kneipe', Kiez: 'Berlin & Orte', Späti: 'Berlin & Orte', Aas: 'Schimpfwörter', Icke: 'Leute & Typen', Ulknudel: 'Leute & Typen', Stimmungskanone: 'Leute & Typen', Quatschkopp: 'Leute & Typen', Spaßvogel: 'Leute & Typen' };
    const syl = w => (w.toLowerCase().match(/[aeiouäöüy]+/g) || []).length;
    const filt = arr => arr.filter(r => {
      if (st.oft === 1 && !(r.use != null && r.use >= 50)) return false;
      if (st.oft === 2 && !(r.use != null && r.use >= 20 && r.use < 50)) return false;
      if (st.oft === 3 && !(r.use != null && r.use < 20)) return false;
      if (st.reg && r.use == null) return false;
      if (st.reg === 1 && r.reg !== 'ost') return false;
      if (st.reg === 2 && r.reg !== 'west') return false;
      if (st.reg === 3 && r.reg !== 'beides') return false;
      if (st.alt && (r.use == null || r.use < 20)) return false;
      if (st.inh.includes('audio') && !r.audio) return false;
      for (const k of ['bsp', 'bild', 'jesch', 'wiss']) if (st.inh.includes(k) && !r.f.includes(k)) return false;
      if (st.inh.includes('bsph') && !(r.audio && r.f.includes('bsp'))) return false;
      if (st.inh.includes('luecke') && r.f.length >= 2) return false;
      if (st.pos.length && !st.pos.includes(r.pos)) return false;
      if (st.thema.length && !st.thema.includes(TH[r.w] || 'Alltag & Wohnen')) return false;
      if (st.berol && !r.f.includes('ber')) return false;
      if (st.letter && r.w[0].toUpperCase() !== st.letter) return false;
      const n = syl(r.w);
      if (st.sil && (st.sil < 4 ? n !== st.sil : n < 4)) return false;
      const L = r.w.length;
      if (st.len === 1 && L > 5) return false;
      if (st.len === 2 && (L < 6 || L > 10)) return false;
      if (st.len === 3 && L < 11) return false;
      return true;
    });
    let rowsSrc = filt(base || []);
    const byFilter = (base || []).length > 0 && rowsSrc.length === 0;
    if (mode === 'suche' && !rowsSrc.length) mode = 'leer';
    if (mode === 'start' && !rowsSrc.length) mode = 'leer';

    const mk = (r, i, ki) => {
      const why = r.why || '';
      const [a, b, c] = why.includes('|') ? why.split('|') : [why, '', ''];
      const actRow = !ki && i === st.act && mode !== 'start' && !mob;
      return {
        w: r.w, wparts: parts([r.w], ki ? '' : qt), art: r.art, hasArt: !!r.art, pos: r.pos,
        parts: parts(r.m, ki ? '' : qt),
        hasWhy: !!why, whyA: a, whyB: b, whyC: c,
        hasUse: r.use != null, noUse: r.use == null, useP: (r.use ?? 0) + ' %', useW: 'width: ' + (r.use ?? 0) + '%;',
        audio: r.audio, noAudio: !r.audio, playL: r.w + ' anhören',
        wdt: r.f.includes('wdt'), trend: r.f.includes('trend'), ki: false,
        div: !ki && !!r.inM && i > 0 && !rowsSrc[i - 1].inM,
        useT: 'jesagt ' + (r.use ?? 0) + ' %',
        cls: 's1__r' + (actRow ? ' is-act' : ''), act: String(actRow), id: (ki ? 'k' : 'r') + i,
      };
    };
    const rows = rowsSrc.map((r, i) => mk(r, i, false));
    const kiRows = filt(D.KI).map((r, i) => mk({ ...r, why: r.why ? 'Warum: ' + r.why : '' }, i, true));

    // Chips
    const nOf = k => ({ buch: st.letter ? 1 : 0, art: st.pos.length, thema: st.thema.length,
      gebrauch: (st.oft ? 1 : 0) + (st.reg ? 1 : 0) + (st.alt ? 1 : 0), inhalt: st.inh.length, form: (st.sil ? 1 : 0) + (st.len ? 1 : 0) })[k];
    const chipV = k => {
      const n = nOf(k), open = st.pop === k;
      return { cls: 's1__chip' + (n ? ' is-on' : ''), exp: String(open), open, hasN: n > 0, n,
        tg: () => set({ pop: open ? '' : k }) };
    };
    const optL = (arr, key) => arr.map((t, i) => ({ t, on: String(st[key] === i), pick: () => set({ [key]: i }) }));
    const chkL = (arr, key) => arr.map(x => { const id = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x, n = Array.isArray(x) ? x[2] : '';
      const on = st[key].includes(id); return { t, n, on: String(on), pick: () => set({ [key]: on ? st[key].filter(v => v !== id) : st[key].concat(id) }) }; });

    // aktive Filter
    const actList = [];
    if (st.oft) actList.push({ k: 'Gebrauch', v: OFT[st.oft].replace(/ \(.*\)/, ''), rm: () => set({ oft: 0 }) });
    if (st.reg) actList.push({ k: 'Gebrauch', v: REG[st.reg], rm: () => set({ reg: 0 }) });
    if (st.alt) actList.push({ k: 'Alter', v: ALT[st.alt], rm: () => set({ alt: 0 }) });
    st.inh.forEach(id => actList.push({ k: 'Inhalt', v: INH.find(x => x[0] === id)[1], rm: () => set({ inh: st.inh.filter(v => v !== id) }) }));
    st.pos.forEach(id => actList.push({ k: 'Wortart', v: id, rm: () => set({ pos: st.pos.filter(v => v !== id) }) }));
    if (st.berol) actList.push({ k: 'Nur', v: 'Berolinismen', rm: () => set({ berol: false }) });
    if (st.letter) actList.push({ k: 'Buchstabe', v: st.letter, rm: () => set({ letter: '' }) });
    st.thema.forEach(id => actList.push({ k: 'Thema', v: id, rm: () => set({ thema: st.thema.filter(v => v !== id) }) }));
    if (st.sil) actList.push({ k: 'Silben', v: SIL[st.sil], rm: () => set({ sil: 0 }) });
    if (st.len) actList.push({ k: 'Länge', v: LEN[st.len].replace(/ \(.*\)/, ''), rm: () => set({ len: 0 }) });
    actList.forEach(a => a.aria = 'Filter entfernen: ' + a.k + ' ' + a.v);

    // Trefferzahlen (Mock)
    const total = mode === 'start' && !actList.length ? 5928 : rows.length;
    const fmt = n => n.toLocaleString('de-DE');
    const wn = n => fmt(n) + (n === 1 ? ' Wort' : ' Wörter');
    let metaA = '', metaB = '', metaC = '';
    if (mode === 'start') { metaA = ''; metaB = fmt(total); metaC = ' Wörter'; }
    else if (mode === 'laden') { metaA = 'Suche läuft …'; }
    else if (mode === 'leer' && byFilter) { metaA = 'Keene Treffer mit diesen Filtern'; }
    else if (mode === 'leer') { metaA = 'Keene Treffer für „'; metaB = qt; metaC = '“'; }
    else { metaB = fmt(total); metaC = ' Treffer für „' + qt + '“'; }

    const kiOn = !!qt && st.ki !== 'aus' && st.ki !== 'nein' && (st.ki !== 'angebot' || (describe && !st.dis));
    const kiGo = () => { if (st.model === 'fehlt' && st.ki !== 'laden') { set({ ki: 'laden' }); return; } set({ model: 'da' }); this.runKi(); };
    const kiTitles = {
      angebot: 'Dit klingt nach ’ner Beschreibung', laden: 'Einmal dit KI-Modell laden?', laeuft: 'Ick such nach Bedeutung …', fertig: 'Passt vielleicht: 5 Wörter nach Bedeutung' };
    const kiTexts = {
      angebot: 'Die Bedeutungssuche findet Wörter, die zu „' + qt + '“ passen, ooch wenn keen Stichwort übereinstimmt.',
      laden: 'Chrome braucht dafür einmalig sein eingebautes KI-Modell (mehrere GB, kommt von Google). Danach läuft die Bedeutungssuche ooch offline.',
      laeuft: 'Die Chrome-KI vergleicht deine Beschreibung mit den Bedeutungen im Wörterbuch.',
      fertig: 'Sortiert nach Bedeutung, nicht nach Stichwort. Die Stichworttreffer stehen darunter.' };
    const steps = ['Wörterbuch wird vorbereitet …', 'KI sortiert die besten 40 Kandidaten …'];

    const reg = LET.map(([t, n]) => ({ t, n: String(n), c: t === 'A' ? 'on' : '', cur: String(t === 'A'), aria: t + ', ' + n + (n === 1 ? ' Wort' : ' Wörter') }));
    const lettersPop = LET.slice(0, 12).concat([['…', '']]).slice(0, 12).map(([t, n]) => ({ t, n: String(n), on: String(st.letter === t), pick: () => set({ letter: st.letter === t ? '' : t }) }));

    const posSel = st.pos.length ? st.pos.join(', ') : 'Alle';
    const useSum = st.oft ? OFT[st.oft].replace(/ \(.*\)/, '') : 'Egal';
    const inhSum = st.inh.length ? st.inh.length + ' gewählt' : 'Alle';

    return {
      theme: p.theme || 'dark',
      rootCls: 's1 ' + (mob ? 's1--m' : 's1--d') + ' s1__mroot' + (mob && st.sheet ? ' s1--sheet' : ''),
      isDesk: !mob, isMob: mob,
      q, hasQ: !!q, showSlash: !q && !mob,
      ph: mob ? 'Wort oder Bedeutung' : 'Such ’n Wort oder wat et bedeutet, z. B. Schrippe oder Brötchen',
      typed: (e) => this.setState({ q: e && e.target ? e.target.value : '', z: 'live', act: 0, ki: 'angebot', fb: '' }),
      keyd: (e) => { if (e && e.key === 'Enter' && e.shiftKey && qt) { e.preventDefault(); kiGo(); } },
      clearQ: () => set({ q: '', z: 'start', ki: 'angebot' }),
      actId: rows.length ? 'r' + st.act : '',
      metaA, metaB, metaC,
      // chips
      c_buch: chipV('buch'), c_art: chipV('art'), c_thema: chipV('thema'), c_gebrauch: chipV('gebrauch'), c_inhalt: chipV('inhalt'), c_form: chipV('form'),
      closePop: () => set({ pop: '' }),
      countTxt: wn(mode === 'start' ? total : rows.length) + ' passen',
      o_oft: optL(OFT, 'oft'), o_reg: optL(REG, 'reg'), o_alt: optL(ALT, 'alt'), o_sil: optL(SIL, 'sil'), o_len: optL(LEN, 'len'),
      o_inh: chkL(INH, 'inh'), o_pos: chkL(POS, 'pos'), o_thema: chkL(THEMEN, 'thema'),
      lettersPop,
      berolOn: String(st.berol), tgBerol: () => set({ berol: !st.berol }),
      hasAct: actList.length > 0, actList, actN: actList.length, resetAll: () => set({ oft: 0, reg: 0, alt: 0, sil: 0, len: 0, inh: [], pos: [], thema: [], berol: false, letter: '' }),
      // mobile sheet
      sheetOpen: mob && st.sheet, openSheet: () => set({ sheet: true }), closeSheet: () => set({ sheet: false }),
      sheetBtn: wn(mode === 'start' ? total : rows.length) + ' zeigen', posSum: posSel, useSum, inhSum,
      // KI
      kiShow: kiOn, kiTitle: kiTitles[st.ki] || '', kiText: kiTexts[st.ki] || '',
      kiOffer: st.ki === 'angebot' || st.ki === 'laden', kiIsDl: st.ki === 'laden',
      kiBtn: st.ki === 'laden' ? 'Modell laden und suchen' : 'Nach Bedeutung suchen',
      kiStart: kiGo, kiNo: () => set({ ki: 'nein', dis: true }), kiNoTxt: st.ki === 'laden' ? 'Nee, lieber nich' : 'Nee, danke',
      kiPressed: String(st.ki === 'laeuft' || st.ki === 'fertig'), kiStop: () => { clearTimeout(this.t1); clearTimeout(this.t2); set({ ki: 'angebot' }); },
      kiRun: st.ki === 'laeuft', kiStep: steps[st.kiP || 0],
      progCls: 's1__prog', progP: '',
      kiDone: st.ki === 'fertig', kiRows,
      fbUp: String(st.fb === 'u'), fbDown: String(st.fb === 'd'), fbU: () => set({ fb: 'u' }), fbD: () => set({ fb: 'd' }),
      kiFromEmpty: kiGo,
      // Zustände
      qShow: qt || 'allen Wörtern',
      showBuchChip: mode !== 'start',
      isStart: mode === 'start', isLoad: mode === 'laden', isEmpty: mode === 'leer' && !byFilter, isFEmpty: mode === 'leer' && byFilter, hasRows: mode === 'suche',
      reg, startH: st.letter ? st.letter : 'A', startN: actList.length ? rows.length + (rows.length === 1 ? ' Wort' : ' Wörter') + ' (Beispieldaten)' : '412 Wörter',
      listH: describe ? 'Stichworttreffer' : 'Treffer', listN: describe ? 'Treffer in der Bedeutung, enthalten „lustig“' : (rows.length && rowsSrc[0].inM ? 'alle in der Bedeutung' : 'erst im Wort, dann in der Bedeutung'),
      rows, showMore: mode === 'start' && !actList.length,
      moreTxt: '12 von 412',
    };
  }
}'''.replace('@@DATA@@',DATA).replace('@@LET@@',_j.dumps(LETTERS,ensure_ascii=False))

PROPS2={"theme":{"editor":"enum","options":["dark","light"],"default":"dark"},
 "size":{"editor":"enum","options":["mobile","desktop"],"default":"desktop"},
 "zustand":{"editor":"enum","options":["start","suche","ki","leer","laden"],"default":"suche"},
 "ki":{"editor":"enum","options":["angebot","laden","laeuft","fertig"],"default":"angebot"},
 "popover":{"editor":"enum","options":["zu","buch","art","thema","gebrauch","inhalt","form"],"default":"zu"},
 "aktiv":{"editor":"enum","options":["nein","ja"],"default":"nein"},
 "sheet":{"editor":"enum","options":["zu","offen"],"default":"zu"}}

html=comp('Suche v1',CSS,BODY,SCRIPT,kalle_css=True)
html=html.replace(_j.dumps(PROPS),_j.dumps(PROPS2,ensure_ascii=False))
open(S+'canvas/project/SucheV1.dc.html','w').write(html)
print('ok',len(html))
