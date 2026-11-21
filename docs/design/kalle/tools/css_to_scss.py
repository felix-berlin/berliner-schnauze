"""Turns the flat Kalle CSS from kalle_svg.py (v2.css) into the design-system SCSS of the website.

Output (see website/CLAUDE.md and .claude/rules/website-styles.md):
  - components/_berliner-baer.scss: exactly one `@include mx.component("berliner-baer")` block
  - utilities/_berliner-baer-keyframes.scss: `@layer utilities { @keyframes ... }`, loaded by the Vue component only

What changes on the way (the figure itself does not):
  - root classes (.bv, .bv--mood) -> :scope + [data-variant~=...] / [data-state~=...]
  - part classes (.bv__arm--l) -> plain lowercase-hyphen classes (.arm-l)
  - colours -> semantic tokens (--color-mascot-*) through private --_ properties; dark = color-scheme
  - every animation and transition sits in @include butler-mx.feature("motion"), so the
    `!important` reduced-motion reset is gone; the static reduced-motion pose is feature("no-motion")
  - raw durations -> private --_t-* properties (choreography lengths, no duration token fits)
  - the remaining `!important` caps (Schnauze 8 loops, Schreck 1 loop) become ordinary rules that
    come later than the calm rules they must beat
"""
import re

BLOCK = 'berliner-baer'
PALETTE = ['ink', 'ink2', 'nose', 'red', 'white', 'mouth', 'disc', 'shadow', 'edge', 'vest', 'cap', 'cap2', 'brow']
VARIANTS = {'plain', 'brauen', 'klein', 'kopf', 'lugen', 'calm', 'dark', 'light'}  # configuration; everything else (mood, restart toggles) is state
MOTION_PROP = re.compile(r'^(animation|transition)(-[a-z-]+)?$')
TIME = re.compile(r'(?<![\w.-])(\d*\.?\d+)(ms|s)(?![\w-])')


# ---------------------------------------------------------------- parsing
def _block_end(src, i):
    depth = 0
    for j in range(i, len(src)):
        if src[j] == '{':
            depth += 1
        elif src[j] == '}':
            depth -= 1
            if depth == 0:
                return j
    raise ValueError('unbalanced braces')


def parse(css):
    items, i = [], 0
    while i < len(css):
        if css[i].isspace():
            i += 1
        elif css.startswith('/*', i):
            j = css.index('*/', i)
            items.append(('comment', css[i + 2:j].strip()))
            i = j + 2
        elif css[i] == '@':
            o = css.index('{', i)
            c = _block_end(css, o)
            prelude, inner = css[i:o].strip(), css[o + 1:c]
            if prelude.startswith('@keyframes'):
                items.append(('keyframes', prelude.split()[1], inner))
            elif prelude.startswith('@media'):
                items.append(('media', prelude, parse(inner)))
            else:
                raise ValueError('unexpected at-rule ' + prelude)
            i = c + 1
        else:
            o = css.index('{', i)
            c = css.index('}', o)
            decls = []
            for d in css[o + 1:c].split(';'):
                if d.strip():
                    prop, _, val = d.partition(':')
                    val = val.strip()
                    imp = val.endswith('!important')
                    decls.append((prop.strip(), val[:-10].strip() if imp else val, imp))
            items.append(('rule', [s.strip() for s in css[i:o].split(',')], decls))
            i = c + 1
    return items


# ---------------------------------------------------------------- selectors
def _compounds(sel):
    out, cur, depth = [], '', 0
    for ch in sel:
        depth += (ch == '(') - (ch == ')')
        if ch == ' ' and depth == 0:
            if cur:
                out.append(cur)
            cur = ''
        else:
            cur += ch
    if cur:
        out.append(cur)
    return out


