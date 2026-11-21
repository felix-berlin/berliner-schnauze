import math,re
INK='fill="var(--bv-ink)"';RED='fill="var(--bv-red)"';W='fill="var(--bv-white)"'
def claw(x,y,a,s=1.0): return '<path transform="translate(%s %s) rotate(%s) scale(%s)" d="M-10 2C-11-14-5-26 5-38 7-24 12-12 10 2Z"></path>'%(round(x,1),round(y,1),round(a,1),s)
def claws(p): return ''.join(claw(*q) for q in p)

TUFT='M2 -20L-15 -9 -3 -7 -16 5 -3 6 -13 19 5 15Z'
def tuft(x,y,a=0,sc=1.0,flip=False):
    return '<path transform="translate(%s %s) rotate(%s) scale(%s %s)" d="%s"></path>'%(x,y,a,-sc if flip else sc,sc,TUFT)
def tufts(pts):
    return ''.join(tuft(x,y,a,sc)+tuft(520-x,y,-a,sc,True) for x,y,a,sc in pts)
FURMARK='fill="none" stroke="var(--bv-ink2)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'
PROPS='''<g class="bv__prop bv__prop--beer"><g transform="translate(506 150) scale(1.4) translate(-506 -150)"><path d="M496 60L500 24h12l4 36z" fill="#6b3d1c"></path><rect x="498" y="14" width="16" height="11" rx="2" fill="#e9d7b0"></rect><rect x="488" y="58" width="36" height="96" rx="8" fill="#7a4a1e"></rect><rect x="488" y="86" width="36" height="42" fill="#f4ecd8"></rect><rect x="488" y="100" width="36" height="9" fill="var(--bv-red)"></rect><path d="M495 64v16" fill="none" stroke="#a9733c" stroke-width="4" stroke-linecap="round"></path><g fill="var(--bv-ink)"><rect x="474" y="126" width="62" height="15" rx="7.5"></rect><rect x="474" y="146" width="62" height="15" rx="7.5"></rect></g></g></g><g class="bv__prop bv__prop--roll"><ellipse cx="500" cy="124" rx="44" ry="29" fill="#d9a253"></ellipse><path d="M470 118q30-14 60 0" fill="none" stroke="#a8672a" stroke-width="6" stroke-linecap="round"></path><ellipse cx="486" cy="134" rx="12" ry="5" fill="#eabd78"></ellipse></g>'''
THUMB='<rect class="bv__thumb" x="424" y="122" width="64" height="30" rx="15" fill="var(--bv-ink)"></rect>'
GB='''<g class="bv__gangster"><path d="M152 302L214 296 260 372 306 296 368 302Q398 400 366 516L300 546 260 522 220 546 154 516Q122 400 152 302Z" fill="var(--bv-vest)"></path><path class="bv__detail" d="M176 330V506M202 320V524M228 330V536M292 330V536M318 320V524M344 330V506" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="2.5"></path><path d="M214 296L260 372 306 296" fill="none" stroke="var(--bv-ink)" stroke-width="6" stroke-linejoin="round"></path><g class="bv__detail" fill="#e9d7b0"><circle cx="260" cy="410" r="5.5"></circle><circle cx="260" cy="450" r="5.5"></circle><circle cx="260" cy="490" r="5.5"></circle></g><path d="M312 446h40" fill="none" stroke="var(--bv-ink)" stroke-width="5" stroke-linecap="round"></path><path class="bv__detail" d="M262 452Q296 492 336 448" fill="none" stroke="#e1b125" stroke-width="4" stroke-linecap="round"></path><path d="M186 286Q260 340 334 286L330 314Q260 366 190 314Z" fill="var(--bv-red)"></path><path d="M250 336l-24 56 32-16 8 24 14-62z" fill="#c22a13"></path></g>'''
GH='''<g class="bv__gangster"><g transform="rotate(-7 260 90)"><path d="M134 118Q124 62 196 40Q262 20 332 38Q400 58 386 118Q260 98 134 118Z" fill="var(--bv-cap)"></path><path d="M262 30Q214 50 204 106M262 30Q262 70 262 102M262 30Q312 50 318 106" fill="none" stroke="var(--bv-cap2)" stroke-width="3.5" stroke-linecap="round"></path><circle cx="262" cy="31" r="7" fill="var(--bv-cap2)"></circle><path d="M134 118Q260 98 386 118L382 130Q260 112 138 130Z" fill="var(--bv-cap2)"></path><path d="M172 126Q260 110 348 126Q342 152 260 156Q178 152 172 126Z" fill="var(--bv-cap2)"></path><path d="M190 134Q260 122 330 134" fill="none" stroke="var(--bv-cap)" stroke-width="3" stroke-linecap="round" opacity=".7"></path></g><g transform="rotate(16 290 262)"><rect x="286" y="254" width="64" height="16" rx="6" fill="#7a4a1e"></rect><rect x="340" y="254" width="12" height="16" rx="5" fill="var(--bv-red)"></rect><rect x="300" y="254" width="6" height="16" fill="#e1b125"></rect></g><path class="bv__smoke" d="M358 276q-16-22 2-40t-4-44" fill="none" stroke="#c9d1d8" stroke-width="6" stroke-linecap="round"></path></g>'''
GC='<g class="bv__gangster"><g class="bv__coin"><circle cx="436" cy="138" r="20" fill="#e1b125"></circle><circle cx="436" cy="138" r="12" fill="none" stroke="#b98d12" stroke-width="3.5"></circle></g></g>'

TORSO='M192 236L146 288Q100 298 94 342Q92 384 112 424Q140 472 158 520Q150 580 164 632Q206 672 260 668Q314 672 356 632Q370 580 362 520Q380 472 408 424Q428 384 426 342Q420 298 374 288L328 236Z'
HIP=(178,600);KNEE=(152,708);ANK=(158,784)
def leg(side,mask=False):
    m=(lambda x:x) if side=='l' else (lambda x:520-x)
    col='#000' if mask else 'var(--bv-ink)'; ex=16 if mask else 0
    foot='<path d="M%s 824Q%s 822 %s 806Q%s 790 %s 784H%sQ%s 790 %s 806Q%s 824 %s 824Z" fill="%s"></path>'%tuple([m(v) for v in (86,70,76,90,124,194,210,212,210,194)]+[col])
    if side=='r': foot='<path transform="translate(520 0) scale(-1 1)" d="M86 824Q70 822 76 806Q90 790 124 784H194Q210 790 212 806Q210 824 194 824Z" fill="%s"></path>'%col
    cl='' if mask else '<g class="bv__toes" %s>%s</g>'%(RED,claws([(m(104),806,(200 if side=='l' else 160),.7),(m(130),809,(187 if side=='l' else 173),.7),(m(156),809,(173 if side=='l' else 187),.7),(m(182),806,(160 if side=='l' else 200),.7)]))
    return ('<g class="bv__leg bv__leg--%s"><path d="M%s %sL%s %s" fill="none" stroke="%s" stroke-width="%d" stroke-linecap="round"></path>'
      '<g class="bv__shin bv__shin--%s"><path d="M%s %sL%s %s" fill="none" stroke="%s" stroke-width="%d" stroke-linecap="round"></path>'
      '<g class="bv__foot bv__foot--%s">%s%s</g></g></g>')%(side,m(HIP[0]),HIP[1],m(KNEE[0]),KNEE[1],col,108+ex,side,m(KNEE[0]),KNEE[1],m(ANK[0]),ANK[1],col,84+ex,side,foot,cl)
# planted-foot squat: hip drops by d, ankle stays
def squat(d):
    H=(HIP[0],HIP[1]+d);A=ANK
    L1=math.dist(HIP,KNEE);L2=math.dist(KNEE,ANK);dd=math.dist(H,A)
    al=math.acos(max(-1,min(1,(L1*L1+dd*dd-L2*L2)/(2*L1*dd))));base=math.atan2(A[1]-H[1],A[0]-H[0])
    K=(H[0]+L1*math.cos(base-al),H[1]+L1*math.sin(base-al))
    if K[0]>H[0]: K=(H[0]+L1*math.cos(base+al),H[1]+L1*math.sin(base+al))
    t0=math.atan2(KNEE[1]-HIP[1],KNEE[0]-HIP[0]);s0=math.atan2(ANK[1]-KNEE[1],ANK[0]-KNEE[0])
    t=math.degrees(math.atan2(K[1]-H[1],K[0]-H[0])-t0);sh=math.degrees(math.atan2(A[1]-K[1],A[0]-K[0])-s0)-t
    return round(t,1),round(sh,1),round(-(t+sh),1)
def sq(sel,d,extra_l='',extra_r=''):
    t,sh,f=squat(d)
    return ('%s .bv__leg--l{transform:translateY(%dpx) rotate(%sdeg)}%s .bv__shin--l{transform:rotate(%sdeg)}%s .bv__foot--l{transform:rotate(%sdeg)}'
            '%s .bv__leg--r{transform:translateY(%dpx) rotate(%sdeg)}%s .bv__shin--r{transform:rotate(%sdeg)}%s .bv__foot--r{transform:rotate(%sdeg)}')%(sel,d,t,sel,sh,sel,f,sel,d,-t,sel,-sh,sel,-f)
def sqk(pct,d,side='both'):
    t,sh,f=squat(d);o=''
    return t,sh,f
# ---- arm geometry (left; right is mirrored at x=260)
S=(132,338);E=(44,300);P=(14,138);AW=80
WR=(E[0]+(P[0]-E[0])*.86,E[1]+(P[1]-E[1])*.86)
SH=(S[0]+(E[0]-S[0])*.5,S[1]+(E[1]-S[1])*.5)

