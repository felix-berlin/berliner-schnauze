# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Locals & nostalgics**: Berliners or expats who grew up with the dialect, browsing for identity/nostalgia.
- **Content sharers**: find a word or fact, share it (word of the day, social).
- **Curious learners**: encounter a dialect word, want quick translation + meaning.

Core job: fast lookup. Search or land on a word page, get the meaning, done — speed and clarity beat dwell time.

## Product Purpose

Berliner Schnauze is a Berlin-dialect translator and lexicon: Payload CMS backend, Astro site rendered on demand, Vue islands for interactivity (search, word pages, BON card game, PWA install/cache). Success = someone finds the word they came for in seconds, trusts the etymology/source shown, and optionally shares or plays.

## Positioning

Four things together, which no other Berlin-dialect dictionary combines:

- **Sourced etymology**: origins backed by real citations (e.g. SDLS), checkable rather than hearsay.
- **It speaks Berlin itself**: the site's own voice is schnodderig and warm, never neutral.
- **Learn and play**: Anki decks, the BON card game and the word of the day take the dialect beyond lookup.
- **Community**: visitors suggest words and comment on entries, adding what the entry is missing.

## Operating Context

- **On the phone, on the go**: someone hears a word and looks it up in seconds, often as the installed PWA, sometimes offline.
- **Deliberate learning**: newcomers and fans learn the dialect with the Anki decks or the game.

## Capabilities and Constraints

- About 6000 words in Payload CMS, each with meaning, examples and sources; topics (Themen) and a magazine.
- Full-text search in the browser, word pages rendered on demand, PWA with offline cache.
- Anki decks (Full, paid via Polar; Lite, free), BON card game, word of the day.
- Anonymous comments with votes, replies and reports; word suggestions. Spam protection without visible captcha where possible.
- No user accounts (yet).

## Brand Personality

**Cheeky / schnodderig** + **warm / heimatlich** — Berlin's trademark blunt wit paired with affection for the dialect and its speakers. Voice is dry, direct, never corporate-neutral. Warmth comes through content and tone, not decorative softness.

## Anti-references

No named references. Working anti-pattern: don't let the Schnauze voice flatten into generic SaaS/dictionary-app neutrality — the tone should stay recognizably Berlin (dry, terse, a little gruff) even in UI copy and empty/error states.

## Evidence on Hand

- The word stock itself: ~6000 entries with sources, the Anki decks, the magazine articles.
- No testimonials, press mentions or usage numbers exist. Future work must not invent any.

## Design Principles

1. **Speed over spectacle** — lookup is the core job; minimize friction between search and meaning.
2. **Schnauze voice, never generic** — cheeky/dry copy tone throughout, including errors and empty states.
3. **Warmth in restraint** — nostalgia lives in content and voice, not ornamental UI.
4. **Reference-grade trust** — etymology and sourcing (SDLS citations, etc.) must read precise and credible even when the surrounding tone is playful.
5. **One dialect, one system** — preserve the existing Berlin-red / dark blue-grey identity consistently across word pages, game, and PWA surfaces.

## Accessibility & Inclusion

WCAG AA: ≥4.5:1 text contrast, full keyboard navigation, `prefers-reduced-motion` alternatives for all animation (already a stated project convention).