def _root(comp):
    """`.bv.bv--calm.bv--winken:hover` -> `:scope[data-variant~="calm"][data-variant~="winken"]:hover`"""
    rest, out = comp, ':scope'
    while rest:
        m = re.match(r'\.bv(?:--([a-z0-9-]+))?', rest)
        if m:
            if m.group(1):
                attr = 'data-variant' if m.group(1) in VARIANTS else 'data-state'
                out += '[%s~="%s"]' % (attr, m.group(1))
            rest = rest[m.end():]
            continue
        m = re.match(r':[a-z-]+(?:\([^)]*\))?', rest)
        if m:
            out += m.group(0)
            rest = rest[m.end():]
            continue
        raise ValueError('cannot translate root compound ' + comp)
    return out


def _part(comp):
    """`.bv__arm--l` -> `.arm-l`; element selectors and pseudo-classes pass through."""
    if comp.startswith('.bv__'):
        m = re.match(r'\.bv__([a-z0-9]+(?:--[a-z0-9]+)?)(.*)$', comp)
        if not m or '.bv' in m.group(2):
            raise ValueError('cannot translate part ' + comp)
        return '.' + m.group(1).replace('--', '-') + m.group(2)
    if comp.startswith('.bv'):
        return _root(comp)
    if re.match(r'^[a-z]+(:[a-z-]+(\([^)]*\))?)*$', comp):
        return comp
    raise ValueError('cannot translate compound ' + comp)


def kebab(name):
    return re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', name).lower()


LOGICAL = {'width': 'inline-size', 'height': 'block-size'}


def translate(sel):
    return ' '.join(_part(c) for c in _compounds(sel))


def calm_forms(sel):
    """Calm and calm+hover variant of a translated selector (the two a11y caps need all three forms)."""
    root, sp, rest = sel.partition(' ')
    if not root.startswith(':scope'):
        raise ValueError('no root compound in ' + sel)
    calm = root.replace(':scope', ':scope[data-variant~="calm"]', 1)
    return [calm + sp + rest, calm + ':hover' + sp + rest]


# ---------------------------------------------------------------- declarations
class Ctx:
    def __init__(self):
        self.times = {}  # slug -> literal

    def time(self, m):
        num, unit = m.group(1), m.group(2)
        lit = ('0' + num if num.startswith('.') else num) + unit
        slug = lit.replace('.', '-')
        self.times[slug] = lit
        return 'var(--_t-%s)' % slug

    def value(self, prop, val):
        val = re.sub(r'var\(--bv-([a-z0-9]+)', r'var(--_\1', val)
        val = re.sub(r'var\(--(lx|ly)\b', r'var(--_\1', val)
        if MOTION_PROP.match(prop):
            val = TIME.sub(self.time, val)
            val = re.sub(r'(?<![\w-])bv-([A-Za-z0-9-]+)', lambda m: kebab(BLOCK + '-' + m.group(1)), val)
        return val


def _decls_text(decls, ctx, indent):
    return ''.join('%s%s: %s;\n' % (indent, LOGICAL.get(p, p), ctx.value(p, v)) for p, v, _ in decls)


def _rule(sels, decls, ctx, indent):
    return '%s%s {\n%s%s}\n' % (indent, (',\n' + indent).join(sels), _decls_text(decls, ctx, indent + '  '), indent) + '\n'