def hand_extras(m,sg):
    dx,dy=P[0]-E[0],P[1]-E[1];L=math.hypot(dx,dy);ux,uy=dx/L,dy/L
    tip=(P[0]+ux*70,P[1]+uy*70);ang=math.degrees(math.atan2(ux,-uy))
    fin=('<g class="bv__finger"><path d="M%s %sL%s %s" fill="none" stroke="var(--bv-ink)" stroke-width="30" stroke-linecap="round"></path><g %s>%s</g></g>'
         %(m(P[0]+ux*20),round(P[1]+uy*20,1),m(tip[0]),round(tip[1],1),RED,claw(m(tip[0]+ux*12),round(tip[1]+uy*12,1),round(ang*sg,1),.85)))
    kn='<g class="bv__knuckles" %s>%s</g>'%(RED,claws([(m(P[0]+ux*38+k*uy*-1),round(P[1]+uy*38+k*ux,1),round(ang*sg,1),.42) for k in (-27,-9,9,27)]))
    return '',kn
def arm(side,mask=False):
    m=(lambda x:round(x,1)) if side=='l' else (lambda x:round(520-x,1)); sg=1 if side=='l' else -1
    if mask:
        return ('<g class="bv__arm bv__arm--%s"><path d="M%s %sL%s %s" fill="none" stroke="#000" stroke-width="%d" stroke-linecap="round"></path>'
          '<g class="bv__fore bv__fore--%s"><path d="M%s %sL%s %s" fill="none" stroke="#000" stroke-width="%d" stroke-linecap="round"></path><ellipse cx="%s" cy="%s" rx="58" ry="54" fill="#000"></ellipse></g></g>')%(side,m(SH[0]),SH[1],m(E[0]),E[1],AW+16,side,m(E[0]),E[1],m(WR[0]),round(WR[1],1),AW+16,m(P[0]),P[1])
    fan=[(-40,24,-40),(-22,6,-21),(0,0,0),(22,6,21),(40,24,40)]
    # claws fan around paw top, in forearm direction (approx. up)
    cl=claws([(m(P[0]+dx*sg) if side=='l' else m(P[0]+dx),P[1]-46+dy,a*sg,.95) for dx,dy,a in fan])
    fin,kn=hand_extras(m,sg)
    return ('<g class="bv__arm bv__arm--%s"><path d="M%s %sL%s %s" fill="none" stroke="var(--bv-ink)" stroke-width="%d" stroke-linecap="round"></path>'
      '<g class="bv__fore bv__fore--%s"><g class="bv__claws" %s>%s</g>%s<path d="M%s %sL%s %s" fill="none" stroke="var(--bv-ink)" stroke-width="%d" stroke-linecap="round"></path>%s<ellipse cx="%s" cy="%s" rx="50" ry="46" %s></ellipse>%s%s</g></g>')%(side,m(S[0]),S[1],m(E[0]),E[1],AW,side,RED,cl,fin,m(E[0]),E[1],m(WR[0]),round(WR[1],1),AW,(THUMB if side=='r' else ''),m(P[0]),P[1],INK,kn,(PROPS+GC if side=='r' else ''))
BODY='M192 236L146 288Q100 298 94 342Q92 384 112 424Q140 472 158 520Q130 560 120 610Q108 660 104 700Q112 735 130 762L124 788Q88 792 78 806Q72 822 92 824H196Q212 822 208 800L198 762Q188 720 206 682Q230 652 260 640Q290 652 314 682Q332 720 322 762L312 800Q308 822 324 824H428Q448 822 442 806Q432 792 396 788L390 762Q408 735 416 700Q412 660 400 610Q390 560 362 520Q380 472 408 424Q428 384 426 342Q420 298 374 288L328 236Z'
body=('<g class="bv__body"><g class="bv__breath"><path d="%s" %s></path>'+GB+'</g></g>')%(TORSO,INK)
LEGS=leg('l')+leg('r');MLEGS=''
head='''<g class="bv__head"><g class="bv__nod"><g transform="translate(260 300) scale(.93) translate(-260 -300)">
<g class="bv__ear bv__ear--l"><g class="bv__earin"><circle cx="150" cy="96" r="36" %(INK)s></circle><path d="M136 92c3-10 10-17 20-19" fill="none" stroke="var(--bv-white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<g class="bv__ear bv__ear--r"><g class="bv__earin"><circle cx="370" cy="96" r="36" %(INK)s></circle><path d="M384 92c-3-10-10-17-20-19" fill="none" stroke="var(--bv-white)" stroke-width="7" stroke-linecap="round"></path></g></g>
<path d="M200 68H320Q374 82 394 150L406 214Q402 264 352 292L300 316Q260 326 220 316L168 292Q118 264 114 214L126 150Q146 82 200 68Z" %(INK)s></path>
<path d="M212 190H308Q336 236 324 280 292 310 260 310 228 310 196 280 184 236 212 190Z" fill="var(--bv-ink2)"></path>
<g class="bv__blush" fill="var(--bv-red)"><ellipse cx="170" cy="232" rx="18" ry="11"></ellipse><ellipse cx="350" cy="232" rx="18" ry="11"></ellipse></g><g class="bv__eyes"><g class="bv__eye bv__eye--l"><g class="bv__wide"><g class="bv__blink"><circle cx="208" cy="160" r="14" %(W)s></circle><g class="bv__glance"><circle class="bv__pupil" cx="208" cy="162" r="8.5" %(INK)s></circle><circle cx="204.5" cy="158" r="2.8" %(W)s></circle></g></g></g></g>
<g class="bv__eye bv__eye--r"><g class="bv__wide"><g class="bv__blink"><circle cx="312" cy="160" r="14" %(W)s></circle><g class="bv__glance"><circle class="bv__pupil" cx="312" cy="162" r="8.5" %(INK)s></circle><circle cx="308.5" cy="158" r="2.8" %(W)s></circle></g></g></g></g></g>
<g class="bv__brows" fill="none" stroke="var(--bv-brow)" stroke-width="11" stroke-linecap="round"><path class="bv__brow bv__brow--l" d="M184 130Q208 117 232 126"></path><path class="bv__brow bv__brow--r" d="M288 126Q312 117 336 130"></path></g><g class="bv__lid" %(INK)s><path d="M190 138h38v20l-38-9z"></path><path d="M330 138h-38v20l38-9z"></path></g>
<path class="bv__sleep" d="M192 162q16 11 32 0M296 162q16 11 32 0" fill="none" stroke="var(--bv-white)" stroke-width="6" stroke-linecap="round"></path>
<g class="bv__grr" %(INK)s><path d="M188 134h44v34l-44-18z"></path><path d="M332 134h-44v34l44-18z"></path></g>
<path d="M222 192q38-16 76 0q-4 32-38 40q-34-8-38-40z" fill="var(--bv-nose)"></path><ellipse cx="246" cy="198" rx="11" ry="5" %(W)s opacity=".5"></ellipse>
<g class="bv__blep"><ellipse cx="260" cy="272" rx="12" ry="12" %(RED)s></ellipse></g>
<g class="bv__smile" fill="none" stroke="var(--bv-nose)" stroke-width="6" stroke-linecap="round"><path d="M260 232v22"></path><path class="bv__curve" d="M232 252q28 20 56 0"></path></g>
<g class="bv__yawn"><ellipse cx="260" cy="262" rx="28" ry="36" fill="var(--bv-mouth)"></ellipse><ellipse cx="260" cy="286" rx="15" ry="9" %(RED)s></ellipse></g><g class="bv__open"><path d="M206 240q54-12 108 0l-10 50q-44 18-88 0z" fill="var(--bv-mouth)"></path>
<path d="M212 240l13 30 12-33zm96 0l-13 30-12-33zm-66-4l8 17 8-18zm36 0l-8 17-8-18z" %(W)s></path><path d="M226 294l8-22 10 26zm68 0l-8-22-10 26z" %(W)s></path>
<g class="bv__tongue"><path d="M238 268C236 314 246 340 260 340S284 314 282 268Z" %(RED)s></path><path d="M260 278v40" fill="none" stroke="var(--bv-mouth)" stroke-width="4" stroke-linecap="round"></path></g></g>
%(GH)s</g></g></g>'''%dict(INK=INK,W=W,RED=RED,GH=GH)
def full(i):
    return '''<svg class="bv__svg" viewBox="-140 -70 800 950" %%ARIA%%>
<defs><mask id="bv-m-%(i)s" maskUnits="userSpaceOnUse" x="-200" y="-200" width="920" height="1200"><rect x="-200" y="-200" width="920" height="1200" fill="#fff"></rect><g class="bv__upper">%(ml)s%(mr)s</g></mask></defs>
<circle class="bv__disc" cx="260" cy="440" r="360"></circle>
<ellipse class="bv__shadow" cx="260" cy="829" rx="200" ry="11"></ellipse>
<g class="bv__pop"><g class="bv__react"><g class="bv__all"><g mask="url(#bv-m-%(i)s)">%(legs)s<g class="bv__upper">%(body)s%(head)s</g></g><g class="bv__upper">%(al)s%(ar)s</g><g class="bv__shout" fill="none" stroke="var(--bv-red)" stroke-width="10" stroke-linecap="round"><path d="M196 44l-14-36M260 30v-42M324 44l14-36"></path></g></g></g></g>
<g class="bv__waves" fill="none" stroke="var(--bv-red)" stroke-width="9" stroke-linecap="round"><path d="M44 62q-16 24 0 48"></path><path d="M18 46q-26 40 0 80"></path><path d="M-8 30q-36 56 0 112"></path></g>
<text class="bv__bang" x="376" y="96" fill="var(--bv-red)" font-family="Berlin, sans-serif" font-weight="700" font-size="110">!</text>
<g class="bv__dots" fill="var(--bv-red)"><circle cx="372" cy="92" r="9"></circle><circle cx="402" cy="70" r="11"></circle><circle cx="438" cy="44" r="14"></circle></g>
<text class="bv__hick" x="352" y="92" fill="var(--bv-red)" font-family="Berlin, sans-serif" font-weight="700" font-size="54">Hick!</text>
<g class="bv__bubbles" fill="none" stroke="var(--bv-red)" stroke-width="5"><circle cx="150" cy="90" r="9"></circle><circle cx="118" cy="120" r="6"></circle><circle cx="170" cy="130" r="5"></circle></g>
<text class="bv__shush" x="378" y="250" fill="var(--bv-red)" font-family="Berlin, sans-serif" font-weight="700" font-size="56">Pst!</text>
<g class="bv__crumbs" fill="#d9a253"><circle cx="270" cy="286" r="5"></circle><circle cx="292" cy="292" r="4"></circle><circle cx="252" cy="296" r="4"></circle></g>
<text class="bv__q" x="380" y="84" fill="var(--bv-red)" font-family="Berlin, sans-serif" font-weight="700" font-size="104">?</text>
<g class="bv__zzz" fill="var(--bv-red)" font-family="Berlin, sans-serif" font-weight="700"><text x="396" y="130" font-size="60">Z</text><text x="446" y="76" font-size="46">z</text><text x="484" y="32" font-size="34">z</text></g>
</svg>'''%dict(i=i,ml=arm('l',True),mr=arm('r',True),body=body,head=head,al=arm('l'),ar=arm('r'),legs=LEGS)
def head_only(): return '<svg class="bv__svg" viewBox="96 50 328 284" %ARIA%>'+head+'</svg>'
def peek(i):
    cl=lambda x:claws([(x-30,214,196,.6),(x-10,218,185,.6),(x+10,218,175,.6),(x+30,214,164,.6)])
    return '''<svg class="bv__svg" viewBox="60 60 400 172" %%ARIA%%><defs><clipPath id="bv-l-%s"><rect x="0" y="-200" width="520" height="406"></rect></clipPath></defs>
<g clip-path="url(#bv-l-%s)">%s</g><g class="bv__peekpaws"><g %s>%s%s</g><g clip-path="url(#bv-l-%s)"><ellipse cx="134" cy="206" rx="46" ry="32" %s></ellipse><ellipse cx="386" cy="206" rx="46" ry="32" %s></ellipse></g></g></svg>'''%(i,i,head,RED,cl(134),cl(386),i,INK,INK)
# ---- IK
L1=math.dist(S,E);L2=math.dist(E,P);a1=math.atan2(E[1]-S[1],E[0]-S[0]);a2=math.atan2(P[1]-E[1],P[0]-E[0])
def ik(T,key,S_=S):
    d=min(math.dist(S_,T),L1+L2-1);base=math.atan2(T[1]-S_[1],T[0]-S_[0]);al=math.acos(max(-1,min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))));r=[]
    n=lambda x:(x+180)%360-180
    for sg in (1,-1):
        u=base+sg*al;El=(S_[0]+L1*math.cos(u),S_[1]+L1*math.sin(u));f=math.atan2(T[1]-El[1],T[0]-El[0]);t1=n(math.degrees(u-a1));r.append((El,round(t1,1),round(n(math.degrees(f-a2)-t1),1)))
    r.sort(key=key);return r[0][1],r[0][2]
