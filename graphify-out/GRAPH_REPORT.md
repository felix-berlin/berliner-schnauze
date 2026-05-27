# Graph Report - berliner-schnauze  (2026-05-27)

## Corpus Check
- 147 files · ~51,717 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 778 nodes · 1032 edges · 93 communities (55 shown, 38 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3056f213`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Orama Search Engine|Orama Search Engine]]
- [[_COMMUNITY_Site Layout & Footer|Site Layout & Footer]]
- [[_COMMUNITY_Word Filter System|Word Filter System]]
- [[_COMMUNITY_Word List Filtering|Word List Filtering]]
- [[_COMMUNITY_Word Display & GQL Types|Word Display & GQL Types]]
- [[_COMMUNITY_Asset & SEO Setup|Asset & SEO Setup]]
- [[_COMMUNITY_Modal & PWA Cache|Modal & PWA Cache]]
- [[_COMMUNITY_Cache Storage Composable|Cache Storage Composable]]
- [[_COMMUNITY_GraphQL Type Definitions|GraphQL Type Definitions]]
- [[_COMMUNITY_Word of the Day|Word of the Day]]
- [[_COMMUNITY_Button States & Sort Controls|Button States & Sort Controls]]
- [[_COMMUNITY_Word Status Components|Word Status Components]]
- [[_COMMUNITY_PWA Cache Management|PWA Cache Management]]
- [[_COMMUNITY_Word Detail Page|Word Detail Page]]
- [[_COMMUNITY_Visual Feedback Components|Visual Feedback Components]]
- [[_COMMUNITY_Word Query Layer|Word Query Layer]]
- [[_COMMUNITY_Search Input Logic|Search Input Logic]]
- [[_COMMUNITY_Search Filter Behaviour|Search Filter Behaviour]]
- [[_COMMUNITY_GraphQL Mutations & Queries|GraphQL Mutations & Queries]]
- [[_COMMUNITY_Audio Playback Controls|Audio Playback Controls]]
- [[_COMMUNITY_Search Modal UI|Search Modal UI]]
- [[_COMMUNITY_App Shell & Theme|App Shell & Theme]]
- [[_COMMUNITY_Word Index Page|Word Index Page]]
- [[_COMMUNITY_Dark Mode Toggle|Dark Mode Toggle]]
- [[_COMMUNITY_Image Gallery|Image Gallery]]
- [[_COMMUNITY_Word Suggestion Form|Word Suggestion Form]]
- [[_COMMUNITY_Cookie & PWA Service|Cookie & PWA Service]]
- [[_COMMUNITY_API Service Layer|API Service Layer]]
- [[_COMMUNITY_GQL Fragment Definitions|GQL Fragment Definitions]]
- [[_COMMUNITY_Form & Auth Components|Form & Auth Components]]
- [[_COMMUNITY_Berlin Heritage Imagery|Berlin Heritage Imagery]]
- [[_COMMUNITY_Virtualized Word List|Virtualized Word List]]
- [[_COMMUNITY_Toast Notification System|Toast Notification System]]
- [[_COMMUNITY_Word Examples & Audio|Word Examples & Audio]]
- [[_COMMUNITY_PWA Install Store|PWA Install Store]]
- [[_COMMUNITY_Helper Utility Tests|Helper Utility Tests]]
- [[_COMMUNITY_Word Utility Tests|Word Utility Tests]]
- [[_COMMUNITY_Toast Container|Toast Container]]
- [[_COMMUNITY_GQL Fragment Masking|GQL Fragment Masking]]
- [[_COMMUNITY_Word Card Concepts|Word Card Concepts]]
- [[_COMMUNITY_Badge & Scroll Components|Badge & Scroll Components]]
- [[_COMMUNITY_Bear Mascot Branding|Bear Mascot Branding]]
- [[_COMMUNITY_Random Word Tests|Random Word Tests]]
- [[_COMMUNITY_Legal Pages|Legal Pages]]
- [[_COMMUNITY_Toast Popover Concepts|Toast Popover Concepts]]
- [[_COMMUNITY_Device Detection|Device Detection]]
- [[_COMMUNITY_Audio Player Components|Audio Player Components]]
- [[_COMMUNITY_Dark Mode Store|Dark Mode Store]]
- [[_COMMUNITY_Search Modal State|Search Modal State]]
- [[_COMMUNITY_AlertBanner Tests|AlertBanner Tests]]
- [[_COMMUNITY_Navigate Back|Navigate Back]]
- [[_COMMUNITY_SingleLoader Tests|SingleLoader Tests]]
- [[_COMMUNITY_Modal Close Button|Modal Close Button]]
- [[_COMMUNITY_Env & Window Types|Env & Window Types]]
- [[_COMMUNITY_ConfettiEffect Tests|ConfettiEffect Tests]]
- [[_COMMUNITY_SocialList Tests|SocialList Tests]]
- [[_COMMUNITY_TurnStile Tests|TurnStile Tests]]
- [[_COMMUNITY_AlertBanner Component|AlertBanner Component]]
- [[_COMMUNITY_AudioPlayer Component|AudioPlayer Component]]
- [[_COMMUNITY_Button State Types|Button State Types]]
- [[_COMMUNITY_CarbonBadge Tests|CarbonBadge Tests]]
- [[_COMMUNITY_ColorModeToggle Tests|ColorModeToggle Tests]]
- [[_COMMUNITY_ConfettiEffect Component|ConfettiEffect Component]]
- [[_COMMUNITY_DropdownPopover Component|DropdownPopover Component]]
- [[_COMMUNITY_FactCard Component|FactCard Component]]
- [[_COMMUNITY_NavigateBack Tests|NavigateBack Tests]]
- [[_COMMUNITY_RandomWordButton Tests|RandomWordButton Tests]]
- [[_COMMUNITY_SingleLoader Component|SingleLoader Component]]
- [[_COMMUNITY_SocialList Component|SocialList Component]]
- [[_COMMUNITY_TurnStile Component|TurnStile Component]]
- [[_COMMUNITY_Cache Storage Tests|Cache Storage Tests]]
- [[_COMMUNITY_Bear Walking Image|Bear Walking Image]]
- [[_COMMUNITY_Test Setup|Test Setup]]
- [[_COMMUNITY_ConfettiEffect Props|ConfettiEffect Props]]
- [[_COMMUNITY_RelatedWords Props|RelatedWords Props]]
- [[_COMMUNITY_SuggestForm Data|SuggestForm Data]]
- [[_COMMUNITY_SuggestForm Errors|SuggestForm Errors]]
- [[_COMMUNITY_TurnStile Props|TurnStile Props]]
- [[_COMMUNITY_BadgeTag Component|BadgeTag Component]]
- [[_COMMUNITY_NavigateBack Component|NavigateBack Component]]
- [[_COMMUNITY_SocialList Component|SocialList Component]]
- [[_COMMUNITY_MainMenuButton Component|MainMenuButton Component]]
- [[_COMMUNITY_WordList Type Utils|WordList Type Utils]]
- [[_COMMUNITY_SendEmail Service|SendEmail Service]]
- [[_COMMUNITY_Supported Browsers Regex|Supported Browsers Regex]]

## God Nodes (most connected - your core abstractions)
1. `@/gql/graphql.ts` - 42 edges
2. `trackEvent()` - 24 edges
3. `@layouts/Layout.astro` - 15 edges
4. `@components/word-search/WordFilter.vue` - 12 edges
5. `WordFilter` - 12 edges
6. `@components/word-search/WordSearchList.vue` - 11 edges
7. `SearchModal` - 11 edges
8. `createToastNotify()` - 10 edges
9. `@components/InstallApp.vue` - 9 edges
10. `Layout.astro: root page layout shell (BaseHead, header, footer, modal, toast)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ThemeInitializationLogic` --semantically_similar_to--> `$wordSearch`  [AMBIGUOUS] [semantically similar]
  src/components/SetColorMode.astro → src/stores/wordList.ts
- `CookieConsent` --semantically_similar_to--> `trackEvent()`  [INFERRED] [semantically similar]
  src/components/CookieConsent.vue → src/utils/analytics.ts
- `fetchAPI()` --semantically_similar_to--> `getWordOfTheDay()`  [INFERRED] [semantically similar]
  src/services/fetchApi.ts → src/stores/wordOfTheDay.ts
- `WordSearchLink` --semantically_similar_to--> `WordOfTheDay`  [INFERRED] [semantically similar]
  src/components/WordSearchLink.vue → src/components/WordOfTheDay.vue
- `env.d.ts: global ambient types (Turnstile, Window._paq, astro refs)` --semantically_similar_to--> `vendor.d.ts: ambient module declarations (hypher, hyphenation.de, de-compromise)`  [INFERRED] [semantically similar]
  src/env.d.ts → src/types/vendor.d.ts

## Hyperedges (group relationships)
- **All Nanostores stores (persistent + atom + map)** — stores_darkmode_isdarkmode, stores_wordlist_wordsearch, stores_wordoftheday_wordoftheday, stores_toastnotify_toastnotify, stores_installapp_installprompt, stores_modal_isopen, stores_modal_props [EXTRACTED 1.00]
- **GraphQL fragments composing BerlinerWord data shape** — services_fragments_berlinerword, services_fragments_wordproperties, services_fragments_posttypeseofragment, services_fragments_mediaitem [EXTRACTED 1.00]
- **Stores and services that call trackEvent for Matomo analytics** — stores_wordlist_resetall, stores_wordlist_setletterfilter, stores_installapp_triggerpwainstall, services_pwa_registersw [EXTRACTED 1.00]
- **All Astro page routes using Layout.astro as shell** — pages_wort_vorschlagen_wortvorschlagenpage, pages_legalpages_legalpagesroute, pages_404_notfoundpage, pages_index_homepage, pages_pwa_pwacachepage, pages_wort_wordslugpage, pages_wort_wordindexpage, layouts_layout_layoutastro [EXTRACTED 1.00]
- **GQL generated type layer (graphql.ts, gql.ts, fragment-masking.ts, entity-types.ts, index.ts)** — gql_graphql_generatedtypes, gql_gql_graphqlfunction, gql_fragmentmasking_usefragment, gql_entitytypes_berlinerword, gql_index_gqlbarrel [EXTRACTED 1.00]
- **Search API routes (index + meta) forming the Orama search data pipeline** — pages_api_searchindexroute, pages_api_searchmetaroute, pages_api_ormasearchindex_type [EXTRACTED 0.95]

## Communities (93 total, 38 thin omitted)

### Community 0 - "Orama Search Engine"
Cohesion: 0.15
Nodes (13): fetchWikimediaAPI(), allWords, currentWord, result, mockWords, result, capitalizeFirstLetter(), coloredConsonantsAndVowels() (+5 more)

### Community 1 - "Site Layout & Footer"
Cohesion: 0.06
Nodes (30): CarbonBadge, wrapper, Footer, fundingMenu, navMenu1, navMenu2, socialMenu, GetImageResult (+22 more)

### Community 2 - "Word Filter System"
Cohesion: 0.08
Nodes (39): $activeFilterCount store atom, Filter flyout panel pattern, Shift+/ keyboard shortcut to open search, open() modal store action, rangeFilterMinMax $wordSearch field, resetAll filter action, $searchResultCount store atom, setActiveOrderCategory action (+31 more)

### Community 3 - "Word List Filtering"
Cohesion: 0.07
Nodes (20): WordSuggestHint, button, $activeFilterCount, CleanBerlinerWord, initOrama(), $oramaSearchResults, RangeFilterMinMax, searchLength (+12 more)

### Community 4 - "Word Display & GQL Types"
Cohesion: 0.10
Nodes (30): RandomWordButton, RelatedWords, SingleWord, WordList keyboard navigation, WordList, BerlinerWord, fragment-masking.ts: useFragment / makeFragmentData / isFragmentReady, gql.ts: graphql() typed document map function (+22 more)

### Community 5 - "Asset & SEO Setup"
Cohesion: 0.09
Nodes (20): /fonts/Berlin-Bold.woff2, /fonts/Berlin-Italic.woff2, /fonts/Berlin.woff2, /fonts/BerlinerRegular.woff2, canonicalURL, testObject, testObject, elements (+12 more)

### Community 6 - "Modal & PWA Cache"
Cohesion: 0.10
Nodes (25): Modal, ModalCloseButton, PwaCacheOverview, button, strong, wrapper, useCacheStorage, stores/index.ts (barrel export) (+17 more)

### Community 7 - "Cache Storage Composable"
Cohesion: 0.09
Nodes (21): BUCKET_NAME_MAP, CacheBucket, formatBytes(), getBucketDisplayName(), StorageQuota, SwInfo, SwStatus, fetchSpy (+13 more)

### Community 8 - "GraphQL Type Definitions"
Cohesion: 0.10
Nodes (24): BerlinerWordFragment, BerlinerWordFragmentDoc, Exact, GetAllWordsLinksQueryVariables, GetPagesBySlugsQuery, GetPagesBySlugsQueryVariables, MediaItemFragment, MediaItemFragmentDoc (+16 more)

### Community 9 - "Word of the Day"
Cohesion: 0.04
Nodes (32): ~icons/lucide/chevron-right, BaseHead, SeoProps, wrapper, SetColorMode, ThemeInitializationLogic, milliseconds, breakpoints (+24 more)

### Community 10 - "Button States & Sort Controls"
Cohesion: 0.09
Nodes (15): computedState, X, options, selected, select, wrapper, attrs, mockWordSearch (+7 more)

### Community 11 - "Word Status Components"
Cohesion: 0.09
Nodes (23): IsWordOfTheDay Component Test (components/), IsWordOfTheDay Vue Component (word/), LetterFilter Filter Vue Component, SortWordBySelect Filter Vue Component, SortWordsBy Filter Vue Component, ToastNotify Component Test (legacy location), ToastNotify Vue Component (toast/), ToastNotifyContainer Vue Component (+15 more)

### Community 12 - "PWA Cache Management"
Cohesion: 0.14
Nodes (10): ConfirmDialog, Component, confirmClearAll(), confirmClearBucket(), isPwaInstalled, storageQuotaPercent, string, swStatusIcon (+2 more)

### Community 13 - "Word Detail Page"
Cohesion: 0.12
Nodes (12): wrapper, ~icons/lucide/external-link, @styles/components/_single-word.scss, @styles/objects/_word.scss, removeFileExtension(), alternativeWords, galleryWidths, hypher (+4 more)

### Community 14 - "Visual Feedback Components"
Cohesion: 0.18
Nodes (9): ConfettiEffect, wrapper, SingleLoader, CountdownLogic, WordOfTheDay, $wordOfTheDay, isWordOfTheDay, wrapper (+1 more)

### Community 15 - "Word Query Layer"
Cohesion: 0.17
Nodes (12): GetAllWordsDocument, GetAllWordsLinksDocument, GetAllWordsQuery, GetAllWordsQueryVariables, OrderEnum, PostObjectsConnectionOrderbyEnum, PostStatusEnum, client (+4 more)

### Community 16 - "Search Input Logic"
Cohesion: 0.21
Nodes (9): debouncedTrackSearch, localSearch, searchInput, searchLength, searchResultCount, trackWordSearchListSearch(), updateSearch, isBrowser() (+1 more)

### Community 17 - "Search Filter Behaviour"
Cohesion: 0.15
Nodes (10): SearchWords, hideDropdown, wordSearch, wordSearch, mockSetActiveOrderCategory, mockToggleFn, mockWordSearch, wrapper (+2 more)

### Community 18 - "GraphQL Mutations & Queries"
Cohesion: 0.20
Nodes (11): fetchAllWords(), extractWordTypes(), GET(), hypher, makeOramaSearchIndex(), GET(), hypher, result (+3 more)

### Community 19 - "Audio Playback Controls"
Cohesion: 0.22
Nodes (7): fillStyle, isPlaying, playAudio(), progress, stopAudio(), wrapper, togglePlayStop()

### Community 20 - "Search Modal UI"
Cohesion: 0.20
Nodes (6): @components/word-search/WordSearchList.vue, $searchResultCount, searchResultCount, activeFilterCount, searchResultCount, WordSuggestHint

### Community 21 - "App Shell & Theme"
Cohesion: 0.33
Nodes (5): Example, getWordOfTheDay(), Translation, Word, WordOfTheDay

### Community 22 - "Word Index Page"
Cohesion: 0.40
Nodes (3): OramaSearchIndex, IsWordOfTheDay, WordOptionDropdown

### Community 23 - "Dark Mode Toggle"
Cohesion: 0.20
Nodes (9): Moon, Sun, button, dom, html, wrapper, toggleMode, @components/ColorModeToggle.vue (+1 more)

### Community 24 - "Image Gallery"
Cohesion: 0.50
Nodes (3): doc, expectedTags, result

### Community 25 - "Word Suggestion Form"
Cohesion: 0.50
Nodes (3): englishTags, expectedGermanTags, expectedTags

### Community 26 - "Cookie & PWA Service"
Cohesion: 0.20
Nodes (11): CookieConsent, ImageGallery, ImageGalleryCustomElement, ImageGalleryProps, ScrollToTop, ScrollToTopProps, WordSearchLink, onOfflineReady() (+3 more)

### Community 27 - "API Service Layer"
Cohesion: 0.25
Nodes (9): services/api.ts (barrel export), BerlinerWord fragment, MediaItem fragment, PostTypeSeoFragment, WordProperties fragment, GetPagesBySlugs (GraphQL query), fetchAllWords(), fetchPaginatedWords() (+1 more)

### Community 28 - "GQL Fragment Definitions"
Cohesion: 0.14
Nodes (11): BerlinerWord, MediaItem, PostTypeSeoFragment, WordProperties, WordPropertiesBerlinerischAudio, WordPropertiesExamples, WordPropertiesExamplesExampleAudio, WordPropertiesWikimediaFiles (+3 more)

### Community 29 - "Form & Auth Components"
Cohesion: 0.14
Nodes (12): AlertBanner, AlertBannerProps, ColorModeToggle, AlertBanner, isSending, isVerified, sendMailMutation, SuggestWordForm (+4 more)

### Community 30 - "Berlin Heritage Imagery"
Cohesion: 0.36
Nodes (8): 19th Century Berlin Infrastructure, Berliner Street Culture Symbol, Cafe Achteck Architectural Drawing, Octagonal Floor Plan with Dimensions, Historic Berlin Architecture, Octagonal Cast-Iron Kiosk Structure, Berlin Public Toilet (Bedürfnisanstalt), Victorian Ornate Cast-Iron Design

### Community 31 - "Virtualized Word List"
Cohesion: 0.25
Nodes (4): activeIndex, oramaSearch, showActive, virtualizerRef

### Community 32 - "Toast Notification System"
Cohesion: 0.25
Nodes (6): Close, isOpen, isSupported, { isSwiping }, StylePositionType, toastIconMap

### Community 33 - "Word Examples & Audio"
Cohesion: 0.29
Nodes (6): Maybe, @/gql/entity-types, virtual:icons/lucide/quote, @components/AudioPlayerList.vue, AudioPlayerList, props

### Community 34 - "PWA Install Store"
Cohesion: 0.43
Nodes (6): BeforeInstallPromptEvent, disableInAppInstallPrompt(), $installPrompt, $isPwaInstalled, $showInstallButton, triggerPwaInstall()

### Community 35 - "Helper Utility Tests"
Cohesion: 0.29
Nodes (7): checkObjectValueLength Helper Test, checkObjectValues Helper Test, formattedDate Helper Test, randomElement Helper Test, routeToWord Helper Test, useViewTransition Helper Test, General Helpers (src/utils/helpers)

### Community 36 - "Word Utility Tests"
Cohesion: 0.29
Nodes (7): coloredConsonantsAndVowels Util Test, countLetters Util Test, getWordType Util Test, similarSoundingWords Util Test, similarWords Util Test, translateNlpTags Util Test, Word Helper Utils (src/utils/wordHelper)

### Community 37 - "Toast Container"
Cohesion: 0.33
Nodes (4): mockToasts, toastComponents, wrapper, toastStore

### Community 38 - "GQL Fragment Masking"
Cohesion: 0.20
Nodes (5): @urql/core, FragmentType, Documents, DocumentType, Incremental

### Community 39 - "Word Card Concepts"
Cohesion: 0.33
Nodes (6): createToastNotify action, highlightMatches text highlight util, $wordOfTheDay store atom, IsWordOfTheDay, SingleWord, WordOptionDropdown

### Community 40 - "Badge & Scroll Components"
Cohesion: 0.40
Nodes (5): BadgeTag Component Test, BadgeTag Vue Component, ScrollToTop Component Test, ScrollToTop Vue Component, Test Global Setup (setup.ts)

### Community 41 - "Bear Mascot Branding"
Cohesion: 0.60
Nodes (5): brown-bear-roar.png (image asset), Berliner Bär (Berlin heraldic bear), App branding mascot / visual identity, Schnauze (snout/mouth/attitude concept), High-contrast black-and-white photographic illustration

### Community 42 - "Random Word Tests"
Cohesion: 0.40
Nodes (3): href, words, wrapper

### Community 43 - "Legal Pages"
Cohesion: 0.18
Nodes (6): astro:env/client, GetPagesBySlugsDocument, @styles/objects/_legal-pages.scss, client, fetchAPI(), refreshToken()

### Community 44 - "Toast Popover Concepts"
Cohesion: 0.40
Nodes (5): Popover API (native browser), removeToastById action, $toastNotify store atom, ToastNotify, ToastNotifyContainer

### Community 46 - "Audio Player Components"
Cohesion: 0.50
Nodes (4): AudioPlayer, AudioPlayerList, AudioPlayerListProps, MediaItem

### Community 49 - "Search Modal State"
Cohesion: 0.50
Nodes (3): searchResultCount, showWordListFilterFlyout, WordList

## Ambiguous Edges - Review These
- `$wordSearch` → `ThemeInitializationLogic`  [AMBIGUOUS]
  src/components/SetColorMode.astro · relation: semantically_similar_to

## Knowledge Gaps
- **341 isolated node(s):** `TurnstileInstance`, `Window`, `@styles/app.scss`, `FragmentType`, `Documents` (+336 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `$wordSearch` and `ThemeInitializationLogic`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `@/gql/graphql.ts` connect `GraphQL Type Definitions` to `GQL Fragment Masking`, `Word of the Day`, `Legal Pages`, `Word Query Layer`, `Form & Auth Components`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `@layouts/Layout.astro` connect `Word of the Day` to `Site Layout & Footer`, `Toast Container`, `Asset & SEO Setup`, `Legal Pages`, `PWA Cache Management`, `Word Detail Page`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `trackEvent()` connect `Cookie & PWA Service` to `PWA Install Store`, `Word List Filtering`, `Cache Storage Composable`, `Button States & Sort Controls`, `Search Input Logic`, `App Shell & Theme`, `Dark Mode Toggle`, `Form & Auth Components`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `trackEvent()` (e.g. with `CookieConsent` and `WordOfTheDay`) actually correct?**
  _`trackEvent()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `WordFilter` (e.g. with `SearchModal` and `Filter flyout panel pattern`) actually correct?**
  _`WordFilter` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TurnstileInstance`, `Window`, `@styles/app.scss` to the rest of the system?**
  _341 weakly-connected nodes found - possible documentation gaps or missing edges._