# ---------------------------------------------------------------- sections
def _emit_items(items, ctx, out, state):
    """Walks parsed items; static rules go to `out`, animation rules are collected per section."""
    static, motion = [], []

    def flush():
        out.extend(static)
        if motion:
            out.append('  @include butler-mx.feature("motion") {\n' + ''.join(motion).rstrip('\n') + '\n  }\n\n')
        static.clear()
        motion.clear()

    for it in items:
        kind = it[0]
        if kind == 'comment':
            flush()
            if not it[1].startswith('---'):
                static.append('  // %s\n' % it[1])
            else:
                static.append('  // %s\n' % it[1].strip('- ').strip())
        elif kind == 'keyframes':
            name = kebab(re.sub(r'^bv-', BLOCK + '-', it[1]))
            steps = re.findall(r'([^{}]+)\{([^{}]*)\}', it[2])
            body = '\n'.join('    %s {\n%s    }\n' % (sel.strip().replace(',', ', '), ''.join('      %s: %s;\n' % tuple(x.strip() for x in d.partition(':')[::2]) for d in decl.split(';') if d.strip())) for sel, decl in steps)
            state['keyframes'].append('  @keyframes %s {\n%s  }\n' % (name, body))
        elif kind == 'media':
            if 'prefers-reduced-motion' not in it[1]:
                raise ValueError('unexpected media query ' + it[1])
            body = []
            for sub in it[2]:
                if sub[0] != 'rule':
                    raise ValueError('unexpected item in reduced-motion block')
                _, sels, decls = sub
                if sels == ['.bv *']:
                    continue  # replaced by wrapping every animation in feature("motion")
                body.append(_rule([translate(s) for s in sels], decls, ctx, '    '))
            static.append('  @include butler-mx.feature("no-motion") {\n' + ''.join(body).rstrip('\n') + '\n  }\n\n')
        else:
            _, sels, decls = it
            if all(p.startswith('--bv-') for p, _, _ in decls):
                state['vars'].update(p for p, _, _ in decls)
                continue  # colours now come from the mascot tokens
            decls = [d for d in decls if not d[0].startswith('--bv-')]
            if any(p == 'filter' for p, _, _ in decls):
                continue  # the dark outline is written by hand (EDGE below)
            tsel = [translate(s) for s in sels]
            important = any(i for _, _, i in decls)
            mot = [d for d in decls if MOTION_PROP.match(d[0])]
            sta = [d for d in decls if not MOTION_PROP.match(d[0])]
            if sta:
                static.append(_rule(tsel, sta, ctx, '  '))
            if mot:
                sel_out = list(tsel)
                if important:  # the caps must also win against the calm rules (same specificity, later)
                    sel_out += [f for s in tsel for f in calm_forms(s)]
                motion.append(_rule(sel_out, mot, ctx, '    '))
    flush()


EDGE = '''  // With a disc the outline is not needed.
  :scope:not([data-variant~="plain"]) {
    --_edge: transparent;
  }

  // Dark without a disc: the light outline is mandatory (fur 1.5:1, outline 4.6:1 on the dark surfaces).
  // In light the edge colour is transparent, so the filter draws nothing.
  :scope[data-variant~="plain"] .all,
  :scope[data-variant~="kopf"] .head,
  :scope[data-variant~="lugen"] .svg {
    filter: drop-shadow(1.2px 0 0 var(--_edge)) drop-shadow(-1.2px 0 0 var(--_edge))
      drop-shadow(0 1.2px 0 var(--_edge)) drop-shadow(0 -1.2px 0 var(--_edge));
  }

'''


def convert(css, header):
    ctx = Ctx()
    out, state = [], {'keyframes': [], 'vars': set()}
    _emit_items(parse(css), ctx, out, state)
    used = {v[len('--bv-'):] for v in state['vars']}
    if not used <= set(PALETTE):
        raise ValueError('colours without a mascot token: %s' % sorted(used - set(PALETTE)))
    root = '  :scope {\n    display: block;\n\n'
    root += ''.join('    --_%s: var(--color-mascot-%s);\n' % (c, c) for c in PALETTE)
    root += '\n    // Choreography lengths of the moods (SPEC §5, §8): no duration token fits these.\n'
    root += ''.join('    --_t-%s: %s;\n' % (k, v) for k, v in sorted(ctx.times.items()))
    root += '  }\n\n'
    root += '  // thema="hell"/"dunkel": the tokens follow color-scheme, so forcing the scheme is enough.\n'
    root += '  :scope[data-variant~="dark"] {\n    color-scheme: dark;\n  }\n\n'
    root += '  :scope[data-variant~="light"] {\n    color-scheme: light;\n  }\n\n'
    comp = header + '@use "@sass-butler/mixins" as butler-mx;\n@use "@styles/mixins" as mx;\n\n'
    comp += '@include mx.component("%s") {\n%s%s%s}\n' % (BLOCK, root, EDGE, re.sub(r'(feature\("no-motion"\) \{\n(?:.*\n)*?  \})\n\n(  @include)', r'\1\n\2', ''.join(out)).rstrip() + '\n')
    kf = header + '@layer utilities {\n' + ''.join(state['keyframes']) + '}\n'
    return comp, kf