IK=dict(visor=ik((232,84),lambda s:s[0][0],(132,304)),hip=ik((150,556),lambda s:s[0][0]),shrug=ik((6,336),lambda s:-s[0][1]),face=ik((212,162),lambda s:-s[0][1]),hang=ik((96,584),lambda s:s[0][0]),point=ik((-122,296),lambda s:s[0][1]),ear=ik((88,150),lambda s:s[0][0]),thumb=ik((-30,428),lambda s:-s[0][1]),chin=ik((232,322),lambda s:-s[0][1]),belly=ik((236,470),lambda s:s[0][0]),lip=ik((256,268),lambda s:-s[0][1]),mouth=ik((252,276),lambda s:-s[0][1]),relax=ik((118,594),lambda s:s[0][0]))
def pose(sel,l=None,r=None):
    o=''
    if l: o+='%s .bv__arm--l{animation:none;transform:rotate(%sdeg)}%s .bv__fore--l{transform:rotate(%sdeg)}\n'%(sel,IK[l][0],sel,IK[l][1])
    if r: o+='%s .bv__arm--r{animation:none;transform:rotate(%sdeg)}%s .bv__fore--r{transform:rotate(%sdeg)}\n'%(sel,-IK[r][0],sel,-IK[r][1])
    return o
m=lambda x:520-x
css='''.bv{display:block;--bv-ink:#2b333b;--bv-ink2:#3a454f;--bv-nose:#12161a;--bv-red:#f2391d;--bv-white:#fff;--bv-mouth:#7d170b;--bv-disc:#fad0b0;--bv-shadow:rgb(0 0 0 / 18%%);--bv-edge:transparent}
.bv--dark{--bv-ink:#14181c;--bv-ink2:#252d35;--bv-nose:#000;--bv-disc:#566676;--bv-shadow:rgb(0 0 0 / 35%%)}
.bv--plain .bv__disc{display:none}
.bv--dark.bv--plain{--bv-edge:#a9b8c6}
.bv--dark.bv--plain .bv__all,.bv--dark.bv--head .bv__head,.bv--dark.bv--peek .bv__svg{filter:drop-shadow(1.2px 0 0 var(--bv-edge)) drop-shadow(-1.2px 0 0 var(--bv-edge)) drop-shadow(0 1.2px 0 var(--bv-edge)) drop-shadow(0 -1.2px 0 var(--bv-edge))}
.bv__svg{display:block;width:100%%;height:auto;overflow:visible}
.bv__disc{fill:var(--bv-disc)}
.bv__shadow{fill:var(--bv-shadow);transform-origin:260px 829px}
.bv__all{transform-origin:260px 824px;animation:bv-sway 6.1s ease-in-out infinite}
.bv__body{transform-origin:260px 660px}
.bv__breath{transform-origin:260px 660px;animation:bv-breathe 4s ease-in-out infinite}
.bv__head{transform-origin:260px 296px;animation:bv-head 5.3s ease-in-out infinite}
.bv__arm,.bv__fore{transition:transform .35s cubic-bezier(.3,1.3,.5,1)}
.bv__head,.bv__eye,.bv__curve,.bv__open,.bv__blep,.bv__pupil{transition:transform .3s ease-out}
.bv__lid,.bv__smile,.bv__eyes,.bv__sleep,.bv__grr,.bv__thumb,.bv__prop,.bv__gangster,.bv__claws,.bv__knuckles{transition:opacity .2s}
.bv__pop{transform-origin:260px 824px}
.bv--sw-a .bv__pop{animation:bv-sw-a .5s cubic-bezier(.3,1.3,.5,1)}
.bv--sw-b .bv__pop{animation:bv-sw-b .5s cubic-bezier(.3,1.3,.5,1)}
.bv--enter .bv__pop,.bv--exit .bv__pop{animation:none}
@keyframes bv-sw-a{0%%{transform:scale(1.05,.93)}45%%{transform:scale(.97,1.05)}100%%{transform:none}}
@keyframes bv-sw-b{0%%{transform:scale(1.05,.93)}45%%{transform:scale(.97,1.05)}100%%{transform:none}}
.bv__arm--l{transform-origin:%(sx)spx %(sy)spx;animation:bv-arml 4.6s ease-in-out infinite}
.bv__arm--r{transform-origin:%(sxr)spx %(sy)spx;animation:bv-armr 4.6s ease-in-out infinite}
.bv__fore--l{transform-origin:%(ex)spx %(ey)spx}.bv__fore--r{transform-origin:%(exr)spx %(ey)spx}
.bv__eye--l{transform-origin:208px 160px}.bv__eye--r{transform-origin:312px 160px}
.bv__blink,.bv__wide{transform-box:fill-box;transform-origin:center}
.bv__blink{animation:bv-blink 7s infinite}
.bv--nap .bv__blink,.bv--yawn .bv__blink,.bv--doze .bv__blink,.bv--follow .bv__glance{animation:none}
.bv__ear--r{transform-origin:330px 130px;animation:bv-ear 9s ease-in-out infinite}
.bv__pupil{transition:transform .2s}
.bv__lid,.bv__smile,.bv__blep{transition:opacity .15s,transform .2s}
.bv__curve{transform-origin:260px 258px;transition:transform .2s}
.bv__yawn{transform-origin:260px 232px;transform:scaleY(0)}
.bv__open{transform-origin:260px 236px;transform:scaleY(0);transition:transform .2s}
.bv__tongue{transform-origin:260px 268px}
.bv__blep{transform-origin:260px 262px;transform:scaleY(0)}
.bv__sleep,.bv__grr,.bv__shout,.bv__q,.bv__zzz{opacity:0}
.bv__q{transform-origin:392px 70px}.bv__shout{transform-origin:260px 40px}
@keyframes bv-sway{0%%,100%%{transform:rotate(-.6deg)}50%%{transform:rotate(.6deg)}}
@keyframes bv-breathe{0%%,100%%{transform:scale(1,1)}50%%{transform:scale(1.012,1.015)}}
@keyframes bv-head{0%%,100%%{transform:translateY(0) rotate(-1.2deg)}50%%{transform:translateY(-4px) rotate(1.2deg)}}
@keyframes bv-arml{0%%,100%%{transform:rotate(0)}50%%{transform:rotate(3deg)}}
@keyframes bv-armr{0%%,100%%{transform:rotate(0)}50%%{transform:rotate(-3deg)}}
@keyframes bv-blink{0%%,18%%,21%%,24%%,27%%,69%%,72%%,100%%{transform:scaleY(1)}19.5%%,25.5%%,70.5%%{transform:scaleY(.08)}}
@keyframes bv-ear{0%%,38%%,46%%,100%%{transform:rotate(0)}40%%,44%%{transform:rotate(12deg)}42%%{transform:rotate(-4deg)}}
@keyframes bv-flap{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
@keyframes bv-shout{0%%{transform:scale(1)}100%%{transform:scale(1.05)}}
@keyframes bv-look{0%%,100%%{transform:translateX(-7px)}50%%{transform:translateX(7px)}}
@keyframes bv-shadow{0%%,100%%{transform:scaleX(1)}50%%{transform:scaleX(.82)}}

/* wave */
'''+pose('.bv--wave','hang',None)+'''.bv--wave .bv__arm--r{animation:bv-wave .6s ease-in-out infinite}
.bv--wave .bv__head{animation:bv-tilt 1.2s ease-in-out infinite}
.bv--wave .bv__lid{opacity:0}
.bv--wave .bv__blep{transform:scaleY(1)}
@keyframes bv-wave{0%%,100%%{transform:rotate(-10deg)}50%%{transform:rotate(16deg)}}
@keyframes bv-tilt{0%%,100%%{transform:rotate(4deg)}50%%{transform:rotate(8deg)}}

/* roar */
.bv--roar .bv__smile,.bv--roar .bv__lid{opacity:0}
.bv--roar .bv__grr{opacity:1}
.bv--roar .bv__open{transform:scaleY(1.35);animation:bv-jaw .2s ease-in-out infinite alternate}
.bv--roar .bv__eye{animation:none}
.bv--roar .bv__tongue{animation:bv-flap .16s ease-in-out infinite alternate}
.bv--roar .bv__head{animation:bv-roar .12s linear infinite alternate}
.bv--roar .bv__arm--l{animation:bv-clawl .24s ease-in-out infinite alternate}
.bv--roar .bv__arm--r{animation:bv-clawr .24s ease-in-out infinite alternate}
.bv--roar .bv__shout{opacity:1;animation:bv-shout .3s steps(2) infinite}
@keyframes bv-jaw{from{transform:scaleY(1.25)}to{transform:scaleY(1.45)}}
@keyframes bv-roar{from{transform:translate(-2px,-6px) scale(1.06)}to{transform:translate(2px,-6px) scale(1.06)}}
@keyframes bv-clawl{from{transform:rotate(10deg)}to{transform:rotate(16deg)}}
@keyframes bv-clawr{from{transform:rotate(-10deg)}to{transform:rotate(-16deg)}}

/* dance */
.bv--dance .bv__all{animation:bv-dance 1s ease-in-out infinite}
.bv--dance .bv__arm--l{animation:bv-dl 1s ease-in-out infinite}
.bv--dance .bv__arm--r{animation:bv-dr 1s ease-in-out infinite}
.bv--dance .bv__head{animation:bv-dh 1s ease-in-out infinite}
.bv--dance .bv__shadow{animation:bv-shadow .5s ease-in-out infinite}
.bv--dance .bv__lid{opacity:0}
.bv--dance .bv__curve{transform:scaleY(1.6)}
.bv--dance .bv__blep{transform:scaleY(1)}
.bv--dance .bv__eye{animation:none;transform:scaleY(.55)}
.bv--dance .bv__tongue{animation:bv-flap .25s ease-in-out infinite alternate}
@keyframes bv-dance{0%%,100%%{transform:rotate(-5deg)}25%%,75%%{transform:rotate(0)}50%%{transform:rotate(5deg)}}
@keyframes bv-dl{0%%,100%%{transform:rotate(-40deg)}50%%{transform:rotate(14deg)}}
@keyframes bv-dr{0%%,100%%{transform:rotate(-14deg)}50%%{transform:rotate(40deg)}}
@keyframes bv-dh{0%%,100%%{transform:rotate(6deg)}50%%{transform:rotate(-6deg)}}

/* look */
'''+pose('.bv--look','visor','hip').replace('transform:rotate(%sdeg)}.bv--look .bv__fore--l'%IK['visor'][0],'transform:translate(0,-34px) rotate(%sdeg)}.bv--look .bv__fore--l'%IK['visor'][0])+'''.bv--look .bv__head{animation:bv-peer 4s ease-in-out infinite}
.bv--look .bv__pupil{animation:bv-look 4s ease-in-out infinite}
.bv--look .bv__eye{animation:none}
.bv--look .bv__lid{opacity:0}
.bv--look .bv__curve{transform:scaleY(.2)}
@keyframes bv-peer{0%%,100%%{transform:translate(-8px,6px) rotate(-5deg)}50%%{transform:translate(8px,6px) rotate(5deg)}}

/* blank */
'''+pose('.bv--blank','shrug','shrug')+'''.bv--blank .bv__head{animation:bv-shrug 2.4s ease-in-out infinite}
.bv--blank .bv__arm--l{animation:bv-shl 2.4s ease-in-out infinite}
.bv--blank .bv__arm--r{animation:bv-shr 2.4s ease-in-out infinite}
.bv--blank .bv__pupil{transform:translate(0,-5px)}
.bv--blank .bv__lid{opacity:0}
.bv--blank .bv__curve{transform:scaleY(-.5)}
.bv--blank .bv__q{opacity:1;animation:bv-q 2.4s ease-in-out infinite}
@keyframes bv-shrug{0%%,100%%{transform:translateY(8px) rotate(7deg)}50%%{transform:translateY(16px) rotate(9deg)}}
@keyframes bv-shl{0%%,100%%{transform:rotate(%(shl)sdeg)}50%%{transform:translateY(-12px) rotate(%(shl)sdeg)}}
@keyframes bv-shr{0%%,100%%{transform:rotate(%(shr)sdeg)}50%%{transform:translateY(-12px) rotate(%(shr)sdeg)}}
@keyframes bv-q{0%%,100%%{transform:translateY(0) rotate(8deg)}50%%{transform:translateY(-10px) rotate(14deg)}}

/* cheer */
.bv--cheer .bv__all{animation:bv-jump .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__arm--l{animation:bv-jl .3s ease-in-out infinite alternate}
.bv--cheer .bv__arm--r{animation:bv-jr .3s ease-in-out infinite alternate}
.bv--cheer .bv__smile,.bv--cheer .bv__lid{opacity:0}
.bv--cheer .bv__open{transform:scaleY(1.2)}
.bv--cheer .bv__tongue{animation:bv-flap .2s ease-in-out infinite alternate}
.bv--cheer .bv__shadow{animation:bv-jshadow .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__shout{opacity:1;animation:bv-shout .3s steps(2) infinite}
.bv--cheer .bv__head{animation:bv-jhead .6s ease-in-out infinite alternate}
@keyframes bv-jump{from{transform:translateY(0)}to{transform:translateY(-80px)}}
@keyframes bv-jl{from{transform:rotate(-16deg)}to{transform:rotate(4deg)}}
@keyframes bv-jr{from{transform:rotate(16deg)}to{transform:rotate(-4deg)}}
@keyframes bv-jshadow{from{transform:scaleX(1)}to{transform:scaleX(.7)}}
@keyframes bv-jhead{from{transform:rotate(-3deg)}to{transform:rotate(3deg) translateY(-6px)}}

/* facepalm */
'''+pose('.bv--facepalm','hang','face')+'''.bv--facepalm .bv__head{animation:bv-fp 3s ease-in-out infinite}
.bv--facepalm .bv__curve{transform:scaleY(-.8)}
.bv--facepalm .bv__eye{animation:none}
.bv--facepalm .bv__eye--l{transform:scaleY(.4)}
.bv--facepalm .bv__arm--r{animation:bv-fpa 3s ease-in-out infinite}
@keyframes bv-fp{0%%,100%%{transform:translateY(10px) rotate(-4deg)}50%%{transform:translateY(14px) rotate(-7deg)}}
@keyframes bv-fpa{0%%,100%%{transform:translateY(8px) rotate(%(fpa)sdeg)}50%%{transform:translateY(12px) rotate(%(fpa)sdeg)}}

/* nap */
'''+pose('.bv--nap','hang','hang')+'''.bv--nap .bv__eyes,.bv--nap .bv__lid{opacity:0}
.bv--nap .bv__sleep{opacity:1}
.bv--nap .bv__curve{transform:scaleY(.25)}
.bv--nap .bv__blep{transform:scaleY(.8)}
.bv--nap .bv__head{animation:bv-snooze 5s ease-in-out infinite}
.bv--nap .bv__all{animation:bv-snoozebody 5s ease-in-out infinite}
.bv--nap .bv__body{animation-duration:5s}
.bv--nap .bv__ear--r{animation:none}
.bv--nap .bv__zzz{opacity:1}
.bv--nap .bv__zzz text{animation:bv-zzz 3s ease-in-out infinite}
.bv--nap .bv__zzz text:nth-child(2){animation-delay:.6s}
.bv--nap .bv__zzz text:nth-child(3){animation-delay:1.2s}
@keyframes bv-snooze{0%%,100%%{transform:translateY(12px) rotate(9deg)}50%%{transform:translateY(20px) rotate(13deg)}}
@keyframes bv-snoozebody{0%%,100%%{transform:rotate(1deg)}50%%{transform:rotate(2.5deg)}}
@keyframes bv-zzz{0%%{opacity:0;transform:translate(-10px,14px)}30%%,70%%{opacity:1}100%%{opacity:0;transform:translate(14px,-22px)}}

/* looking around while idle */
.bv__glance{animation:bv-glance 9s ease-in-out infinite}
.bv--roar .bv__glance,.bv--scare .bv__glance,.bv--shake .bv__glance,.bv--look .bv__glance,.bv--enter .bv__glance{animation:none}
@keyframes bv-glance{0%%,28%%,40%%,58%%,70%%,100%%{transform:translateX(0)}31%%,37%%{transform:translateX(-6px)}61%%,67%%{transform:translateX(6px)}}
.bv__waves{opacity:0}

/* enter (runs once) */
.bv--enter .bv__all{animation:bv-enter .9s cubic-bezier(.2,.8,.3,1) both}
.bv--enter .bv__shadow{animation:bv-entershadow .9s ease-out both}
.bv--enter .bv__arm--l{animation:bv-enterl .9s cubic-bezier(.3,1.4,.5,1) both}
.bv--enter .bv__arm--r{animation:bv-enterr .9s cubic-bezier(.3,1.4,.5,1) both}
.bv--enter .bv__head{animation:bv-enterhead .9s ease-out both}
.bv--enter .bv__lid{opacity:0}
@keyframes bv-enter{0%%{transform:translateY(300px) scale(.86,.6);opacity:0}25%%{opacity:1}58%%{transform:translateY(-34px) scale(.98,1.04)}76%%,100%%{transform:none}}
@keyframes bv-entershadow{0%%{transform:scaleX(.3);opacity:0}60%%{transform:scaleX(.8);opacity:1}100%%{transform:none}}
@keyframes bv-enterl{0%%,35%%{transform:rotate(-70deg)}75%%{transform:rotate(8deg)}100%%{transform:rotate(0)}}
@keyframes bv-enterr{0%%,35%%{transform:rotate(70deg)}75%%{transform:rotate(-8deg)}100%%{transform:rotate(0)}}
@keyframes bv-enterhead{0%%,40%%{transform:translateY(16px)}70%%{transform:translateY(-8px)}100%%{transform:none}}

/* nod */
'''+pose('.bv--nod','hang','hang')+'''.bv--nod .bv__head{animation:bv-nod 2.2s ease-in-out infinite}
.bv--nod .bv__lid{opacity:0}
@keyframes bv-nod{0%%,50%%,100%%{transform:translateY(0) scaleY(1)}12%%,36%%{transform:translateY(16px) scaleY(.95)}24%%{transform:translateY(-2px) scaleY(1)}}

/* shake (head shake) */
'''+pose('.bv--shake','hang','hang')+'''.bv--shake .bv__head{animation:bv-shake 2.2s ease-in-out infinite}
.bv--shake .bv__eyes{animation:bv-shakeeyes 2.2s ease-in-out infinite}
.bv--shake .bv__curve{transform:scaleY(-.5)}
@keyframes bv-shake{0%%,55%%,100%%{transform:translateX(0) rotate(0)}10%%,34%%{transform:translateX(-14px) rotate(-4deg)}22%%,46%%{transform:translateX(14px) rotate(4deg)}}
@keyframes bv-shakeeyes{0%%,55%%,100%%{transform:translateX(0)}10%%,34%%{transform:translateX(-8px)}22%%,46%%{transform:translateX(8px)}}

/* point */
'''+pose('.bv--point','hang','point')+'''.bv--point .bv__arm--r{animation:bv-point 1.2s ease-in-out infinite}
.bv--point .bv__head{animation:bv-pointhead 1.2s ease-in-out infinite}
.bv--point .bv__pupil{transform:translateX(7px)}
.bv--point .bv__lid{opacity:0}
@keyframes bv-point{0%%,100%%{transform:rotate(%(ptr)sdeg)}50%%{transform:translateX(14px) rotate(%(ptr)sdeg)}}
@keyframes bv-pointhead{0%%,100%%{transform:translateX(8px) rotate(5deg)}50%%{transform:translateX(12px) rotate(7deg)}}

/* listen */
'''+pose('.bv--listen','ear','hang')+'''.bv--listen .bv__head{animation:bv-listen 3s ease-in-out infinite}
.bv--listen .bv__ear--l{transform-origin:176px 126px;animation:bv-twitch .5s ease-in-out infinite}
.bv--listen .bv__ear--r{animation:none}
.bv--listen .bv__pupil{transform:translateX(-7px)}
.bv--listen .bv__lid{opacity:0}
.bv--listen .bv__curve{transform:scaleY(.3)}
.bv--listen .bv__waves{opacity:1}
.bv--listen .bv__waves path{animation:bv-wave3 1.2s ease-out infinite}
.bv--listen .bv__waves path:nth-child(2){animation-delay:.2s}
.bv--listen .bv__waves path:nth-child(3){animation-delay:.4s}
@keyframes bv-listen{0%%,100%%{transform:rotate(-8deg)}50%%{transform:rotate(-11deg)}}
@keyframes bv-twitch{0%%,100%%{transform:rotate(0)}50%%{transform:rotate(-10deg)}}
@keyframes bv-wave3{0%%{opacity:0}30%%{opacity:1}100%%{opacity:0}}

/* --- props and signs --- */
.bv__prop,.bv__thumb,.bv__blush,.bv__bang,.bv__dots,.bv__hick,.bv__bubbles,.bv__shush,.bv__crumbs{opacity:0}
.bv__bang{transform-origin:392px 60px}.bv__hick{transform-origin:400px 80px}.bv__shush{transform-origin:420px 236px}

/* exit (runs once) */
.bv--exit .bv__all{animation:bv-exit 2s ease-in both}
.bv--exit .bv__shadow{animation:bv-exitshadow 2s ease-in both}
.bv--exit .bv__arm--r{animation:bv-wave .3s ease-in-out 4}
.bv--exit .bv__head{animation:bv-exithead 2s ease-in-out both}
.bv--exit .bv__lid{opacity:0}
.bv--exit .bv__blep{transform:scaleY(1)}
@keyframes bv-exithead{0%%{transform:none}20%%,55%%{transform:rotate(7deg)}100%%{transform:rotate(-4deg)}}
@keyframes bv-exit{0%%,55%%{transform:none;opacity:1}68%%{transform:none}76%%{transform:translateY(-30px) scale(.98,1.05)}92%%{opacity:1}100%%{transform:translateY(360px) scale(.9,.6);opacity:0}}
@keyframes bv-exitshadow{0%%,70%%{transform:none;opacity:1}100%%{transform:scaleX(.3);opacity:0}}

/* run-up: breathing in before the roar */
.bv--roar .bv__body{animation:bv-roarin .45s ease-out}
@keyframes bv-roarin{0%%{transform:scale(1)}35%%{transform:scale(1.05,.95)}70%%{transform:scale(.97,1.05)}100%%{transform:scale(1)}}

/* thumbs up */
'''+pose('.bv--thumbs-up','hip','thumb')+'''.bv--thumbs-up .bv__thumb{opacity:1}
.bv--thumbs-up .bv__arm--r{animation:bv-thumb 1.4s ease-in-out infinite}
.bv--thumbs-up .bv__lid{opacity:0}
.bv--thumbs-up .bv__curve{transform:scaleY(1.5)}
.bv--thumbs-up .bv__eye--r{animation:bv-wink 2.8s ease-in-out infinite}
.bv--thumbs-up .bv__pupil{animation:none}
.bv--thumbs-up .bv__head{animation:bv-tilt 1.4s ease-in-out infinite}
@keyframes bv-thumb{0%%,100%%{transform:rotate(%(thr)sdeg)}50%%{transform:translateY(-12px) rotate(%(thr)sdeg)}}
@keyframes bv-wink{0%%,40%%,60%%,100%%{transform:scaleY(1)}45%%,55%%{transform:scaleY(.1)}}

/* think */
'''+pose('.bv--think','hip','chin')+'''.bv--think .bv__head{animation:bv-think 3s ease-in-out infinite}
.bv--think .bv__pupil{animation:none;transform:translate(4px,-6px)}
.bv--think .bv__lid{opacity:0}
.bv--think .bv__curve{transform:scaleY(.15)}
.bv--think .bv__dots{opacity:1}
.bv--think .bv__dots circle{animation:bv-wave3 1.5s ease-in-out infinite}
.bv--think .bv__dots circle:nth-child(2){animation-delay:.25s}
.bv--think .bv__dots circle:nth-child(3){animation-delay:.5s}
@keyframes bv-think{0%%,100%%{transform:rotate(4deg)}50%%{transform:rotate(7deg) translateY(-3px)}}

/* scare */
.bv--scare .bv__all{animation:bv-scare 2s ease-out infinite}
.bv--scare .bv__arm--l{animation:none;transform:rotate(-26deg)}
.bv--scare .bv__arm--r{animation:none;transform:rotate(26deg)}
.bv--scare .bv__eye{animation:none;transform:scale(1.4)}
.bv--scare .bv__pupil{animation:none;transform:scale(.6);transform-box:fill-box;transform-origin:center}
.bv--scare .bv__lid,.bv--scare .bv__smile{opacity:0}
.bv--scare .bv__open{transform:scale(.55,.75)}
.bv--scare .bv__tongue{opacity:0}
.bv--scare .bv__bang{opacity:1;animation:bv-pop 2s ease-out infinite}
@keyframes bv-scare{0%%{transform:none}7%%{transform:translateY(-48px) scale(.96,1.06)}16%%{transform:none}22%%,34%%,46%%,58%%{transform:translateX(-3px)}28%%,40%%,52%%,64%%{transform:translateX(3px)}70%%,100%%{transform:none}}
@keyframes bv-pop{0%%{transform:scale(0)}8%%{transform:scale(1.3)}16%%,70%%{transform:scale(1);opacity:1}100%%{transform:scale(1);opacity:0}}

/* scratch */
'''+pose('.bv--scratch','belly','hang')+'''.bv--scratch .bv__arm--l{animation:bv-scratch .28s ease-in-out infinite alternate}
.bv--scratch .bv__head{animation:bv-tilt 2.4s ease-in-out infinite}
.bv--scratch .bv__blep{transform:scaleY(1)}
.bv--scratch .bv__lid{transform:translateY(5px)}
@keyframes bv-scratch{from{transform:rotate(%(bel)sdeg)}to{transform:rotate(calc(%(bel)sdeg + 7deg))}}

/* yawn and stretch */
.bv--yawn .bv__head{animation:bv-yawnhead 4s ease-in-out infinite}
.bv--yawn .bv__yawn{animation:bv-yawn 4s ease-in-out infinite}
.bv--yawn .bv__smile{animation:bv-yawnsmile 4s ease-in-out infinite}
.bv--yawn .bv__eye{animation:bv-yawneye 4s ease-in-out infinite}
.bv--yawn .bv__lid{opacity:0}
.bv--yawn .bv__arm--l{animation:bv-stretchl 4s ease-in-out infinite}
.bv--yawn .bv__arm--r{animation:bv-stretchr 4s ease-in-out infinite}
.bv--yawn .bv__body{animation:bv-stretchbody 4s ease-in-out infinite}
.bv--yawn .bv__tongue{animation:none}
@keyframes bv-yawnhead{0%%,20%%,80%%,100%%{transform:none}40%%,60%%{transform:translateY(-10px) rotate(-5deg) scale(1.04)}}
@keyframes bv-yawn{0%%,22%%,78%%,100%%{transform:scaleY(0)}40%%,60%%{transform:scaleY(1.5)}}
@keyframes bv-yawnsmile{0%%,22%%,78%%,100%%{opacity:1}30%%,70%%{opacity:0}}
@keyframes bv-yawneye{0%%,25%%,75%%,100%%{transform:scaleY(1)}38%%,62%%{transform:scaleY(.1)}}
@keyframes bv-stretchl{0%%,20%%,80%%,100%%{transform:rotate(0)}40%%,60%%{transform:rotate(-20deg) translateY(-8px)}}
@keyframes bv-stretchr{0%%,20%%,80%%,100%%{transform:rotate(0)}40%%,60%%{transform:rotate(20deg) translateY(-8px)}}
@keyframes bv-stretchbody{0%%,20%%,80%%,100%%{transform:scale(1)}40%%,60%%{transform:scale(.98,1.04)}}

/* doze off and startle awake */
'''+pose('.bv--doze','hang','hang')+'''.bv--doze .bv__head{animation:bv-doze 5s ease-in infinite}
.bv--doze .bv__eye{animation:bv-dozeeye 5s ease-in infinite}
.bv--doze .bv__pupil{animation:none}
@keyframes bv-doze{0%%{transform:none}58%%{transform:translateY(24px) rotate(9deg)}64%%{transform:translateY(-10px) rotate(-3deg)}74%%,100%%{transform:none}}
@keyframes bv-dozeeye{0%%{transform:scaleY(1)}30%%{transform:scaleY(.5)}55%%,60%%{transform:scaleY(.08)}64%%,70%%{transform:scaleY(1.35)}80%%,100%%{transform:scaleY(1)}}

/* eat */
'''+pose('.bv--eat','hang','mouth')+'''.bv--eat .bv__prop--roll{opacity:1}
.bv--eat .bv__arm--r{animation:bv-bite 1.6s ease-in-out infinite}
.bv--eat .bv__curve{animation:bv-chew .22s ease-in-out infinite alternate}
.bv--eat .bv__head{animation:bv-chewhead .44s ease-in-out infinite}
.bv--eat .bv__lid{opacity:0}
.bv--eat .bv__crumbs{opacity:1}
.bv--eat .bv__crumbs circle{animation:bv-crumb 1.6s ease-in infinite}
.bv--eat .bv__crumbs circle:nth-child(2){animation-delay:.5s}
.bv--eat .bv__crumbs circle:nth-child(3){animation-delay:.9s}
@keyframes bv-bite{0%%,60%%,100%%{transform:translateY(16px) rotate(%(mth)sdeg)}75%%,85%%{transform:translateY(-8px) rotate(%(mth)sdeg)}}
@keyframes bv-chew{from{transform:scaleY(1)}to{transform:scaleY(.2)}}
@keyframes bv-chewhead{0%%,100%%{transform:translateY(0)}50%%{transform:translateY(3px)}}
@keyframes bv-crumb{0%%{transform:translate(0,0);opacity:0}15%%{opacity:1}100%%{transform:translate(8px,110px);opacity:0}}

/* dismiss */
'''+pose('.bv--dismiss','hang',None)+'''.bv--dismiss .bv__arm--r{animation:none;transform:rotate(24deg)}
.bv--dismiss .bv__fore--r{animation:bv-flick 1.5s ease-in-out infinite}
.bv--dismiss .bv__head{animation:none;transform:translateX(-8px) rotate(-7deg)}
.bv--dismiss .bv__pupil{animation:none;transform:translateX(-6px)}
.bv--dismiss .bv__lid{transform:translateY(5px)}
.bv--dismiss .bv__curve{transform:scaleY(-.35)}
@keyframes bv-flick{0%%,55%%,100%%{transform:rotate(0)}18%%,40%%{transform:rotate(68deg)}29%%{transform:rotate(40deg)}}

/* shush */
'''+pose('.bv--shush','hang','lip')+'''.bv--shush .bv__pupil{animation:bv-look 2.4s ease-in-out infinite}
.bv--shush .bv__eye{animation:none}
.bv--shush .bv__lid{opacity:0}
.bv--shush .bv__curve{transform:scaleY(.1)}
.bv--shush .bv__shush{opacity:1;animation:bv-shushpulse 1.6s ease-in-out infinite}
.bv--shush .bv__head{animation:bv-think 3s ease-in-out infinite}
@keyframes bv-shushpulse{0%%,100%%{transform:scale(1) rotate(-6deg);opacity:.5}50%%{transform:scale(1.12) rotate(-6deg);opacity:1}}

/* drunk with a beer */
'''+pose('.bv--beer','hang',None)+'''.bv--beer .bv__prop--beer{opacity:1}
.bv--beer .bv__all{animation:bv-drunk 3.4s ease-in-out infinite}
.bv--beer .bv__head{animation:bv-drunkhead 3.4s ease-in-out infinite}
.bv--beer .bv__arm--r{animation:bv-cheers 3.4s ease-in-out infinite}
.bv--beer .bv__fore--r{animation:bv-cheersfore 3.4s ease-in-out infinite}
.bv--beer .bv__arm--l{animation:bv-drunkarm 3.4s ease-in-out infinite}
.bv--beer .bv__pupil{animation:none}
.bv--beer .bv__eye--l .bv__pupil{transform:translate(5px,3px)}
.bv--beer .bv__eye--r .bv__pupil{transform:translate(-5px,2px)}
.bv--beer .bv__eye{animation:bv-drunkblink 3.4s ease-in-out infinite}
.bv--beer .bv__lid{transform:translateY(6px)}
.bv--beer .bv__curve{transform:scaleY(1.3) rotate(-7deg)}
.bv--beer .bv__blep{transform:scaleY(1) translateX(8px)}
.bv--beer .bv__hick{animation:bv-hick 3.4s ease-out infinite}
.bv--beer .bv__bubbles{opacity:1}
.bv--beer .bv__bubbles circle{animation:bv-bubble 2.6s ease-in infinite}
.bv--beer .bv__bubbles circle:nth-child(2){animation-delay:.8s}
.bv--beer .bv__bubbles circle:nth-child(3){animation-delay:1.6s}
.bv--beer .bv__shadow{animation:bv-drunkshadow 3.4s ease-in-out infinite}
@keyframes bv-drunk{0%%,100%%{transform:translateX(-16px) rotate(-7deg)}50%%{transform:translateX(16px) rotate(7deg)}70%%{transform:translateX(6px) rotate(3deg)}73%%{transform:translate(4px,-12px) rotate(2deg)}77%%{transform:translateX(0) rotate(0)}}
@keyframes bv-drunkhead{0%%,100%%{transform:rotate(8deg) translateY(4px)}50%%{transform:rotate(-9deg) translateY(6px)}73%%{transform:rotate(-2deg) translateY(-8px)}}
@keyframes bv-cheers{0%%,100%%{transform:rotate(12deg)}50%%{transform:rotate(-12deg)}}
@keyframes bv-cheersfore{0%%,100%%{transform:rotate(18deg)}50%%{transform:rotate(-10deg)}}
@keyframes bv-drunkarm{0%%,100%%{transform:rotate(%(hgl)sdeg)}50%%{transform:rotate(calc(%(hgl)sdeg + 14deg))}}
@keyframes bv-drunkblink{0%%,40%%,56%%,100%%{transform:scaleY(1)}46%%,50%%{transform:scaleY(.1)}}
@keyframes bv-hick{0%%,69%%{opacity:0;transform:scale(.4) rotate(-10deg)}74%%{opacity:1;transform:scale(1.15) rotate(-10deg)}88%%{opacity:1;transform:scale(1) rotate(-10deg) translateY(-8px)}100%%{opacity:0;transform:scale(1) rotate(-10deg) translateY(-22px)}}
@keyframes bv-bubble{0%%{transform:translateY(0);opacity:0}20%%{opacity:1}100%%{transform:translateY(-90px);opacity:0}}
@keyframes bv-drunkshadow{0%%,100%%{transform:translateX(-10px)}50%%{transform:translateX(10px)}}

/* gaze follows the pointer (needs --lx and --ly between -1 and 1) */
.bv--follow .bv__pupil{animation:none;transition:transform .12s;transform:translate(calc(var(--lx,0) * 8px),calc(var(--ly,0) * 6px))}
.bv--follow .bv__head{animation:none;transition:transform .25s;transform:translate(calc(var(--lx,0) * 8px),calc(var(--ly,0) * 5px)) rotate(calc(var(--lx,0) * 5deg))}
.bv--follow .bv__lid{opacity:0}

/* tap and type (the class alternates a/b so the animation restarts) */
.bv__react{transform-origin:260px 824px}
.bv--flinch-a .bv__react,.bv--flinch-b .bv__react{animation:bv-flinch-a .4s ease-out}
.bv--flinch-b .bv__react{animation-name:bv-flinch-b}
.bv--flinch-a .bv__wide,.bv--flinch-b .bv__wide{animation:bv-flincheye-a .4s ease-out}
.bv--flinch-b .bv__wide{animation-name:bv-flincheye-b}
@keyframes bv-flinch-a{0%%{transform:none}30%%{transform:translateY(-14px) scale(.97,1.04)}100%%{transform:none}}
@keyframes bv-flinch-b{0%%{transform:none}30%%{transform:translateY(-14px) scale(.97,1.04)}100%%{transform:none}}
@keyframes bv-flincheye-a{0%%,100%%{transform:scale(1)}30%%{transform:scale(1.35)}}
@keyframes bv-flincheye-b{0%%,100%%{transform:scale(1)}30%%{transform:scale(1.35)}}
.bv__earin{transform-box:fill-box;transform-origin:50%% 90%%}
.bv__nod{transform-origin:260px 296px}
.bv--type-a .bv__ear--l .bv__earin,.bv--type-b .bv__ear--r .bv__earin{animation:bv-type-a .3s ease-out}
.bv--type-b .bv__ear--l .bv__earin,.bv--type-a .bv__ear--r .bv__earin{animation:bv-type-b .3s ease-out}
.bv--type-a .bv__nod{animation:bv-typehead-a .3s ease-out}
.bv--type-b .bv__nod{animation:bv-typehead-b .3s ease-out}
.bv__ear--l{transform-origin:176px 126px}
@keyframes bv-type-a{0%%,100%%{transform:rotate(0)}40%%{transform:rotate(-12deg)}}
@keyframes bv-type-b{0%%,100%%{transform:rotate(0)}40%%{transform:rotate(12deg)}}
@keyframes bv-typehead-a{0%%,100%%{transform:none}40%%{transform:translateY(5px)}}
@keyframes bv-typehead-b{0%%,100%%{transform:none}40%%{transform:translateY(5px)}}

/* relaxed: calm with arms down */
'''+pose('.bv--relaxed','relax','relax')+'''.bv--relaxed .bv__all{animation:bv-shift 8s ease-in-out infinite}
.bv--relaxed .bv__arm--l{animation:bv-dangle-l 4.6s ease-in-out infinite}
.bv--relaxed .bv__arm--r{animation:bv-dangle-r 4.6s ease-in-out infinite}
.bv--relaxed .bv__lid{opacity:0}
.bv--relaxed .bv__curve{transform:scaleY(1.2)}
@keyframes bv-shift{0%%,100%%{transform:translateX(-5px) rotate(-1deg)}50%%{transform:translateX(5px) rotate(1deg)}}
@keyframes bv-dangle-l{0%%,100%%{transform:rotate(%(rlx)sdeg)}50%%{transform:rotate(calc(%(rlx)sdeg + 4deg))}}
@keyframes bv-dangle-r{0%%,100%%{transform:rotate(calc(%(rlx)sdeg * -1))}50%%{transform:rotate(calc(%(rlx)sdeg * -1 - 4deg))}}

/* old-Berlin gangster */
.bv{--bv-vest:#4a5560;--bv-cap:#8b6f4e;--bv-cap2:#69523a}
.bv--dark{--bv-vest:#2c353e}
.bv__gangster{opacity:0}
.bv--gangster .bv__gangster{opacity:1}
'''+pose('.bv--gangster','hip','thumb')+'''.bv--gangster .bv__arm--r{animation:bv-toss 1.1s cubic-bezier(.3,0,.7,1) infinite alternate}
.bv--gangster .bv__coin{transform-box:fill-box;transform-origin:center;animation:bv-coin 1.1s cubic-bezier(.2,.6,.4,1) infinite alternate}
.bv--gangster .bv__eye--l{animation:none;transform:scaleY(.5)}
.bv--gangster .bv__pupil{animation:bv-glance 6s ease-in-out infinite}
.bv--gangster .bv__curve{transform:scaleY(.6) rotate(9deg)}
.bv--gangster .bv__head{animation:bv-think 4s ease-in-out infinite}
.bv--gangster .bv__smoke{animation:bv-smoke 2.6s ease-in-out infinite}
@keyframes bv-toss{from{transform:translateY(6px) rotate(%(thr)sdeg)}to{transform:translateY(-4px) rotate(%(thr)sdeg)}}
@keyframes bv-coin{from{transform:translateX(0) scaleY(1)}to{transform:translateX(-130px) scaleY(-1)}}
@keyframes bv-smoke{0%%{transform:translateY(8px);opacity:0}30%%{opacity:.75}100%%{transform:translateY(-22px);opacity:0}}


/* --- legs with knees --- */
.bv__leg--l{transform-origin:178px 600px}.bv__leg--r{transform-origin:342px 600px}
.bv__shin--l{transform-origin:152px 708px}.bv__shin--r{transform-origin:368px 708px}
.bv__foot--l{transform-origin:158px 784px}.bv__foot--r{transform-origin:362px 784px}
.bv__leg,.bv__shin,.bv__foot,.bv__upper{transition:transform .3s cubic-bezier(.3,1.2,.5,1)}

/* --- hand shapes --- */
.bv__knuckles{opacity:0}
.bv--shush .bv__fore--r .bv__claws{opacity:0}
.bv--shush .bv__fore--r .bv__knuckles{opacity:1}
.bv--think .bv__fore--r .bv__claws,.bv--thumbs-up .bv__fore--r .bv__claws,.bv--eat .bv__fore--r .bv__claws{opacity:0}
.bv--think .bv__fore--r .bv__knuckles,.bv--thumbs-up .bv__fore--r .bv__knuckles,.bv--eat .bv__fore--r .bv__knuckles{opacity:1}
.bv--relaxed .bv__claws,.bv--nod .bv__claws,.bv--shake .bv__claws,.bv--doze .bv__claws,.bv--nap .bv__claws{opacity:0}
.bv--relaxed .bv__knuckles,.bv--nod .bv__knuckles,.bv--shake .bv__knuckles,.bv--doze .bv__knuckles,.bv--nap .bv__knuckles{opacity:1}
.bv--look .bv__fore--l .bv__claws{opacity:0}.bv--look .bv__fore--l .bv__knuckles{opacity:1}
.bv--listen .bv__fore--l .bv__claws{opacity:0}.bv--listen .bv__fore--l .bv__knuckles{opacity:1}

/* dance: knees alternate */
.bv--dance .bv__leg--l{animation:bv-kneeL 1s ease-in-out infinite}
.bv--dance .bv__shin--l{animation:bv-shinL 1s ease-in-out infinite}
.bv--dance .bv__foot--l{animation:bv-footL 1s ease-in-out infinite}
.bv--dance .bv__leg--r{animation:bv-kneeR 1s ease-in-out infinite}
.bv--dance .bv__shin--r{animation:bv-shinR 1s ease-in-out infinite}
.bv--dance .bv__foot--r{animation:bv-footR 1s ease-in-out infinite}
.bv--dance .bv__upper{animation:bv-bobup 1s ease-in-out infinite}
@keyframes bv-kneeL{0%%,50%%,100%%{transform:translateY(%(d12)spx) rotate(%(t12)sdeg)}25%%{transform:translateY(-46px) rotate(24deg)}75%%{transform:none}}
@keyframes bv-shinL{0%%,50%%,100%%{transform:rotate(%(s12)sdeg)}25%%{transform:rotate(-58deg)}75%%{transform:none}}
@keyframes bv-footL{0%%,50%%,100%%{transform:rotate(%(f12)sdeg)}25%%{transform:rotate(34deg)}75%%{transform:none}}
@keyframes bv-kneeR{0%%,50%%,100%%{transform:translateY(%(d12)spx) rotate(%(nt12)sdeg)}75%%{transform:translateY(-46px) rotate(-24deg)}25%%{transform:none}}
@keyframes bv-shinR{0%%,50%%,100%%{transform:rotate(%(ns12)sdeg)}75%%{transform:rotate(58deg)}25%%{transform:none}}
@keyframes bv-footR{0%%,50%%,100%%{transform:rotate(%(nf12)sdeg)}75%%{transform:rotate(-34deg)}25%%{transform:none}}
@keyframes bv-bobup{0%%,50%%,100%%{transform:translateY(12px)}25%%,75%%{transform:translateY(0)}}

/* cheer: up from the crouch, legs tucked */
.bv--cheer .bv__upper{animation:bv-jupper .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__leg--l{animation:bv-jlegL .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__shin--l{animation:bv-jshinL .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__foot--l{animation:bv-jfootL .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__leg--r{animation:bv-jlegR .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__shin--r{animation:bv-jshinR .6s cubic-bezier(.3,0,.4,1) infinite alternate}
.bv--cheer .bv__foot--r{animation:bv-jfootR .6s cubic-bezier(.3,0,.4,1) infinite alternate}
@keyframes bv-jupper{from{transform:translateY(28px)}to{transform:translateY(0)}}
@keyframes bv-jlegL{from{transform:translateY(28px) rotate(%(t28)sdeg)}to{transform:translateY(-10px) rotate(16deg)}}
@keyframes bv-jshinL{from{transform:rotate(%(s28)sdeg)}to{transform:rotate(-34deg)}}
@keyframes bv-jfootL{from{transform:rotate(%(f28)sdeg)}to{transform:rotate(22deg)}}
@keyframes bv-jlegR{from{transform:translateY(28px) rotate(%(nt28)sdeg)}to{transform:translateY(-10px) rotate(-16deg)}}
@keyframes bv-jshinR{from{transform:rotate(%(ns28)sdeg)}to{transform:rotate(34deg)}}
@keyframes bv-jfootR{from{transform:rotate(%(nf28)sdeg)}to{transform:rotate(-22deg)}}

/* enter: landing into the knees */
.bv--enter .bv__upper{animation:bv-landup .9s ease-out both}
.bv--enter .bv__leg--l{animation:bv-landL .9s ease-out both}.bv--enter .bv__shin--l{animation:bv-landSL .9s ease-out both}.bv--enter .bv__foot--l{animation:bv-landFL .9s ease-out both}
.bv--enter .bv__leg--r{animation:bv-landR .9s ease-out both}.bv--enter .bv__shin--r{animation:bv-landSR .9s ease-out both}.bv--enter .bv__foot--r{animation:bv-landFR .9s ease-out both}
@keyframes bv-landup{0%%,76%%,100%%{transform:none}86%%{transform:translateY(24px)}}
@keyframes bv-landL{0%%,76%%,100%%{transform:none}86%%{transform:translateY(24px) rotate(%(t24)sdeg)}}
@keyframes bv-landSL{0%%,76%%,100%%{transform:none}86%%{transform:rotate(%(s24)sdeg)}}
@keyframes bv-landFL{0%%,76%%,100%%{transform:none}86%%{transform:rotate(%(f24)sdeg)}}
@keyframes bv-landR{0%%,76%%,100%%{transform:none}86%%{transform:translateY(24px) rotate(%(nt24)sdeg)}}
@keyframes bv-landSR{0%%,76%%,100%%{transform:none}86%%{transform:rotate(%(ns24)sdeg)}}
@keyframes bv-landFR{0%%,76%%,100%%{transform:none}86%%{transform:rotate(%(nf24)sdeg)}}

/* exit: run-up from the knees */
.bv--exit .bv__upper{animation:bv-exitup 2s ease-in both}
.bv--exit .bv__leg--l{animation:bv-exitL 2s ease-in both}.bv--exit .bv__shin--l{animation:bv-exitSL 2s ease-in both}.bv--exit .bv__foot--l{animation:bv-exitFL 2s ease-in both}
.bv--exit .bv__leg--r{animation:bv-exitR 2s ease-in both}.bv--exit .bv__shin--r{animation:bv-exitSR 2s ease-in both}.bv--exit .bv__foot--r{animation:bv-exitFR 2s ease-in both}
@keyframes bv-exitup{0%%,55%%,76%%,100%%{transform:none}68%%{transform:translateY(30px)}}
@keyframes bv-exitL{0%%,55%%,76%%,100%%{transform:none}68%%{transform:translateY(30px) rotate(%(t30)sdeg)}}
@keyframes bv-exitSL{0%%,55%%,76%%,100%%{transform:none}68%%{transform:rotate(%(s30)sdeg)}}
@keyframes bv-exitFL{0%%,55%%,76%%,100%%{transform:none}68%%{transform:rotate(%(f30)sdeg)}}
@keyframes bv-exitR{0%%,55%%,76%%,100%%{transform:none}68%%{transform:translateY(30px) rotate(%(nt30)sdeg)}}
@keyframes bv-exitSR{0%%,55%%,76%%,100%%{transform:none}68%%{transform:rotate(%(ns30)sdeg)}}
@keyframes bv-exitFR{0%%,55%%,76%%,100%%{transform:none}68%%{transform:rotate(%(nf30)sdeg)}}

/* relaxed and gangster: one knee loose */
.bv--relaxed .bv__leg--l,.bv--gangster .bv__leg--r{transform:translateY(10px) rotate(-7deg)}
.bv--relaxed .bv__shin--l{transform:rotate(14deg)}.bv--gangster .bv__shin--r{transform:rotate(-14deg)}
.bv--relaxed .bv__foot--l{transform:rotate(-7deg)}.bv--gangster .bv__foot--r{transform:rotate(7deg)}
.bv--relaxed .bv__upper{transform:translateY(5px) rotate(-1.5deg)}.bv--gangster .bv__upper{transform:translateY(5px) rotate(1.5deg)}

/* beer: soft knees */
.bv--beer .bv__leg--l{animation:bv-wobL 1.7s ease-in-out infinite}.bv--beer .bv__shin--l{animation:bv-wobSL 1.7s ease-in-out infinite}
.bv--beer .bv__leg--r{animation:bv-wobR 1.7s ease-in-out infinite}.bv--beer .bv__shin--r{animation:bv-wobSR 1.7s ease-in-out infinite}
.bv--beer .bv__upper{animation:bv-wobup 1.7s ease-in-out infinite}
@keyframes bv-wobL{0%%,100%%{transform:translateY(16px) rotate(%(t16)sdeg)}50%%{transform:translateY(4px) rotate(-4deg)}}
@keyframes bv-wobSL{0%%,100%%{transform:rotate(%(s16)sdeg)}50%%{transform:rotate(6deg)}}
@keyframes bv-wobR{0%%,100%%{transform:translateY(4px) rotate(4deg)}50%%{transform:translateY(16px) rotate(%(nt16)sdeg)}}
@keyframes bv-wobSR{0%%,100%%{transform:rotate(-6deg)}50%%{transform:rotate(%(ns16)sdeg)}}
@keyframes bv-wobup{0%%,100%%,50%%{transform:translateY(12px)}}

/* head + peek */
.bv--peek .bv__head{animation:bv-peek 6s ease-in-out infinite}
.bv--peek .bv__pupil{animation:bv-look 3s ease-in-out infinite}
.bv--peek .bv__lid{opacity:0}
@keyframes bv-peek{0%%,8%%{transform:translateY(150px)}20%%,80%%{transform:translateY(-18px)}92%%,100%%{transform:translateY(150px)}}
'''
LEGV={}
for _d in (12,16,24,28,30):
    _t,_s,_f=squat(_d);LEGV.update({'d%d'%_d:_d,'t%d'%_d:_t,'s%d'%_d:_s,'f%d'%_d:_f,'nt%d'%_d:-_t,'ns%d'%_d:-_s,'nf%d'%_d:-_f})
css=css%dict(sx=S[0],sy=S[1],sxr=m(S[0]),ex=E[0],ey=E[1],exr=m(E[0]),shl=IK['shrug'][0],shr=-IK['shrug'][0],fpa=-IK['face'][0],ptr=-IK['point'][0],thr=-IK['thumb'][0],bel=IK['belly'][0],chr=-IK['chin'][0],mth=-IK['mouth'][0],hgl=IK['hang'][0],rlx=IK['relax'][0],**LEGV)
# ---- calm variant: finite loops (~6 s), endless again on hover
calm=[]
for sel,body_ in re.findall(r'([^{}\n]+)\{([^{}]*animation:[^{}]*infinite[^{}]*)\}',css):
    sel=sel.strip()
    if sel.startswith('@') or 'bv__eye' in sel: continue
    dur=float(re.search(r'animation:\S+ ([\d.]+)s',body_).group(1));n=max(2,round(6/dur));n+= n%2 if 'alternate' in body_ else 0
    # the root compound (".bv--mood") gets the calm class and, for hover, the pseudo-class after it
    def _calm(x,hover):
        root,sp,rest=x.partition(' ')
        if root.startswith('.bv--'): return '.bv--calm'+root+(':hover' if hover else '')+sp+rest
        return '.bv--calm'+(':hover ' if hover else ' ')+x
    cs=', '.join(_calm(y.strip(),False) for y in sel.split(','))
    hs=', '.join(_calm(y.strip(),True) for y in sel.split(','))
    calm.append('%s{animation-iteration-count:%d}\n%s{animation-iteration-count:infinite}'%(cs,n,hs))
css+='\n/* calm: finite loops, endless again on hover (duration: see the calm prop in BerlinerBaer.vue) */\n'+'\n'.join(calm)+'\n@media (prefers-reduced-motion:reduce){.bv *{animation:none!important;transition:none!important}.bv--peek .bv__head{transform:translateY(-18px)}}\n'
css+='''
/* --- eyebrows: only for big appearances (class bv--brows, from 200px) --- */
.bv{--bv-brow:#6f7d8a}.bv--dark{--bv-brow:#5c6975}
.bv__brows{display:none}
.bv--brows .bv__brows{display:inline}
.bv--brows .bv__lid,.bv--brows .bv__grr{opacity:0}
.bv__brow{transform-box:fill-box;transform-origin:center;transition:transform .3s ease-out}
.bv--brows.bv--wave .bv__brow,.bv--brows.bv--cheer .bv__brow,.bv--brows.bv--dance .bv__brow,.bv--brows.bv--thumbs-up .bv__brow,.bv--brows.bv--enter .bv__brow,.bv--brows.bv--eat .bv__brow{transform:translateY(-9px)}
.bv--brows.bv--blank .bv__brow,.bv--brows.bv--yawn .bv__brow{transform:translateY(-14px)}
.bv--brows.bv--scare .bv__brow{transform:translateY(-20px)}
.bv--brows.bv--roar .bv__brow--l,.bv--brows.bv--shake .bv__brow--l,.bv--brows.bv--dismiss .bv__brow--l{transform:translate(5px,8px) rotate(26deg)}
.bv--brows.bv--roar .bv__brow--r,.bv--brows.bv--shake .bv__brow--r,.bv--brows.bv--dismiss .bv__brow--r{transform:translate(-5px,8px) rotate(-26deg)}
.bv--brows.bv--think .bv__brow--l,.bv--brows.bv--listen .bv__brow--l,.bv--brows.bv--gangster .bv__brow--r{transform:translateY(-14px) rotate(-6deg)}
.bv--brows.bv--think .bv__brow--r,.bv--brows.bv--listen .bv__brow--r,.bv--brows.bv--gangster .bv__brow--l{transform:translateY(5px)}
.bv--brows.bv--facepalm .bv__brow--l,.bv--brows.bv--look .bv__brow--l{transform:translate(4px,-10px) rotate(-24deg)}
.bv--brows.bv--facepalm .bv__brow--r,.bv--brows.bv--look .bv__brow--r{transform:translate(-4px,-10px) rotate(24deg)}
.bv--brows.bv--beer .bv__brow--l{transform:translateY(-10px) rotate(-10deg)}
.bv--brows.bv--beer .bv__brow--r{transform:translateY(4px) rotate(-6deg)}
.bv--brows.bv--nap .bv__brow,.bv--brows.bv--doze .bv__brow{transform:translateY(5px)}
'''
css+='''
/* --- accessibility: shaking and scare only as a short trigger, never an endless loop --- */
.bv.bv--roar .bv__open,.bv.bv--roar .bv__tongue,.bv.bv--roar .bv__head,.bv.bv--roar .bv__arm,.bv.bv--roar .bv__shout{animation-iteration-count:8!important}
.bv.bv--scare .bv__all,.bv.bv--scare .bv__bang{animation-iteration-count:1!important}
.bv.bv--scare .bv__bang{animation-fill-mode:forwards!important}
/* --- small sizes: fine details off so nothing flickers --- */
.bv--small .bv__detail,.bv--small .bv__smoke,.bv--small .bv__coin,.bv--small .bv__crumbs,.bv--small .bv__bubbles,.bv--small .bv__hick,.bv--small .bv__waves,.bv--small .bv__dots{display:none}
/* --- dark mode without the disc: the outline is mandatory (fur 1.5:1, outline 4.6:1 against the dark surfaces) --- */
[data-theme="dark"] .bv:not(.bv--light){--bv-ink:#14181c;--bv-ink2:#252d35;--bv-nose:#000;--bv-disc:#566676;--bv-shadow:rgb(0 0 0 / 35%);--bv-brow:#5c6975;--bv-edge:#a9b8c6;--bv-vest:#2c353e}
[data-theme="dark"] .bv.bv--plain:not(.bv--light) .bv__all{filter:drop-shadow(1.2px 0 0 var(--bv-edge)) drop-shadow(-1.2px 0 0 var(--bv-edge)) drop-shadow(0 1.2px 0 var(--bv-edge)) drop-shadow(0 -1.2px 0 var(--bv-edge))}
'''
open('v2.css','w').write(css)
open('v2.svg','w').write(full('ID'));open('v2_head.svg','w').write(head_only());open('v2_peek.svg','w').write(peek('ID'))
print(IK,len(calm))
