# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.21.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.21.2...v3.21.3) (2025-09-23)


### Bug Fixes

* **pwa:** build error ([f3f1e39](https://github.com/felix-berlin/berliner-schnauze/commit/f3f1e39d90d029592f4d16d836cb871cb0ff02ee))

## [3.21.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.21.1...v3.21.2) (2025-07-28)


### Bug Fixes

* remove file extentions from urls ([5022995](https://github.com/felix-berlin/berliner-schnauze/commit/502299500fece47a81bec610d5cb1864879906f5))

## [3.21.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.21.0...v3.21.1) (2025-07-25)


### Performance Improvements

* use prefetch; build in file mode; disable enableNativePlugin ([cf16bb7](https://github.com/felix-berlin/berliner-schnauze/commit/cf16bb72287cc45b64e37101f11e4abe231df601))

# [3.21.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.20.4...v3.21.0) (2025-06-21)


### Bug Fixes

* **astro images:** responsive image config ([4f24538](https://github.com/felix-berlin/berliner-schnauze/commit/4f245386ddc2b32b5bd5a0b8c14b0039d1e0e179))
* **breadcrumbs:** add global spacing styles ([dad339d](https://github.com/felix-berlin/berliner-schnauze/commit/dad339d2e6cf78e6d84f305ed25d47d4efe685ed))
* **button with states:** make class naming more clear ([1f4767a](https://github.com/felix-berlin/berliner-schnauze/commit/1f4767affd7c1aff8f3ad90722b47c924de4df5b))
* **filter search:** style <i> general; center span inside button ([a2bbc8a](https://github.com/felix-berlin/berliner-schnauze/commit/a2bbc8ac8a270bf0982c523ffd3189cf95010f80))
* filter wording ([6c272d3](https://github.com/felix-berlin/berliner-schnauze/commit/6c272d383d359f6a35a041251c57ce5a91938d50))
* **modal:** Uncaught TypeError: o is not a function ([c2af7ae](https://github.com/felix-berlin/berliner-schnauze/commit/c2af7ae26821698c8931bfa1b6f48e7af5f63baa))
* remove default range and fieldset styles ([f06f96f](https://github.com/felix-berlin/berliner-schnauze/commit/f06f96f54baef0102fed1935f0cf13c7cf31b206))
* **search modal:** styles ([88c5da8](https://github.com/felix-berlin/berliner-schnauze/commit/88c5da8450c2951e4f3caf72596ec470ba849ac7))
* **search word:** add missing id ([af7eea0](https://github.com/felix-berlin/berliner-schnauze/commit/af7eea01ef86e87ee579693efbd68bbdc40e0232))
* **theme color:** after page transition ([01a61b2](https://github.com/felix-berlin/berliner-schnauze/commit/01a61b21dfcf923bbf81fe2baf156e1bae0bd994))
* **word filter:** missing resets ([f036e46](https://github.com/felix-berlin/berliner-schnauze/commit/f036e46b4ed367c9e62cd15a09fbdb4e86100d72))
* **word list:** active styles ([e5475aa](https://github.com/felix-berlin/berliner-schnauze/commit/e5475aa703ac801643a8a9c2e7cb8ac688de6508))
* **word list:** reset should not reset letter groups ([1d1a8db](https://github.com/felix-berlin/berliner-schnauze/commit/1d1a8dba309b42b3487cf07462e65245d605620f))
* wrong class names ([e54f464](https://github.com/felix-berlin/berliner-schnauze/commit/e54f4640ef7fc3000b9b997201990039298a23ba))


### Features

* add AudioExamplesSwitch to WordFilter ([f36a1c8](https://github.com/felix-berlin/berliner-schnauze/commit/f36a1c87f504e3d73c255318b65c72331966f9c7))
* add basic word range slider styles ([2077d08](https://github.com/felix-berlin/berliner-schnauze/commit/2077d085058c241ff107b922f2e6da0f035a0372))
* add WordRangeSlider ([19d2a87](https://github.com/felix-berlin/berliner-schnauze/commit/19d2a875321b7ae7bd4fe02378b10c9d12324565))
* add WordRangeSlider for all new filter to WordFilter ([ec0ce04](https://github.com/felix-berlin/berliner-schnauze/commit/ec0ce040bb6d9ca2e9b140c71da12e93785e4016))
* **api:** search index comes with more filter data ([833450c](https://github.com/felix-berlin/berliner-schnauze/commit/833450cc4dfbc41bdf678230068c3b13d03ca2e9))
* **ButtonWithStates:** add new component and implement in WordFilter ([e96f790](https://github.com/felix-berlin/berliner-schnauze/commit/e96f790861d978ad249245566b681b45e7ebaab5))
* create general word switch component ([034f6b8](https://github.com/felix-berlin/berliner-schnauze/commit/034f6b881262df82e6d3ca938a824f21595a310e))
* **filter:** use NLP wordTypes instead of curated; make it possible to filter more then one type ([a0a313c](https://github.com/felix-berlin/berliner-schnauze/commit/a0a313c334024710be365cc3ad5a8d3d70a07f6f))
* make placeholder search input styles global ([25cca68](https://github.com/felix-berlin/berliner-schnauze/commit/25cca68260a41c8a8d212b5293dec33bece18da6))
* **meta:** calc min and max for range filters ([46cdb9d](https://github.com/felix-berlin/berliner-schnauze/commit/46cdb9db7966d212667e8a9318f3f2afa97b0b4d))
* **word filter:** show close button at the bottom ([5fc396e](https://github.com/felix-berlin/berliner-schnauze/commit/5fc396e1963729ada3f0d718aa4b1cf8b2e5ad7f))
* **word list:** change active styles to dashed line ([3f72ebe](https://github.com/felix-berlin/berliner-schnauze/commit/3f72ebe015b42697be4e1b6971338e845427ae57))
* **word list:** limit results height to max 100vh ([46afc83](https://github.com/felix-berlin/berliner-schnauze/commit/46afc83e49f89ce645c1963045d6e9ff8b4968cf))
* **word search slider:** add styles for filter search ([bb4a9ca](https://github.com/felix-berlin/berliner-schnauze/commit/bb4a9ca9ef123df3e94ec0154f85bd6dbaf446e0))
* **word type filter:** add info text ([72fe645](https://github.com/felix-berlin/berliner-schnauze/commit/72fe64535ef712f0215f8965235e654753e0b7ab))
* **word type filter:** add x icon on select item hover ([d79f5c0](https://github.com/felix-berlin/berliner-schnauze/commit/d79f5c09add8d51be700c6dcebdbf5314614929f))
* **word:** add info text ([182c576](https://github.com/felix-berlin/berliner-schnauze/commit/182c576d5da694a85b7e5980580f52b57ae6d161))
* **WordFilter:** add all new switch filter ([1a71576](https://github.com/felix-berlin/berliner-schnauze/commit/1a71576fb022fb20d28054dcaafd6f23ff012e38))
* **wordList:** implement filter logic for the new props ([c0a91db](https://github.com/felix-berlin/berliner-schnauze/commit/c0a91dbffee9f93afb57115faf82c992cd230895))


### Performance Improvements

* load modal idle; prerender SearchModalTrigger ([e2c09fa](https://github.com/felix-berlin/berliner-schnauze/commit/e2c09fabe8c393ac5a4d8ca9d5c6b587be1789bd))
* optimize search endpoint ([94b30f0](https://github.com/felix-berlin/berliner-schnauze/commit/94b30f098462d9a710d42ed6a3859446f24a03e1))

## [3.20.4](https://github.com/felix-berlin/berliner-schnauze/compare/v3.20.3...v3.20.4) (2025-05-31)


### Bug Fixes

* make related words list element ([da1e76f](https://github.com/felix-berlin/berliner-schnauze/commit/da1e76f4a3fea350389b475bc5e5052be396c155))

## [3.20.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.20.2...v3.20.3) (2025-05-31)


### Bug Fixes

* **toast:** add missing aria labels ([9dfc72e](https://github.com/felix-berlin/berliner-schnauze/commit/9dfc72e4cbc56fb5e05eb04fcc20b68033a137ef))
* **toast:** max width on desktop ([aa3e9ea](https://github.com/felix-berlin/berliner-schnauze/commit/aa3e9eacfbc057aa5f1299b63f9f2a9ea3e1c43a))


### Performance Improvements

* load conditial components async ([5c01a2b](https://github.com/felix-berlin/berliner-schnauze/commit/5c01a2b23a62df6b842a42e3bd8c955672b73270))
* **toast:** load icon dynamic ([7e41e86](https://github.com/felix-berlin/berliner-schnauze/commit/7e41e86353e662bd53f9974c7e5c261c809624ae))

## [3.20.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.20.1...v3.20.2) (2025-05-31)


### Bug Fixes

* **imageGallery:** missing caption and description ([595d227](https://github.com/felix-berlin/berliner-schnauze/commit/595d2271617f3293b5126ec7cf5a629965402ca4))

## [3.20.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.20.0...v3.20.1) (2025-05-30)


### Bug Fixes

* show translations on mobile in next line ([ac344b5](https://github.com/felix-berlin/berliner-schnauze/commit/ac344b53d61133cf9f9251002008b5c58ef2f2bf))

# [3.20.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.19.0...v3.20.0) (2025-05-30)


### Features

* **SingleWord:** limit translations by element width; set item size ([26959b3](https://github.com/felix-berlin/berliner-schnauze/commit/26959b3fada7e1e852c2f6532508caad94394bb6))


### Performance Improvements

* **api:** remove SetWordData; add new meta endpoint; rename index endpoint; ([cfe4490](https://github.com/felix-berlin/berliner-schnauze/commit/cfe4490eada9b8e0bfa934d8b5b76629762a36ef))
* try esnext build ([f9339d3](https://github.com/felix-berlin/berliner-schnauze/commit/f9339d36315ad3d0d63e53ec6e0bd65b9d94c1f8))
* update browserslist ([9f1369c](https://github.com/felix-berlin/berliner-schnauze/commit/9f1369c2c5f6344fbcbd9bbcc8d27269d0144295))

# [3.19.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.18.0...v3.19.0) (2025-05-29)


### Features

* **word index:** add structured data to word index ([899de46](https://github.com/felix-berlin/berliner-schnauze/commit/899de4673db119328ce3302dcf56bb813b542eb3))
* **word:** add structured data to single word ([e4a8072](https://github.com/felix-berlin/berliner-schnauze/commit/e4a807262a29ebb49033098be76d929cf6ef86b9))

# [3.18.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.17.2...v3.18.0) (2025-05-29)


### Bug Fixes

* remove unused container query ([1e4a8f9](https://github.com/felix-berlin/berliner-schnauze/commit/1e4a8f93e2b05f6344ed421468e7aeb4be0c7dc1))
* **SearchModal:** improve ui by missing close button, spacing and hidden shortcuts on mobile ([f74bd67](https://github.com/felix-berlin/berliner-schnauze/commit/f74bd67182f579d8b9d07930f98c5e504051c438))
* **WordList:** make native list element ([7536238](https://github.com/felix-berlin/berliner-schnauze/commit/75362383a175d30596a3ca42320ce8f184e63d46))


### Features

* **ModalCloseButton:** add prefix suffix and default slot ([3772b1f](https://github.com/felix-berlin/berliner-schnauze/commit/3772b1f34b37f377f146f849b5a08becf57a8894))

## [3.17.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.17.1...v3.17.2) (2025-05-29)


### Bug Fixes

* **modal:** ensure resetModal handles window context before setting state ([af5086d](https://github.com/felix-berlin/berliner-schnauze/commit/af5086df18a2b82f8400057130c0c21cb1a07392))

## [3.17.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.17.0...v3.17.1) (2025-05-29)


### Bug Fixes

* **hightlight:** add custom colors to marker ([ab2619d](https://github.com/felix-berlin/berliner-schnauze/commit/ab2619d3225c2eae37a2a5cf223ae879176d3f67))
* **wordList:** enum filters; make wordGroup enum ([99e8d7e](https://github.com/felix-berlin/berliner-schnauze/commit/99e8d7e495fdd39c05a67faf39c9a509b4c68742))
* **WordSearchList:** add missing shortcut styles ([2551d61](https://github.com/felix-berlin/berliner-schnauze/commit/2551d6193cd50fb4818fb6c067a67a6d34ea53d5))

# [3.17.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.6...v3.17.0) (2025-05-28)


### Bug Fixes

* **_app:** remove unused VueVirtualScroller import and related code ([2b7e24e](https://github.com/felix-berlin/berliner-schnauze/commit/2b7e24eba21adf76f88ac91f4a6a547704468e14))
* **404:** remove unused SearchBar component from 404 page ([7437bfa](https://github.com/felix-berlin/berliner-schnauze/commit/7437bfafdd951141e7db75dfe2d7e5558652a9fc))
* **config:** update cache expiration maxAgeSeconds to 3 hours ([41ae24b](https://github.com/felix-berlin/berliner-schnauze/commit/41ae24b1c11b06c33342b02eb60bcbbd0b7f1d4c))
* **devtools:** restructure devtools integration for improved state management ([545e7f4](https://github.com/felix-berlin/berliner-schnauze/commit/545e7f4e5362beb240ba36dbeb71d577c96bdbde))
* **header:** conditionally render SearchModalTrigger based on index page ([4c67854](https://github.com/felix-berlin/berliner-schnauze/commit/4c67854586fe703babc66ae595a21df8a9e0040a))
* improve conditional rendering for word creation and modification dates ([e7db48c](https://github.com/felix-berlin/berliner-schnauze/commit/e7db48c503629538eb1fc7a01f670581c9d5423f))
* **modal:** correct modal display property placement for search modal ([a9d1fff](https://github.com/felix-berlin/berliner-schnauze/commit/a9d1fff666896493f29dec3febc68a85ef52388b))
* **modal:** enhance modal close behavior and reset state ([9fff308](https://github.com/felix-berlin/berliner-schnauze/commit/9fff308da5386889c2d0beff37448463dd14264c))
* **modal:** remove unnecessary class for search modal and clean up styles ([5e31881](https://github.com/felix-berlin/berliner-schnauze/commit/5e31881817c26c53cf6392e659b63f6f3905e556))
* **modal:** update display properties for modal and search modal for consistency ([28cc95b](https://github.com/felix-berlin/berliner-schnauze/commit/28cc95b197f7baa5ed01dd9fc7ba83c70eb79b3e))
* **modal:** update display property for modal components ([7a701b1](https://github.com/felix-berlin/berliner-schnauze/commit/7a701b1c625ca572b854d4bc3ec4a7a852728264))
* **related-words:** add role attributes for accessibility in related words component ([2339249](https://github.com/felix-berlin/berliner-schnauze/commit/2339249e0174bffdef555bc982537dc68d715208))
* **search-modal:** conditionally render WordList based on searchResultCount ([80c7e44](https://github.com/felix-berlin/berliner-schnauze/commit/80c7e4428b77fdfb1bd456c4bc21ae05a06ae964))
* **SearchBarModal:** correct click callback invocation and update slash icon ([70e8da7](https://github.com/felix-berlin/berliner-schnauze/commit/70e8da7dc70f15e15c9dcf462845ab3a006e84db))
* **SearchModal:** add ref to search modal and clean up template structure ([3e8fdbc](https://github.com/felix-berlin/berliner-schnauze/commit/3e8fdbc81ae0c79d32b2a2c6ff7366dacab6b3a5))
* **SearchModal:** update WordList component props and clean up imports ([e98786d](https://github.com/felix-berlin/berliner-schnauze/commit/e98786d00c20877355d3b5ae44b1cc67c9307e9c))
* **search:** update tracking label from "Word Search List" to "Word Search" ([5ba3200](https://github.com/felix-berlin/berliner-schnauze/commit/5ba3200d42108f2e6cc3191c5eb1751b95368267))
* **shortcut:** update background color for shortcut key and adjust dark mode styling ([2e6f0cb](https://github.com/felix-berlin/berliner-schnauze/commit/2e6f0cbf5d0500304ece2133d28a839334628e5a))
* **SingleWord:** ensure dropdown visibility is controlled by showDropdown prop ([60d6cfd](https://github.com/felix-berlin/berliner-schnauze/commit/60d6cfdb67ba8dd3073c16c76574a9fc377337d0))
* **tests:** standardize orderType casing to 'ASC' in SortWordBySelect and SortWordsBy tests ([6a1f5b7](https://github.com/felix-berlin/berliner-schnauze/commit/6a1f5b70d84c79af280a319764e45c0b8a48f6df))
* **word-filter:** add closeOnClickOutside prop to control flyout behavior ([9c2f95c](https://github.com/felix-berlin/berliner-schnauze/commit/9c2f95c80e1ba326938372217fb05f65133cae83))
* **word-search:** ensure search button maintains height and aspect ratio ([ad72c74](https://github.com/felix-berlin/berliner-schnauze/commit/ad72c745b0d4a3d968b1ea268d6ff50fd7e9e2fa))
* **word-search:** update layout to include shortcuts in the search filter ([359838c](https://github.com/felix-berlin/berliner-schnauze/commit/359838ca9d3fbe706c49e8d7c7a962893cb534c9))
* **word-suggest-hint:** refactor modal handling to simplify opening suggestion form ([abaaef2](https://github.com/felix-berlin/berliner-schnauze/commit/abaaef2401b42f89586a7793f60df1694ed26848))
* **WordList:** remove click event handler from list item component ([097f605](https://github.com/felix-berlin/berliner-schnauze/commit/097f605cda831f5e664d45a7b4f37926fcf474f6))
* **wordList:** update API fetch URL to use relative path ([f5f9fb8](https://github.com/felix-berlin/berliner-schnauze/commit/f5f9fb85014fad9fa884975d7e2e1a7b3c199ea0))
* **WordList:** update source and positions mapping for search results ([2f224e3](https://github.com/felix-berlin/berliner-schnauze/commit/2f224e367ea785f494f24a92698fd673c9cfccda))
* **wordOfTheDay:** ensure error state is set on fetch failure ([c08d2f2](https://github.com/felix-berlin/berliner-schnauze/commit/c08d2f2e8802000d5efa2a4c290a89c90a7822de))


### Features

* add basic orama search component ([c49fbe3](https://github.com/felix-berlin/berliner-schnauze/commit/c49fbe39ce404c48fe7dd4b5333ed8c841db72f3))
* add orama search to store ([3a2618e](https://github.com/felix-berlin/berliner-schnauze/commit/3a2618efe9d588813ad012c274e72ab2719313e2))
* add search index api endpoint ([d98a48d](https://github.com/felix-berlin/berliner-schnauze/commit/d98a48d65f8520126c3d0e242663f4e0a3c0c9fc))
* add working orama search to WordSearchNew ([74ae0d4](https://github.com/felix-berlin/berliner-schnauze/commit/74ae0d4b4915ac9a327fe49767842539caffc6be))
* **caching:** update search index API pattern and add caching for word of the day API ([9e198fe](https://github.com/felix-berlin/berliner-schnauze/commit/9e198fe63cbdb94c9a97dbe450a2b7925be226f6))
* **header:** update SearchModalTrigger to use client:only for improved performance ([ba672b5](https://github.com/felix-berlin/berliner-schnauze/commit/ba672b5b34a8f7b70e35283a194ef9cd9b9e84bb))
* **instructions:** add project overview and guidelines for testing and Vue.js TypeScript ([2eb94be](https://github.com/felix-berlin/berliner-schnauze/commit/2eb94bef4d7bf773eee0cffe59d3c16543f53320))
* **modal:** implement modal component with close button and state management ([60e7a18](https://github.com/felix-berlin/berliner-schnauze/commit/60e7a18cd1bd13249fba87465410afd8889b9b81))
* **PWA:** add runtime caching for search index API response ([d35f30b](https://github.com/felix-berlin/berliner-schnauze/commit/d35f30b05e2205bdcc4d2b04eb429d38aec4f81c))
* **search-modal:** add NoSearchResults component and integrate into WordSearchList for improved user feedback ([2de5253](https://github.com/felix-berlin/berliner-schnauze/commit/2de5253c9f1b4ac492ee128b6a1041ccdc3fcb1d))
* **search-modal:** enhance layout and styling for improved user experience ([8f892c8](https://github.com/felix-berlin/berliner-schnauze/commit/8f892c8ec16e21c18dfec01f9b01eef672d65ab4))
* **search:** implement caching for search index API response ([46d3ef5](https://github.com/felix-berlin/berliner-schnauze/commit/46d3ef51905e04c6d44b94fcf4de150093639278))
* **SearchModal:** enhance modal layout and add keyboard shortcuts for navigation ([3faff20](https://github.com/felix-berlin/berliner-schnauze/commit/3faff200786b052f031ae32dc30f2fb330cea1b0))
* **SearchModal:** enhance search modal layout and functionality with result count display and focus handling ([a3db040](https://github.com/felix-berlin/berliner-schnauze/commit/a3db04015daaa25e405a198e6a0bca7668d0618a))
* **search:** refactor search modal to use separate components for result count and shortcuts ([fa7ab08](https://github.com/felix-berlin/berliner-schnauze/commit/fa7ab0883b7866d588b86584a6aebe918cd8ecac))
* **SearchWords:** add autoFocus prop to enable automatic input focus ([34ecfd0](https://github.com/felix-berlin/berliner-schnauze/commit/34ecfd0fa22b6e3c817a1717baa96cfa8e771a2c))
* **shortcuts:** replace SearchShortcuts with individual shortcut components for improved modularity ([fbd6197](https://github.com/felix-berlin/berliner-schnauze/commit/fbd6197c692d68a579c52353a6ca78bb82d5cfe8))
* **store:** replace fuse search by orama search ([d6e24c4](https://github.com/felix-berlin/berliner-schnauze/commit/d6e24c4b44a6b2e816a17bdef214db9e269e11e8))
* **word search:** update word search components to work with new search engine ([f5c1ec0](https://github.com/felix-berlin/berliner-schnauze/commit/f5c1ec00c555e8841e464f2a6f6643e4fae8e32b))
* **word-search:** add SetWordData component to manage word groups and types ([1903c9f](https://github.com/felix-berlin/berliner-schnauze/commit/1903c9f841dd9f7223616a78fd1da637361e63e8))
* **WordList:** allow dynamic selection of virtualizer component based on props ([4837676](https://github.com/felix-berlin/berliner-schnauze/commit/483767667d0973f55001339ba714bda95114b27f))
* **WordList:** enhance accessibility with keyboard navigation and active item styling ([8bc5274](https://github.com/felix-berlin/berliner-schnauze/commit/8bc5274aa1f151d55ed987ecec786cc29586da92))

# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.16.6](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.5...v3.16.6) (2025-05-18)


### Bug Fixes

* typos ([608536e](https://github.com/felix-berlin/berliner-schnauze/commit/608536e793599101d955ed13ad65d34db3f79e1b))


### Performance Improvements

* **head:** use astro capo ([2297cf9](https://github.com/felix-berlin/berliner-schnauze/commit/2297cf93edf386c78b47ee1b9b0d888ecb5bf315))

## [3.16.5](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.4...v3.16.5) (2025-05-11)


### Bug Fixes

* add missing astro page transition handling for img placeholder ([2a6d116](https://github.com/felix-berlin/berliner-schnauze/commit/2a6d116f311a6f3d2f94f9457a3554f7fbb9025b))
* remove double margins on first index images ([a00a880](https://github.com/felix-berlin/berliner-schnauze/commit/a00a880b852fdb88b15c4d5ee7913ce04f3676aa))


### Performance Improvements

* add more responsive image breakpoints ([c70a5a7](https://github.com/felix-berlin/berliner-schnauze/commit/c70a5a76b74c280bd3da6d9a5900087ca247cfc8))
* add skeleton loader; index above the fold image uses placeholder image ([ec028e6](https://github.com/felix-berlin/berliner-schnauze/commit/ec028e6c7b0106dce5a4016deb56ac4aa99170c5))
* split up elements from MainHeader to create static fallback components ([831075e](https://github.com/felix-berlin/berliner-schnauze/commit/831075e92c37e8896ca7e56216f86b63e1913846))

## [3.16.4](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.3...v3.16.4) (2025-05-11)


### Performance Improvements

* preload fonts ([e4f7165](https://github.com/felix-berlin/berliner-schnauze/commit/e4f7165d5ffebf51910b97ca8a9be9ad756f8a95))

## [3.16.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.2...v3.16.3) (2025-05-11)


### Bug Fixes

* **Footer:** loop condition ([47e0265](https://github.com/felix-berlin/berliner-schnauze/commit/47e02652ff557a9d950368559d28ad2b2f326ed6))
* type and add missing await ([62f121b](https://github.com/felix-berlin/berliner-schnauze/commit/62f121b549c9cb2429584fda74f55aed30c191cb))
* **WordOfTheDay:** make word link a little bigger ([9826668](https://github.com/felix-berlin/berliner-schnauze/commit/9826668b8b1ad0d3ca1d9bb524f6d560520d6042))


### Performance Improvements

* fix layout image format; ([b757089](https://github.com/felix-berlin/berliner-schnauze/commit/b757089e645099336fda26a210aaaff42510156d))

## [3.16.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.1...v3.16.2) (2025-05-09)


### Bug Fixes

* some ([5418572](https://github.com/felix-berlin/berliner-schnauze/commit/54185725c55f6bddc5340a074244eb070dfcd6e7))

## [3.16.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.16.0...v3.16.1) (2025-04-27)


### Bug Fixes

* only focus searchabr on larger devices ([59d7df6](https://github.com/felix-berlin/berliner-schnauze/commit/59d7df6611a7b9175cda2fd5bd1ac049b7cb523f))
* **soundEx:** Cannot read properties of null ([9029719](https://github.com/felix-berlin/berliner-schnauze/commit/9029719be942bacc96ce65a95c44d655358244f7))

# [3.16.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.15.0...v3.16.0) (2025-04-10)


### Features

* add events ([790f904](https://github.com/felix-berlin/berliner-schnauze/commit/790f9042491c7a5b03e2d1ab4c73ada92fdf6887))
* add installed event ([ac2281b](https://github.com/felix-berlin/berliner-schnauze/commit/ac2281ba64fa03a95b2e334c05bbb87c946c2210))
* create new analytic util functions ([b9ae291](https://github.com/felix-berlin/berliner-schnauze/commit/b9ae2918b8ac3ef25706efb0027368b8d7db779c))

# [3.15.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.14.3...v3.15.0) (2025-04-07)


### Bug Fixes

* disable background transition ([e2141d7](https://github.com/felix-berlin/berliner-schnauze/commit/e2141d701c4c874d25aae44eecb9b74b191df448))


### Features

* add global setMatomoSearch function ([2c5edc3](https://github.com/felix-berlin/berliner-schnauze/commit/2c5edc362b5bfd88bfbedac240b2b87f73f47efb))
* replace WordSearchLink by Vue component ([2f82d56](https://github.com/felix-berlin/berliner-schnauze/commit/2f82d56832c948f043cead7e9d9accbb89280b9a))
* send page search to matomo ([0da7623](https://github.com/felix-berlin/berliner-schnauze/commit/0da76231d248d2fc41a921dc3a8b2c85bb99f1fa))
* track word list search via matomo ([b9109e3](https://github.com/felix-berlin/berliner-schnauze/commit/b9109e332b7bdf83cc77229e505f8c41db76cc2c))


### Performance Improvements

* **index:** enable responsive images ([0d2eb39](https://github.com/felix-berlin/berliner-schnauze/commit/0d2eb391966b2a339b3b52536b469e52c090902e))
* inline all styles ([5f92c8c](https://github.com/felix-berlin/berliner-schnauze/commit/5f92c8c0c6a2fa5243634b83d75c6f5fbfdd8736))

## [3.14.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.14.2...v3.14.3) (2025-03-30)


### Performance Improvements

* make sure vue devtools are not exported on prod ([d2bc8f9](https://github.com/felix-berlin/berliner-schnauze/commit/d2bc8f94f641f9c060e3fdcd0493c2b428339a77))

## [3.14.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.14.1...v3.14.2) (2025-02-02)


### Bug Fixes

* **matomo:** use view transition support for matomo ([932fb2e](https://github.com/felix-berlin/berliner-schnauze/commit/932fb2e52b2216ad7fa1ba3d636793f8e7ff199d))

## [3.14.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.14.0...v3.14.1) (2024-12-15)


### Bug Fixes

* app install error ([2981f45](https://github.com/felix-berlin/berliner-schnauze/commit/2981f45d653201d99dd00c391c796b2a3be889b2))

# [3.14.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.13.2...v3.14.0) (2024-11-08)


### Features

* remove twitter; add mastodon; remove social link from header ([764d605](https://github.com/felix-berlin/berliner-schnauze/commit/764d6056b0a2a73d8d084913a0c18c9cc5e83dc6))

## [3.13.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.13.1...v3.13.2) (2024-09-13)


### Bug Fixes

* **single word:** mobile spacing ([61547be](https://github.com/felix-berlin/berliner-schnauze/commit/61547be1116bec7ec7aa1c0d373c0b7903c0f3dc))

## [3.13.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.13.0...v3.13.1) (2024-08-10)


### Bug Fixes

* FE errors after thirdPartyErrorFilterIntegration setup ([abf8e65](https://github.com/felix-berlin/berliner-schnauze/commit/abf8e652be64ed483947ed559b8933b5269f86f2))

# [3.13.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.12.0...v3.13.0) (2024-07-12)


### Bug Fixes

* dialog color styles ([d864c66](https://github.com/felix-berlin/berliner-schnauze/commit/d864c66b8ad2b2387bf5ff6e618bb42f80211502))
* missing deps ([86e34aa](https://github.com/felix-berlin/berliner-schnauze/commit/86e34aa8a835abd4e6e3957841bc8abe938c54ef))


### Features

* add styles for WordSuggestHint ([992b1d4](https://github.com/felix-berlin/berliner-schnauze/commit/992b1d41e7f8f775a6aed5f21c784db5d96ffc4b))
* add WordSuggestHint component ([b56467b](https://github.com/felix-berlin/berliner-schnauze/commit/b56467bcce4a6c530b3891c9f54a4bda3e0d6379))
* **word suggest hint:** center elements and text ([37a405c](https://github.com/felix-berlin/berliner-schnauze/commit/37a405c8c8fd16b88c9f0d5adbb36f1831a86984))
* **WordSuggestHint:** set current search to form ([65eb302](https://github.com/felix-berlin/berliner-schnauze/commit/65eb302eb34ec9f03cdaee1b6b801a3787401b2e))

# [3.12.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.8...v3.12.0) (2024-06-15)


### Features

* gen supportedBrowsers regex ([7a3bdcf](https://github.com/felix-berlin/berliner-schnauze/commit/7a3bdcfb569dd5dca33bfee4d69110a16a8ddcd4))
* show unsupported browser message to user ([1781586](https://github.com/felix-berlin/berliner-schnauze/commit/178158642a0338d82bc8b6e721577904afd4d628))

## [3.11.8](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.7...v3.11.8) (2024-05-18)


### Bug Fixes

* **single word:** exclude duplicated words ([f080497](https://github.com/felix-berlin/berliner-schnauze/commit/f08049730b6913d51ad1cbcc2a62bff37eed27c5))

## [3.11.7](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.6...v3.11.7) (2024-05-16)


### Bug Fixes

* length with fallback ([8de4b48](https://github.com/felix-berlin/berliner-schnauze/commit/8de4b4892816dab9efe3aa7162b648562f440067))

## [3.11.6](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.5...v3.11.6) (2024-05-09)


### Bug Fixes

* SoundEx import ([7ac29a1](https://github.com/felix-berlin/berliner-schnauze/commit/7ac29a1b30d2a7d90b0c84cf5070428050440375))

## [3.11.5](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.4...v3.11.5) (2024-05-09)


### Bug Fixes

* missing await on Promises ([fca090e](https://github.com/felix-berlin/berliner-schnauze/commit/fca090e532e6fbc02c540a9e4bf91a7c0237ff84))

## [3.11.4](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.3...v3.11.4) (2024-05-09)


### Performance Improvements

* make sure there is only one active worker ([ca07c3e](https://github.com/felix-berlin/berliner-schnauze/commit/ca07c3eaafdd45338942b4c5ed62c23b0b09fa4a))

## [3.11.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.2...v3.11.3) (2024-05-09)


### Bug Fixes

* a11y color contrast ([0ad5b50](https://github.com/felix-berlin/berliner-schnauze/commit/0ad5b50308868b0c741d04bdacfc13424d0e4be9))
* broken filter ([578b76c](https://github.com/felix-berlin/berliner-schnauze/commit/578b76c4f87ab9a19efaa4d13e67888ae50ab886))
* missing terminate for worker ([bee5911](https://github.com/felix-berlin/berliner-schnauze/commit/bee5911a675c0c41235f28a0c8d95634709546ec))
* wording ([6e96b7f](https://github.com/felix-berlin/berliner-schnauze/commit/6e96b7f281b704bfe2e03cc5628463f6ad1b7909))


### Performance Improvements

* add partytown and config for matomo ([f6d3d27](https://github.com/felix-berlin/berliner-schnauze/commit/f6d3d27b68e0d021dd2afab10f66fe724d4fdaa5))
* better types and perf improvements ([59e892b](https://github.com/felix-berlin/berliner-schnauze/commit/59e892ba17b5a7472d05e14def907c504052a2ed))
* **filterWorker:** combine sort, use fuse only when search is used ([b045d7d](https://github.com/felix-berlin/berliner-schnauze/commit/b045d7d359c342a72c0f512745903211ae62a875))
* move filter and sort to own worker ([0e9d8d7](https://github.com/felix-berlin/berliner-schnauze/commit/0e9d8d72c97e689bd9b380c1b0c8b4fc7a279315))

## [3.11.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.1...v3.11.2) (2024-05-02)


### Bug Fixes

* **SearchModal:** was not opening after trigger ([81ad72e](https://github.com/felix-berlin/berliner-schnauze/commit/81ad72ef2c6e27a017069190f362706a07dab669))

## [3.11.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.11.0...v3.11.1) (2024-05-02)


### Bug Fixes

* Cannot read properties of null ([78b0152](https://github.com/felix-berlin/berliner-schnauze/commit/78b0152a19e0522d277a2a400bb46b8772b79cd4))

# [3.11.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.10.3...v3.11.0) (2024-04-14)


### Features

* **color modes:** dynamic theme color ([90bde77](https://github.com/felix-berlin/berliner-schnauze/commit/90bde7734710a195ce9d34aa19c2b013183cc412))

## [3.10.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.10.2...v3.10.3) (2024-04-14)


### Performance Improvements

* **head:** improve by capo order ([4aa6836](https://github.com/felix-berlin/berliner-schnauze/commit/4aa68369fbca387fecbf743af13b884a9ded5207))

## [3.10.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.10.1...v3.10.2) (2024-04-14)


### Bug Fixes

* **WordList:** not rendered ([7aca84d](https://github.com/felix-berlin/berliner-schnauze/commit/7aca84d3e781fc8aa69f250a17ba7605999e5a84))

## [3.10.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.10.0...v3.10.1) (2024-04-11)


### Bug Fixes

* **nano stores dev tools:** enable again ([6ce9b95](https://github.com/felix-berlin/berliner-schnauze/commit/6ce9b95a51a815ad045f953b7f76863530302b42))

# [3.10.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.9.0...v3.10.0) (2024-03-06)


### Features

* add sentry browser ([ddb5e7f](https://github.com/felix-berlin/berliner-schnauze/commit/ddb5e7ff96e16a5865dead814dd76e172cadd1b3))
* add sentry sourcemap tool ([cd76934](https://github.com/felix-berlin/berliner-schnauze/commit/cd7693410cb543742ccf5c54402cd2bac6513cd3))

# [3.9.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.8.3...v3.9.0) (2024-03-05)


### Features

* create similarWords fn ([b51b22a](https://github.com/felix-berlin/berliner-schnauze/commit/b51b22a38be3aed2cfc1c9b333bc311af6496060))

## [3.8.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.8.2...v3.8.3) (2024-03-05)


### Bug Fixes

* mail not send; move to graphql api ([197d2b4](https://github.com/felix-berlin/berliner-schnauze/commit/197d2b47da97152c5146cd07f088d0411178af4f))

## [3.8.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.8.1...v3.8.2) (2024-03-04)


### Bug Fixes

* test data on public build ([1bd6c18](https://github.com/felix-berlin/berliner-schnauze/commit/1bd6c18806c465f47ac618c5f210e0fccff1b88a))

## [3.8.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.8.0...v3.8.1) (2024-03-02)


### Bug Fixes

* german tag translation, capitalize Nomen words ([d05c420](https://github.com/felix-berlin/berliner-schnauze/commit/d05c4201a7dfa5fb186464df11b16ea087de16bd))
* word overflow & disable image effect ([f7fde29](https://github.com/felix-berlin/berliner-schnauze/commit/f7fde291256c9203f02cc934d8eb1bab52c30254))

# [3.8.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.6...v3.8.0) (2024-02-29)


### Bug Fixes

* better spacings ([6dc72af](https://github.com/felix-berlin/berliner-schnauze/commit/6dc72af67fdeaa80481789872546aea005307e9c))
* wrong nlp lang ([a19be39](https://github.com/felix-berlin/berliner-schnauze/commit/a19be39c4a0d7b2e885a784917e02690a70b8053))


### Features

* add consonants-vowels colors ([8a1a117](https://github.com/felix-berlin/berliner-schnauze/commit/8a1a11716376903ddb8e78668db1e1d3e12691a7))
* add similarSoundingWords and better doc order ([113903b](https://github.com/felix-berlin/berliner-schnauze/commit/113903b53a3f0c4b009c2a9f7a10803ac5f0a727))
* add syllables and hyphenation, consonants and vowels and Grammar ([530bf73](https://github.com/felix-berlin/berliner-schnauze/commit/530bf73c77865bdd86ea6411d635f0831f2b94e0))
* dont print word type key if only one ([9bd4f2e](https://github.com/felix-berlin/berliner-schnauze/commit/9bd4f2eb91b3e4ea4c1af9cbe5e5385d4f9bf336))

## [3.7.6](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.5...v3.7.6) (2024-02-28)


### Performance Improvements

* disable prefetch ([699b1fc](https://github.com/felix-berlin/berliner-schnauze/commit/699b1fccfacff705c2ea17f7475eeee596866b0c))
* remove unused styles and optimize markup ([1361fdb](https://github.com/felix-berlin/berliner-schnauze/commit/1361fdb0b57574366cc971fc01756d5f12bb0e2d))
* use virtua als scroll list ([afb6dad](https://github.com/felix-berlin/berliner-schnauze/commit/afb6dad52ae9ea5608852f2fd896e16c81e0616a))

## [3.7.5](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.4...v3.7.5) (2024-02-27)


### Bug Fixes

* **pagefind:** css vars ([b271dbe](https://github.com/felix-berlin/berliner-schnauze/commit/b271dbec682eda04aa6aa11ce31c6bf7dca0cf4e))
* **SearchBar:** styles ([d2a92d4](https://github.com/felix-berlin/berliner-schnauze/commit/d2a92d4270a41f965b56e343dceb73988561da8a))


### Performance Improvements

* **SearchModal:** load searchbar async ([fbaab85](https://github.com/felix-berlin/berliner-schnauze/commit/fbaab8540a0bc6228b5757f74695b6ab0482e103))

## [3.7.4](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.3...v3.7.4) (2024-02-27)


### Bug Fixes

* **MainHeader:** hydration error ([6516bf2](https://github.com/felix-berlin/berliner-schnauze/commit/6516bf233e0adb537e00d8ce9750a26e6a0a7aac))

## [3.7.3](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.2...v3.7.3) (2024-02-27)


### Bug Fixes

* **single pages:** hydration errors ([3ad9df8](https://github.com/felix-berlin/berliner-schnauze/commit/3ad9df8826547cbaf1a63e680b06a6176b2bdd23))

## [3.7.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.1...v3.7.2) (2024-02-27)


### Bug Fixes

* hydration errors ([bd8a547](https://github.com/felix-berlin/berliner-schnauze/commit/bd8a54785dbedcbab4496177852e5a9c916e0851))

## [3.7.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.7.0...v3.7.1) (2024-02-27)


### Bug Fixes

* if modal is already loaded open search directly ([b882877](https://github.com/felix-berlin/berliner-schnauze/commit/b882877293121bcb47942ff3ab41104aa7be3e99))


### Performance Improvements

* add missing sizes to index image and footer image ([ec42ae3](https://github.com/felix-berlin/berliner-schnauze/commit/ec42ae39af5848a56c24405457d1240220faa981))
* disable sentry, add critters ([ad7f922](https://github.com/felix-berlin/berliner-schnauze/commit/ad7f922c81bfc148f65517811571722bb7cffb58))
* **MainHeader:** prerender components ([7e8c826](https://github.com/felix-berlin/berliner-schnauze/commit/7e8c82692dc494b3ac3675148d784cc0be2a32f8))
* remove critters ([685d58b](https://github.com/felix-berlin/berliner-schnauze/commit/685d58b81b038d256b8329335da75af917dc348d))
* **SearchModal:** load child components dynamicly ([967435f](https://github.com/felix-berlin/berliner-schnauze/commit/967435fa04d0bf77b2023c769184ba08de192af9))
* **WordExamples:** load mostly static ([146c20f](https://github.com/felix-berlin/berliner-schnauze/commit/146c20f1a9315d3b24c00f1ff157d88a5afe81a7))

# [3.7.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.6.0...v3.7.0) (2024-02-26)


### Bug Fixes

* adjust sizes if there are more than 1 ([787e252](https://github.com/felix-berlin/berliner-schnauze/commit/787e25278933e71cb06d5efea3c36b29222f881c))
* **AudioPlayer:** exchange label with german ([e222d4f](https://github.com/felix-berlin/berliner-schnauze/commit/e222d4fbdd9f028b07d59f1204aad2c79105fc23))
* better asset caching ([2786464](https://github.com/felix-berlin/berliner-schnauze/commit/278646451f95ca325debb90bf5f5dd8cbdba1398))
* **custom scrollbar:** broken styles and missing firefox styles ([a859312](https://github.com/felix-berlin/berliner-schnauze/commit/a8593124ea00eba7f725c851daaabedd7db7fe08))
* **ImageGallery:** lightbox item count ([4f3e6f5](https://github.com/felix-berlin/berliner-schnauze/commit/4f3e6f5136d1b158b61e486fc64065293924cc75))
* **ImageGallery:** ts errors ([f2cc60b](https://github.com/felix-berlin/berliner-schnauze/commit/f2cc60b90bf7cf15455f3177a70bdd539160261e))
* migrate to nanostores 0.10.0 -> remove actions ([7b8b698](https://github.com/felix-berlin/berliner-schnauze/commit/7b8b6988bfbc976fbc7106b59890fbc59f3fbe66))
* move redirect to astro ([2ca0e30](https://github.com/felix-berlin/berliner-schnauze/commit/2ca0e30faed222dd9feaae6373071122947fea8f))
* **pwa:** remove fallback url ([048dfa7](https://github.com/felix-berlin/berliner-schnauze/commit/048dfa7885dade8b5b0b0f2999b49efd09513223))
* remove astro redirects ([409ad0d](https://github.com/felix-berlin/berliner-schnauze/commit/409ad0d7b6f6bb3ea13be9955fac0bfed3e75483))
* remove get image ([1eae66a](https://github.com/felix-berlin/berliner-schnauze/commit/1eae66a8cbca51eef2c5d99194bf18c5b1feab4b))
* remove redirect ([8d51e48](https://github.com/felix-berlin/berliner-schnauze/commit/8d51e48f6823a07a792d0b3a31d1ed0968e8444c))
* **single pages:** better spacing and image widths ([12e4019](https://github.com/felix-berlin/berliner-schnauze/commit/12e40192853c0945a9f7359fac573ffd5417d9d7))
* size for 64rem ([20528c1](https://github.com/felix-berlin/berliner-schnauze/commit/20528c1e3bbf92158c22f7afc01f55f129bbe9ca))
* **WordOptionDropdown:** add missing prop declaration ([df5b7f7](https://github.com/felix-berlin/berliner-schnauze/commit/df5b7f7a213e9a8e3740f9e1950a362196667447))


### Features

* add gallery astro component ([abff390](https://github.com/felix-berlin/berliner-schnauze/commit/abff390f493aaaf42ea1e6cddee52c178b13fcc2))
* add option to show test data ([876f235](https://github.com/felix-berlin/berliner-schnauze/commit/876f235077c5f3bda1560d0074a605efd0c178a1))
* **AudioPlayer:** add custom audio player component ([6589ff7](https://github.com/felix-berlin/berliner-schnauze/commit/6589ff7750346def3e84b26f63c8a8d6f8f044bc))
* **AudioPlayer:** add progress animation ([b413766](https://github.com/felix-berlin/berliner-schnauze/commit/b41376657ca5e5428d96af2dd7b2dbc6d6a50401))
* **AudioPlayerList:** add Component and render ([a15e938](https://github.com/felix-berlin/berliner-schnauze/commit/a15e938eddc87a0ab85e7a50ec307f960646cbc2))
* **AudioPlayerList:** add styles ([5691750](https://github.com/felix-berlin/berliner-schnauze/commit/5691750dccb0971f9efa0588b5bd623d5b88d6c3))
* **AudioPlayerList:** add tooltip ([0edef46](https://github.com/felix-berlin/berliner-schnauze/commit/0edef46ed797bfb0e06dc198b9ac62d3d34bb970))
* finalize responsive image lightbox ([be99936](https://github.com/felix-berlin/berliner-schnauze/commit/be999368559c8b6e67685bd09de8f91e016fa20e))
* **ImageGallery:** add lightbox ([46c1369](https://github.com/felix-berlin/berliner-schnauze/commit/46c1369fe9cdc3db5c53d7a684e4d789a06ec448))
* **ImageGallery:** add responsive image in lightbox ([8a3c86e](https://github.com/felix-berlin/berliner-schnauze/commit/8a3c86e048bd067940bff14fda85d9be9021c409))
* **ImageGallery:** render description ([12db8ca](https://github.com/felix-berlin/berliner-schnauze/commit/12db8caae495cd593718ac69d227eded5fdea607))
* **IsWordOfTheDay:** add more props ([cb67c2d](https://github.com/felix-berlin/berliner-schnauze/commit/cb67c2d435e4322d32c18062f82ec58728b53468))
* **pwa:** cache all assets ([e66ddcd](https://github.com/felix-berlin/berliner-schnauze/commit/e66ddcde88abdb295c69800a992b631afd4932f8))
* **pwa:** notify user when app is offline ready ([41610b9](https://github.com/felix-berlin/berliner-schnauze/commit/41610b95229ed30b66f6611bfec255112246dc0a))
* **pwa:** update favicons ([b8722bf](https://github.com/felix-berlin/berliner-schnauze/commit/b8722bff8e5bbbc5a19637caae3c9291473ceb69))
* **singel pages:** reorder elements + better responsive design ([4706afd](https://github.com/felix-berlin/berliner-schnauze/commit/4706afd1ea84b4e27b2978b20b7c6b6b3d3da15d))
* **single page:** add new layout with gallery on side ([760eb3e](https://github.com/felix-berlin/berliner-schnauze/commit/760eb3ef5c69ea230e5aa71b83ee3f83c06d1020))
* **single page:** add old image style ([f802b5d](https://github.com/felix-berlin/berliner-schnauze/commit/f802b5d013743e333d6608e3d95b541d1af63274))
* **single page:** final image sizes ([fcc3414](https://github.com/felix-berlin/berliner-schnauze/commit/fcc3414c16b06092bf0a9ca378d1b9bcf2bf0f4e))
* **single pages:** add audio player list to main word ([b881747](https://github.com/felix-berlin/berliner-schnauze/commit/b881747904b4d4bcba6c232dec1240b98f4539e4))
* **single pages:** add header audio player list styles ([6d50633](https://github.com/felix-berlin/berliner-schnauze/commit/6d50633bf80c97018ad5ea43a0a6fbb7f9dbb82c))
* **single pages:** add image shadow ([72e2a73](https://github.com/felix-berlin/berliner-schnauze/commit/72e2a73d1d5d09663b9b7b504ff5b962ede2884b))
* **ToolTip:** add wrapper component ([0656100](https://github.com/felix-berlin/berliner-schnauze/commit/0656100195300100ce6693b6f6cf25d4a3ccc602))
* **word list:** reduce box shadow ([3d4b37a](https://github.com/felix-berlin/berliner-schnauze/commit/3d4b37a91def5e85a559d0002a16aafd906e3e89))


### Performance Improvements

* **WordOptionDropdown:** prevent larg html output; pass only nessary data ([2bd9dd3](https://github.com/felix-berlin/berliner-schnauze/commit/2bd9dd35facccb6fb03ca5aa32042116dbaafc16))

# [3.6.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.5.2...v3.6.0) (2024-02-02)


### Features

* add truncated breadcrumbs ([d0e9fa3](https://github.com/felix-berlin/berliner-schnauze/commit/d0e9fa39fa6f9934fe6d7ff7c09f1030cbfb0708))

## [3.5.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.5.1...v3.5.2) (2024-01-25)


### Bug Fixes

* favicon path ([afb9032](https://github.com/felix-berlin/berliner-schnauze/commit/afb9032acae20942396c31260a064be328d2eaec))
* title generation and manifest link ([749a0d7](https://github.com/felix-berlin/berliner-schnauze/commit/749a0d72670216e2a8269c43f1c00a5ec88068c9))
* try pwa install ([cc20c38](https://github.com/felix-berlin/berliner-schnauze/commit/cc20c38e63e43d2b4c2ece8c036dd0b7a09b8a06))


### Reverts

* pwa debug ([77019a5](https://github.com/felix-berlin/berliner-schnauze/commit/77019a556946708042bec09cb6e1a8a980377971))

## [3.5.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.5.0...v3.5.1) (2024-01-24)


### Bug Fixes

* **pwa:** remove fallback ([dfb40a0](https://github.com/felix-berlin/berliner-schnauze/commit/dfb40a05c2b6e2a84f752839850d71d6003de535))

# [3.5.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.4.0...v3.5.0) (2024-01-24)


### Bug Fixes

* **index:** better spacings ([a8dfb76](https://github.com/felix-berlin/berliner-schnauze/commit/a8dfb761a40108e4924ab5a4292680de0dfa48e1))
* **index:** missing dropshadow on light mode ([741145e](https://github.com/felix-berlin/berliner-schnauze/commit/741145ef193e836c19c91e67d91934e8efaf3433))
* missing letter spacing for buttons ([96d565a](https://github.com/felix-berlin/berliner-schnauze/commit/96d565a3c751efbd0120e554610bf590105f0218))
* **modal:** max width ([2579c77](https://github.com/felix-berlin/berliner-schnauze/commit/2579c77ff97885ac669aafe77d4e152c863f5644))
* **NavList:** better props handling ([83d3851](https://github.com/felix-berlin/berliner-schnauze/commit/83d3851d69c2d6bc2e51c62a916e71d25f834f6c))
* **select:** border and chevron styles ([e700290](https://github.com/felix-berlin/berliner-schnauze/commit/e700290edc159526f5539d7aa67f252a3219c7ef))
* **word-search-link:** better mobile styles ([2b2276f](https://github.com/felix-berlin/berliner-schnauze/commit/2b2276f406b48facb2b9eca2c891510468f694a2))


### Features

* add click ripple effect and scroll to search function ([bb8fa0d](https://github.com/felix-berlin/berliner-schnauze/commit/bb8fa0d8d78bd16ceed0c39736d1e21a4143a9cb))
* add facts card ([e797f56](https://github.com/felix-berlin/berliner-schnauze/commit/e797f56feba0f92f8c77bee1d1e3e96efde8e7d7))
* add new word option button ([e0ea1e9](https://github.com/felix-berlin/berliner-schnauze/commit/e0ea1e90ca5de7cee267bc4b8de5203e96c56aa3))
* add smooth scroll ([56f5eb2](https://github.com/felix-berlin/berliner-schnauze/commit/56f5eb20049c9fc81131d30533b973a6ad82a7e0))
* basic implementation of new index layout ([364ed91](https://github.com/felix-berlin/berliner-schnauze/commit/364ed91bcb4ed2e22a31d9bcd9ddc4827cc25143))
* better dropdown styles ([40b84ce](https://github.com/felix-berlin/berliner-schnauze/commit/40b84ce67515e07cd767c6b54d62287fc8dad918))
* **menu-nav:** better spacing ([f3eb10d](https://github.com/felix-berlin/berliner-schnauze/commit/f3eb10d0d2dee0d2fd41eae4ea95bd58517a4ae6))
* **search:** add scroll offset ([67b8baf](https://github.com/felix-berlin/berliner-schnauze/commit/67b8bafed76bbc08994b5a709788f2c0634d6e97))

# [3.4.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.3.1...v3.4.0) (2024-01-07)


### Bug Fixes

* **ScrollToTop:** add aria label ([0d8391c](https://github.com/felix-berlin/berliner-schnauze/commit/0d8391c564a2bfb350e6dc5fc8a9b0f60ec2cddf))
* **ScrollToTop:** also observe footer ([4d2ee5d](https://github.com/felix-berlin/berliner-schnauze/commit/4d2ee5d4880bfa201545a39037272055d82cac99))


### Features

* workbox fallback ([f06bba7](https://github.com/felix-berlin/berliner-schnauze/commit/f06bba78bc7d8a27a8d13e5dab30b68c0b6c95fa))


### Performance Improvements

* cache word of the day ([a1703d4](https://github.com/felix-berlin/berliner-schnauze/commit/a1703d45b62972167c1efa0862b18865981e4f3e))
* disable sentry ([ba13629](https://github.com/felix-berlin/berliner-schnauze/commit/ba13629363cbc15f4b0b80d4bf38e99326712432))
* **SingleWord:** load IsWordOfTheDay async ([88c067a](https://github.com/felix-berlin/berliner-schnauze/commit/88c067a032a74eb4a0408599e23a2312da0a0541))

## [3.3.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.3.0...v3.3.1) (2024-01-07)


### Bug Fixes

* filter colors ([eff2133](https://github.com/felix-berlin/berliner-schnauze/commit/eff213387f481fd9aaa56890c40d081a1a1d5b8a))
* **IsWordOfTheDayCrown:** Single Page Position ([a838f86](https://github.com/felix-berlin/berliner-schnauze/commit/a838f8607b4c9d4a4d076ad7bb7d0f260c494129))
* **SearchModal:** vue only render ([a1cca6b](https://github.com/felix-berlin/berliner-schnauze/commit/a1cca6b5d1be25caa6f75458c2d3412a8945a4bb))

# [3.3.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.2.2...v3.3.0) (2024-01-06)


### Features

* **carbon-badge:** add component to footer ([f1b97d0](https://github.com/felix-berlin/berliner-schnauze/commit/f1b97d080f491ec4f0a24a191b2c85de7b7096f3))

## [3.2.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.2.1...v3.2.2) (2024-01-06)


### Bug Fixes

* **MainHeader:** remove class list ([24596f3](https://github.com/felix-berlin/berliner-schnauze/commit/24596f34e41c75f05eaa2fe74db8e47cb8e0c48d))

## [3.2.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.2.0...v3.2.1) (2024-01-04)


### Bug Fixes

* await word of the day ([e307dba](https://github.com/felix-berlin/berliner-schnauze/commit/e307dbad670db6031e94587e1b77d85c2ae077d9))

# [3.2.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.1.0...v3.2.0) (2024-01-04)


### Features

* add simple 404 page ([9ccba84](https://github.com/felix-berlin/berliner-schnauze/commit/9ccba84441f409511254b57cfc6ccccc97cfdaba))

# [3.1.0](https://github.com/felix-berlin/berliner-schnauze/compare/v3.0.2...v3.1.0) (2024-01-02)


### Bug Fixes

* **scroll to top:** needs to hide under flyout ([5c89471](https://github.com/felix-berlin/berliner-schnauze/commit/5c89471849e5ff625b6d7181de2237bf7b5318b8))
* **scrollbar:** custom scrollbar styles everywhere ([7939ae0](https://github.com/felix-berlin/berliner-schnauze/commit/7939ae002db1c0d98bf5b892099c8073e466b1d4))


### Features

* **PWA:** hide button if installed ([6ec81d5](https://github.com/felix-berlin/berliner-schnauze/commit/6ec81d57978d502ad65af5fb843507f8d7e4a055))

## [3.0.2](https://github.com/felix-berlin/berliner-schnauze/compare/v3.0.1...v3.0.2) (2024-01-02)


### Bug Fixes

* catch error ([1283b61](https://github.com/felix-berlin/berliner-schnauze/commit/1283b617688a21b351de369c44cb699a9990b07a))
* **ToastNotify:** prevent errors -> eary return if unsupported ([e4ae52e](https://github.com/felix-berlin/berliner-schnauze/commit/e4ae52ea68b1ad4635057263e1cbf4888081631a))
* **WordOptionDropdown:** hide unsupported features ([99a5ec2](https://github.com/felix-berlin/berliner-schnauze/commit/99a5ec267f2ed413ef0460f8ee0337a86a8fe5a1))
* **WordOptionDropdown:** hydration error ([2763868](https://github.com/felix-berlin/berliner-schnauze/commit/27638682d20437ddad0b1ebafb2ba2ebd4215d24))

## [3.0.1](https://github.com/felix-berlin/berliner-schnauze/compare/v3.0.0...v3.0.1) (2024-01-02)


### Bug Fixes

* **menu nav:** app install button styles on dark mode ([adf15da](https://github.com/felix-berlin/berliner-schnauze/commit/adf15da724781b724d0c86845578af1fde56bcd5))

# [3.0.0](https://github.com/felix-berlin/berliner-schnauze/compare/v2.3.1...v3.0.0) (2024-01-02)


### Bug Fixes

* **button:** wrong font family ([53a7bf0](https://github.com/felix-berlin/berliner-schnauze/commit/53a7bf0eb38ba9c13f37fa97cdbedd72d39fea98))
* dark mode color vars ([dbe9823](https://github.com/felix-berlin/berliner-schnauze/commit/dbe9823100908df319e59f629927823b9071414a))
* **dark mode:** always set dark mode ([88950d6](https://github.com/felix-berlin/berliner-schnauze/commit/88950d6cce1dfcb8f3d2bd16a6863284b8c54e17))
* **dark mode:** load script inline ([9ec4a1c](https://github.com/felix-berlin/berliner-schnauze/commit/9ec4a1c7c424a24de1664a8459dae2d077c74965))
* filter search template ([b87f64f](https://github.com/felix-berlin/berliner-schnauze/commit/b87f64fefa00eae24de78113eefb1d255f77106d))
* **filter search:** close button was visible ([fe785ee](https://github.com/felix-berlin/berliner-schnauze/commit/fe785eec5ae71e4b98fb5b44beba270b418b74db))
* footer end layout ([523584b](https://github.com/felix-berlin/berliner-schnauze/commit/523584b90f7833b0dad4598d30b849f7c69ee927))
* footer nav styles ([b578001](https://github.com/felix-berlin/berliner-schnauze/commit/b5780013f5bae7729a2303a7fc5d2cebb0c6adde))
* **footer:** end alignment ([a875a21](https://github.com/felix-berlin/berliner-schnauze/commit/a875a2163a95531583d1feb5bc444d389b4ee00e))
* **footer:** headline type ([5d81781](https://github.com/felix-berlin/berliner-schnauze/commit/5d817819d02ebcb2ff72d82027dddd2cbbf9d222))
* graphql query since api changes ([6bb0cdf](https://github.com/felix-berlin/berliner-schnauze/commit/6bb0cdf41829c7e11f4ada3c74400d7d5cd3f69c))
* **input:** colors ([4ac583f](https://github.com/felix-berlin/berliner-schnauze/commit/4ac583fb13de9099c12c7d18e1c95900c108c6dc))
* **letter filter:** adjust grid style ([0814025](https://github.com/felix-berlin/berliner-schnauze/commit/0814025839159dbfee86488822a8379e2d090b68))
* **letter filter:** button color on light mode ([4b4386c](https://github.com/felix-berlin/berliner-schnauze/commit/4b4386cbfba2b1ce1d22a8c9074573a3af5283bd))
* light mode colors ([273f6ab](https://github.com/felix-berlin/berliner-schnauze/commit/273f6ab7db7f3321e1d0fc793e7c42ea58455d17))
* **main header:** button styles ([ef6fd59](https://github.com/felix-berlin/berliner-schnauze/commit/ef6fd5987b6c2271c8397bec61b96d78d3bef9fc))
* make sure menu opens ([d8c651a](https://github.com/felix-berlin/berliner-schnauze/commit/d8c651a5e624a28e0c0118c598724c1cbdb69283))
* missing wrap ([a5ff729](https://github.com/felix-berlin/berliner-schnauze/commit/a5ff72996a3b803e97fe9d6f93054a8cb7da054a))
* **modal:** button position ([1af0574](https://github.com/felix-berlin/berliner-schnauze/commit/1af0574aa5cb95e1eddb346680b805c7ced3b2ef))
* **modal:** close on click outside + fix enter leaver animations ([3d7a744](https://github.com/felix-berlin/berliner-schnauze/commit/3d7a7446ae54f2f37afd26f396b5bfdc7c5374e9))
* **NavigateBack:** show only if history has length ([5ac2db3](https://github.com/felix-berlin/berliner-schnauze/commit/5ac2db36237dc29ec470d1f7219338ed3c5943ad))
* new responsive image sizes ([0fc7d39](https://github.com/felix-berlin/berliner-schnauze/commit/0fc7d39ebd91f91aef01f7ffd651087a751fc964))
* options-dropdown styles ([a6f6663](https://github.com/felix-berlin/berliner-schnauze/commit/a6f66635fba41840710ed6b3509b266ace40baa0))
* plural for results ([f0904db](https://github.com/felix-berlin/berliner-schnauze/commit/f0904db60aea65963f8c89007fef5a4476db4016))
* prop destruct ([c0524d6](https://github.com/felix-berlin/berliner-schnauze/commit/c0524d69db315356217eebe10f5142afd8c843c5))
* remove unused vars ([58ad3aa](https://github.com/felix-berlin/berliner-schnauze/commit/58ad3aae54f8d207f93b28e4ff4ada4c1256fb11))
* reset filter should be 100% width ([fa84687](https://github.com/felix-berlin/berliner-schnauze/commit/fa84687b85173d41297ea79cc9939e11fbf49c2b))
* **scrollbar:** colors ([d2ca6d3](https://github.com/felix-berlin/berliner-schnauze/commit/d2ca6d3b8f935af46a8cbef1d64bd941bee107c4))
* **searchbar:** styles ([fe9737c](https://github.com/felix-berlin/berliner-schnauze/commit/fe9737c1244d0b2ae1305079bf95a79d0b9c88b3))
* **single page:** background color - light mode ([d56f817](https://github.com/felix-berlin/berliner-schnauze/commit/d56f8177b53fe4c35021d53d0c52c106b3ed0080))
* **single word:** add missing early return ([e9b989e](https://github.com/felix-berlin/berliner-schnauze/commit/e9b989e4aad8331c2ad29f1b29f03af0f67b56b5))
* **single word:** add missing word of the day indicator ([2ec10c3](https://github.com/felix-berlin/berliner-schnauze/commit/2ec10c3e84130168199eb8a815bf53a4d62ce2fe))
* **single word:** missing prop ([63f35ff](https://github.com/felix-berlin/berliner-schnauze/commit/63f35ff38bf8712637cd9c0f088fa5585b510385))
* **single word:** related words was coursing errors ([117561d](https://github.com/felix-berlin/berliner-schnauze/commit/117561dded37160e5eb8cccb3820968767f7908e))
* style app install in menu like link ([7f07a62](https://github.com/felix-berlin/berliner-schnauze/commit/7f07a62986d2521cb15b6c47f477f2842f5f15e1))
* switch styles ([cd3f7da](https://github.com/felix-berlin/berliner-schnauze/commit/cd3f7da396033a9903c86d684ea7ed569865bd76))
* ts type ([55359b8](https://github.com/felix-berlin/berliner-schnauze/commit/55359b83e6473745e55d6b94a7452c757c2675fb))
* typo in tag ([f963a37](https://github.com/felix-berlin/berliner-schnauze/commit/f963a372a60745ee7638f3e7106c53435da56c61))
* vue 3.4 update related build issues ([d8a0977](https://github.com/felix-berlin/berliner-schnauze/commit/d8a0977324be3d13126826167f8eacdf79c3460a))
* **word search list:** broken grid when only one word ([c64fff2](https://github.com/felix-berlin/berliner-schnauze/commit/c64fff200c52dfdd6a07ebeba6c72c4763c86b7c))
* **word search:** placeholder color ([a5fbbab](https://github.com/felix-berlin/berliner-schnauze/commit/a5fbbabcfa82a842e6357f7a3a1ad83fa976489a))
* **word type filter:** typo ([46ec27b](https://github.com/felix-berlin/berliner-schnauze/commit/46ec27beb5ff5dabb7344a64832db69792e8b5ff))


* Merge pull request #230 from felix-berlin/improvement/new-light-dark-mode ([2be1b3a](https://github.com/felix-berlin/berliner-schnauze/commit/2be1b3a17ab0724c37b507ee1f857b310f6630ec)), closes [#230](https://github.com/felix-berlin/berliner-schnauze/issues/230)


### Features

* add active filter indicator ([160016e](https://github.com/felix-berlin/berliner-schnauze/commit/160016e40737d130d84f32fb835c019631dfc900))
* add basic dropdown popover component ([1e420cf](https://github.com/felix-berlin/berliner-schnauze/commit/1e420cf202b3001f86491e66a2e89e6f84ccfb17))
* add basic toast styles ([d79a49a](https://github.com/felix-berlin/berliner-schnauze/commit/d79a49ae777468557660e1e39f234fb5a1c86ce3))
* add berolinimus filter ([b00e6dc](https://github.com/felix-berlin/berliner-schnauze/commit/b00e6dca854be0fc183eadb4e9c969a7dc0f6d36))
* add berolinismus switch component ([16973a2](https://github.com/felix-berlin/berliner-schnauze/commit/16973a2cae081a8ce533afbfd3a68b98e295b27e))
* add breadcrumbs ([17c6413](https://github.com/felix-berlin/berliner-schnauze/commit/17c64131df65cad9203659775a72f12e2d9edfd6))
* add button disabled styles ([993fa08](https://github.com/felix-berlin/berliner-schnauze/commit/993fa089cb4c959f358e28d36fe648dd43029bf9))
* add button hover style + filter active state style ([2b7fac5](https://github.com/felix-berlin/berliner-schnauze/commit/2b7fac54a529f13a0ac2654356866a17a8c6bca0))
* add cursor styles when click outside is active ([ea4921b](https://github.com/felix-berlin/berliner-schnauze/commit/ea4921baf00a7a9dacfb1e988867392e25acb87b))
* add date order functions ([c4e1e3a](https://github.com/felix-berlin/berliner-schnauze/commit/c4e1e3a41812fa648d59ad05badf7821b441bedf))
* add install app to footer ([f4ff3dd](https://github.com/felix-berlin/berliner-schnauze/commit/f4ff3dde999b20e394f10c8a2b155acb9923a893))
* add InstallApp ([9b18cdf](https://github.com/felix-berlin/berliner-schnauze/commit/9b18cdffa7f868afa1b931896f2fdff404d76cfc))
* add letter spacing ([887d7a6](https://github.com/felix-berlin/berliner-schnauze/commit/887d7a6947fc9f2bcffcb7a809a084dfada9d222))
* add multiselect dark mode styles ([37a2bcb](https://github.com/felix-berlin/berliner-schnauze/commit/37a2bcb9ae94b2858c02017cb4716bcc0cd38367))
* add NavList component + refactor style main files + update light theme ([b88f59e](https://github.com/felix-berlin/berliner-schnauze/commit/b88f59ed3f8a7e7329ca3598cce14206e6f8ca35))
* add new fact ([c84aed0](https://github.com/felix-berlin/berliner-schnauze/commit/c84aed04dbeed1c1fdb56de73c13bce9b10f56cf))
* add new footer navs ([aaf1318](https://github.com/felix-berlin/berliner-schnauze/commit/aaf13181f31c3b4e98dfc52fd1682e984b7163e5))
* add new image reset ([25417e9](https://github.com/felix-berlin/berliner-schnauze/commit/25417e90ffa98f138bfc602de4f0caf33db3a305))
* add new word type filter and new layout for the search list ([8bf412f](https://github.com/felix-berlin/berliner-schnauze/commit/8bf412f554d6c3ec6b0455643df5863cc377738e))
* add options button to single pages ([06bfffa](https://github.com/felix-berlin/berliner-schnauze/commit/06bfffa4621ef2aaf0bdf4d0c73dd28e80aebc6a))
* add reset all button ([fb3a66d](https://github.com/felix-berlin/berliner-schnauze/commit/fb3a66d56499299120b61814a3885749e3bd4174))
* add result count ([1fcb156](https://github.com/felix-berlin/berliner-schnauze/commit/1fcb156583ef90a3cf65e9d30dc2d1e7daa930d7))
* add search markup ([46c12a8](https://github.com/felix-berlin/berliner-schnauze/commit/46c12a8810c53d0b72833115e436e2a10f32565f))
* add sort oder select component ([5c5711f](https://github.com/felix-berlin/berliner-schnauze/commit/5c5711f049fe22057a0d3f6769847dc0803c277d))
* add toast notify component ([0cb5f8d](https://github.com/felix-berlin/berliner-schnauze/commit/0cb5f8d6a77a98275026b9035b3c4cd03a5436e8))
* add turnstile ([9971e72](https://github.com/felix-berlin/berliner-schnauze/commit/9971e723d4317aa8223852bef00c0ad4292363aa))
* add view transition to WordSearchList ([b858421](https://github.com/felix-berlin/berliner-schnauze/commit/b8584218a7846d0a2997b7399b1dd9c4073359a5))
* add word type layout; uniform style for filter active state ([be20287](https://github.com/felix-berlin/berliner-schnauze/commit/be20287efc434cfa47a1ca89a1d1caeaad34fef4))
* apply custom scrollbar styles to every element ([0fa6bd7](https://github.com/felix-berlin/berliner-schnauze/commit/0fa6bd7e48fb1ed42bb08a9b798293f74dfc80ba))
* **badge:** add component ([6f4a073](https://github.com/felix-berlin/berliner-schnauze/commit/6f4a073202f3fd712ee49639d9aba80038a62195))
* basic toggle filter sidebar ([63b09a7](https://github.com/felix-berlin/berliner-schnauze/commit/63b09a7d4837d74511b9b98677de872d84947df5))
* **button:** active filter styles ([631e2e2](https://github.com/felix-berlin/berliner-schnauze/commit/631e2e29794ed5ca7c5c1d8010377f849a54d862))
* **dark mode:** new dark mode theme ([16437ee](https://github.com/felix-berlin/berliner-schnauze/commit/16437eecf7e69ece826ed4b48a4defdeb8b5bf0b))
* display images with caption ([334c2ef](https://github.com/felix-berlin/berliner-schnauze/commit/334c2efe06499db1f365a5a0259a5ba8b32b7e7a))
* display new search list ([a20d7a4](https://github.com/felix-berlin/berliner-schnauze/commit/a20d7a4c3b727636fcab42ed5ebdb40092e66ac8))
* filter aside add box shadow (mobile) ([efeecf5](https://github.com/felix-berlin/berliner-schnauze/commit/efeecf529f336e70af625828599b51ee57c1a186))
* **filter search:** better spacing + layout improvements ([2004b30](https://github.com/felix-berlin/berliner-schnauze/commit/2004b3042fdf6cc6d67f1f64cd0cb3e80790957e))
* first toast on top ([afa90c4](https://github.com/felix-berlin/berliner-schnauze/commit/afa90c4e1800843a700f5648135bd350d88d220c))
* **footer:** add new dark mode styles ([13d7ee9](https://github.com/felix-berlin/berliner-schnauze/commit/13d7ee98e4ad9c50743fd8479bee45ead152cd90))
* **letter filter:** dark-mode styles ([8b931e2](https://github.com/felix-berlin/berliner-schnauze/commit/8b931e2348760bc4b929c1515072e2cdb7702006))
* move word option dropdown in its own component ([e5c44c9](https://github.com/felix-berlin/berliner-schnauze/commit/e5c44c92feca54daefc26ad757841d1f1a363cf7))
* new dark modes colors for single page elements ([d381c47](https://github.com/felix-berlin/berliner-schnauze/commit/d381c4730352414af10e30471021cd1d915cd636))
* **single word:** add wiki media images and display alternative words ([3f219a6](https://github.com/felix-berlin/berliner-schnauze/commit/3f219a6d2ad9d51fcc21d41497457fbd15ff01e7))
* **single word:** limit sizes ([3303fb3](https://github.com/felix-berlin/berliner-schnauze/commit/3303fb39f248f21ae5d6a4e855203c2a2aaab8c7))
* **single word:** use preferred images ([96c6410](https://github.com/felix-berlin/berliner-schnauze/commit/96c641091a29bae90c4899cb72b528c6ee9e11c6))
* style footer install app ([8345109](https://github.com/felix-berlin/berliner-schnauze/commit/8345109e6148bf41af7ca39aae37f446c996e95f))
* **suggest word form:** add toast + fix turnstile spacing ([4eb5a7f](https://github.com/felix-berlin/berliner-schnauze/commit/4eb5a7f6ba4a4dc9c52bd96befcc0c70f1defba6))
* **ToastNotify:** improve API & fix leave animation ([c037bc7](https://github.com/felix-berlin/berliner-schnauze/commit/c037bc72e607610cf9b3ee1f89aba120c2a66373))
* upgrade to astro v4 ([47b9c38](https://github.com/felix-berlin/berliner-schnauze/commit/47b9c38aec7653b3155697ac6e3826b3f000f782))
* **word filter:** add close button ([9f1e780](https://github.com/felix-berlin/berliner-schnauze/commit/9f1e780a4168874d725ac82b5fd1d33b7850f9ba))
* **word filter:** improve toggle logic and add slide animation ([d800b0d](https://github.com/felix-berlin/berliner-schnauze/commit/d800b0dbde620903db507438737ea9e8491e845b))
* **word list:** remove examples ([87d80e7](https://github.com/felix-berlin/berliner-schnauze/commit/87d80e7010cf3788307d26d793c64e82bc49cecc))
* wrapper search with <search> ([3c64e32](https://github.com/felix-berlin/berliner-schnauze/commit/3c64e32a4d922809727ee6892da206c7d77130c8))


### Performance Improvements

* color mode toggle remove template ([a9984f1](https://github.com/felix-berlin/berliner-schnauze/commit/a9984f1c5422bc1ea4f43b7b832e504197410992))
* load search modal client load ([fa7da86](https://github.com/felix-berlin/berliner-schnauze/commit/fa7da86640062333999a7a30d7d0b7965c1c71a1))
* remove breakpoint ([0544f26](https://github.com/felix-berlin/berliner-schnauze/commit/0544f26be785b2312e68cff73a113d131cbbf1b3))
* set better loop keys ([48324d2](https://github.com/felix-berlin/berliner-schnauze/commit/48324d25719bb56450d5c5234e837df6a41085ce))
* **single word:** add optional avif ([f475945](https://github.com/felix-berlin/berliner-schnauze/commit/f475945b4fd6f64cbd66957748c7766bcb6a8b3d))
* use fluid font size instead of breakpoint ([f581cb0](https://github.com/felix-berlin/berliner-schnauze/commit/f581cb01c99bf0dc281973ebf6e6044393b5085d))


### BREAKING CHANGES

* new light and dark mode (further new features and changes, see changelog)

## [2.3.1](https://github.com/felix-berlin/berliner-schnauze/compare/v2.3.0...v2.3.1) (2023-11-24)


### Bug Fixes

* mostly all type error ([bf42d5e](https://github.com/felix-berlin/berliner-schnauze/commit/bf42d5e54b32118821a09c26ee5beb900fc95b44))
* **single page:** load and render missing data ([e4a646c](https://github.com/felix-berlin/berliner-schnauze/commit/e4a646c8073f88463059a875ebf5a37069608916))
* **WordOfTheDay:** show error message when fetch fails ([bc74772](https://github.com/felix-berlin/berliner-schnauze/commit/bc74772465aa2df3a7ae31f94ebfa976324544ae))

# [2.3.0](https://github.com/felix-berlin/berliner-schnauze/compare/v2.2.0...v2.3.0) (2023-11-23)


### Bug Fixes

* **word-group:** display list in line with group headline ([b06b6b1](https://github.com/felix-berlin/berliner-schnauze/commit/b06b6b1ca4444b984aced55843c062076deaf20c))


### Features

* **single-word:** add NavigateBack component button ([0a7c950](https://github.com/felix-berlin/berliner-schnauze/commit/0a7c950a37eaf2664a4ed2a26b005ee092dd189f))
* **word-index:** add styling ([6158893](https://github.com/felix-berlin/berliner-schnauze/commit/615889377c19121fd694e20e231137d77f9c1aae))
* **word-index:** create index page with all words ([223fd2a](https://github.com/felix-berlin/berliner-schnauze/commit/223fd2a879dba9420427a6303a4a9f5075032707))

# [2.2.0](https://github.com/felix-berlin/berliner-schnauze/compare/v2.1.2...v2.2.0) (2023-11-23)


### Features

* add pwa config ([b37a861](https://github.com/felix-berlin/berliner-schnauze/commit/b37a861d97fc192715bcce82a3ec2b4992e654f5))
* **pwa:** add describtion ([6057130](https://github.com/felix-berlin/berliner-schnauze/commit/60571306936309751183af338c182eb4ea58d5f4))
* **pwa:** add missing favicons ([54e29c3](https://github.com/felix-berlin/berliner-schnauze/commit/54e29c3cbd07ab12a1cc18710c767c9a9f5b028d))
* **pwa:** add more icons, screenshots and colors ([bfa2dd2](https://github.com/felix-berlin/berliner-schnauze/commit/bfa2dd282984395d72ca1ddc51c53e0138701579))

## [2.1.2](https://github.com/felix-berlin/berliner-schnauze/compare/v2.1.1...v2.1.2) (2023-11-23)


### Bug Fixes

* meta title and add cononical ([3ac19e8](https://github.com/felix-berlin/berliner-schnauze/commit/3ac19e89761a76497357dcdf7c99917a3648ca0e))
* **style:** imports ([ad45fcf](https://github.com/felix-berlin/berliner-schnauze/commit/ad45fcfd92b91f3b893ca6d6baf1286256ed6a8a))

## [2.1.1](https://github.com/felix-berlin/berliner-schnauze/compare/v2.1.0...v2.1.1) (2023-11-19)


### Bug Fixes

* add  missing auth headers ([a431fb9](https://github.com/felix-berlin/berliner-schnauze/commit/a431fb9c57232c384ceae8bc0aa21b0ff4776df8))

# [2.1.0](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.6...v2.1.0) (2023-11-19)


### Features

* add jwt auth ([5c519d1](https://github.com/felix-berlin/berliner-schnauze/commit/5c519d1bb511a40e837d4620168e27fbb61f0793))

## [2.0.6](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.5...v2.0.6) (2023-11-19)


### Bug Fixes

* hopefully fix hydration error ([9e48060](https://github.com/felix-berlin/berliner-schnauze/commit/9e48060957d36d3890cf8d58aa3456f34491b4f8))

## [2.0.5](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.4...v2.0.5) (2023-11-19)


### Bug Fixes

* a11y issues ([7f055cb](https://github.com/felix-berlin/berliner-schnauze/commit/7f055cbc4b69adc256a55e63780a21bf6cff15c9))

## [2.0.4](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.3...v2.0.4) (2023-11-19)


### Bug Fixes

* **SingleWord:** wrong props ([277d2a8](https://github.com/felix-berlin/berliner-schnauze/commit/277d2a8d340aa9db20d65d0f4d5829b257209709))

## [2.0.3](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.2...v2.0.3) (2023-11-19)


### Bug Fixes

* **MainMenu:** missing mobile menu icon ([4ffc29e](https://github.com/felix-berlin/berliner-schnauze/commit/4ffc29e9fb37c1f9b398ffabf49d6213ebd5529d))

## [2.0.2](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.1...v2.0.2) (2023-11-18)


### Bug Fixes

* **WordList:** render issues ([e540b4d](https://github.com/felix-berlin/berliner-schnauze/commit/e540b4d2b53f54514e61b4b9c87ad8361cbf5ca5))

## [2.0.1](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0...v2.0.1) (2023-11-18)


### Performance Improvements

* load more vertical icon as background image ([ef22697](https://github.com/felix-berlin/berliner-schnauze/commit/ef226970f82b18c94d0141f66fbc7ce92292f6d8))
* minimize buffer size ([2e70488](https://github.com/felix-berlin/berliner-schnauze/commit/2e70488939e0164a624c973215b5cdce6b479982))
* performance-optimizations ([66b8af9](https://github.com/felix-berlin/berliner-schnauze/commit/66b8af95a2d2562f498241b609051efe0032d826))
* **WordList:** activate page-mode ([b4fa392](https://github.com/felix-berlin/berliner-schnauze/commit/b4fa3922df2ccbb38cab3028e932ca6befbf65c1))
* **WordOfTheDay:** from vue only to load ([6144c50](https://github.com/felix-berlin/berliner-schnauze/commit/6144c50d992b4eb04de401ed1eeae32aff1eba2d))
* **WordSearchList:** from vue only to load ([fe61119](https://github.com/felix-berlin/berliner-schnauze/commit/fe611195facd2d6c8eb30f8dd67135fbabb3769c))
* **WordSearchList:** move back to client only ([67f1b21](https://github.com/felix-berlin/berliner-schnauze/commit/67f1b21518f30c35bb48c62f84c7fe882762727c))

# [2.0.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.5...v2.0.0) (2023-11-18)


### Bug Fixes

* add missing modal styles ([641148f](https://github.com/felix-berlin/berliner-schnauze/commit/641148f5ed971e03d8eaad924aaa48adbf74e32d))
* close modal after transition ([c7222cb](https://github.com/felix-berlin/berliner-schnauze/commit/c7222cbb312cd6c6b9d628a4533cdd1ca7e3d769))
* current filter highlight ([4746b79](https://github.com/felix-berlin/berliner-schnauze/commit/4746b79eb723073a683e2df745dba00e4058c15f))
* **deps:** update ([ace6dfe](https://github.com/felix-berlin/berliner-schnauze/commit/ace6dfe4ba771cf8df86eb4c6b480ef98a4e2343))
* footer links ([4b9b7bc](https://github.com/felix-berlin/berliner-schnauze/commit/4b9b7bc487ae26d59e96d4d33bd5faa23b1be64b))
* hide large searchbar on mobile ([2f07b1c](https://github.com/felix-berlin/berliner-schnauze/commit/2f07b1cdea57a517e436f3540cd6847c1f2bf57b))
* **index:** spacing issues ([18a8c57](https://github.com/felix-berlin/berliner-schnauze/commit/18a8c57b960c56716e85ceb80cb687963545782b))
* main grid ([fb33248](https://github.com/felix-berlin/berliner-schnauze/commit/fb3324898a80db8716a74a05144b703ba0a7b408))
* main header child compont persist ([46c7e06](https://github.com/felix-berlin/berliner-schnauze/commit/46c7e065f7ae325ca4063fe400d37d32462ac53a))
* release action ([3bff8d7](https://github.com/felix-berlin/berliner-schnauze/commit/3bff8d7984201f2bf3162abf17f82d6fefadb3be))
* remove unused props ([358d73a](https://github.com/felix-berlin/berliner-schnauze/commit/358d73a0b32dd99e9a449dcdc32268ef4f83cc23))
* render word in html doc ([a61d9cc](https://github.com/felix-berlin/berliner-schnauze/commit/a61d9ccc778921ab61bf01f00bc653aecea3b6e6))
* replace to with href ([75ddbf0](https://github.com/felix-berlin/berliner-schnauze/commit/75ddbf0de2fad197e17443f49465f1d285d31c2b))
* ScrollToTop ([c93e1a5](https://github.com/felix-berlin/berliner-schnauze/commit/c93e1a5664b03909e99a83ce0f6c3cd7a4db2d16))
* SingleWord bgc ([13aead5](https://github.com/felix-berlin/berliner-schnauze/commit/13aead538677a8090dec073c69e8999375bfb609))
* suggest form ([ede4f97](https://github.com/felix-berlin/berliner-schnauze/commit/ede4f97a1e009bbee528a99c392c00518040eb91))
* url ([bc13f9a](https://github.com/felix-berlin/berliner-schnauze/commit/bc13f9a9efbe1091f793a942b8c7583811594732))
* whitespace ([72e1436](https://github.com/felix-berlin/berliner-schnauze/commit/72e14360afb50db8ba641cd4081feb63aecb1661))
* **WordOfTheDay:** type errors and a11y issues ([54e1609](https://github.com/felix-berlin/berliner-schnauze/commit/54e160999fe14c31d62701500c22d5bd2c50ebea))
* **WordSearch:** missing wordGroup ([21ea2c1](https://github.com/felix-berlin/berliner-schnauze/commit/21ea2c19f8a7bcb3f1eeef1fff9f85d036472ed3))


### Features

* add default layout and main footer ([d870a40](https://github.com/felix-berlin/berliner-schnauze/commit/d870a40cb59357de8fbdab6ecd6235f94fabf0dc))
* add favicons ([57dd649](https://github.com/felix-berlin/berliner-schnauze/commit/57dd6491a359555e8af21b18005905e1d6fb3aad))
* add fonts ([89d9686](https://github.com/felix-berlin/berliner-schnauze/commit/89d9686bb1af85e6fe4de9719d1bc11c0b31c768))
* add footer and missing images ([1c90d04](https://github.com/felix-berlin/berliner-schnauze/commit/1c90d0454df86e5c15b1cfd7df73b051a064906c))
* add imprint and index page; add gutenbergBlock component ([31f3b78](https://github.com/felix-berlin/berliner-schnauze/commit/31f3b78fc1f72e822b2aaf64102c278b42396828))
* add legal pages ([edfe174](https://github.com/felix-berlin/berliner-schnauze/commit/edfe1742e83b72de2f3e48019fcbe8baf2f58079))
* add Modal, Search and SearchModal ([9bb796d](https://github.com/felix-berlin/berliner-schnauze/commit/9bb796d918316a93310d8d3c87e9a4c691729ade))
* add more elements to single page ([3f614c8](https://github.com/felix-berlin/berliner-schnauze/commit/3f614c8823db4fd1627d1bccb3190fbbe4b8d5bd))
* add oder sorting ([5888b7c](https://github.com/felix-berlin/berliner-schnauze/commit/5888b7c206d8c591dc28322c48c84ed63c4c9fba))
* add order to getAllWords ([53a3fca](https://github.com/felix-berlin/berliner-schnauze/commit/53a3fca39b50c3ad267e45948d4d0f4fef4336d5))
* add own pagefind vars ([80bd9bc](https://github.com/felix-berlin/berliner-schnauze/commit/80bd9bcb8bee1b35a4d681c1246682ec2e01efbf))
* add privacy-policy; add aliases ([5e71fd8](https://github.com/felix-berlin/berliner-schnauze/commit/5e71fd8ed5c9ea844fe3d110067f3405519f05e0))
* add related words ([489b1b3](https://github.com/felix-berlin/berliner-schnauze/commit/489b1b30082c4b55113f5c29dfe684bbf550ce72))
* add WordList ([1d6f932](https://github.com/felix-berlin/berliner-schnauze/commit/1d6f932255c24d3bcd4aa95d8f826080e0016fe4))
* add wort vorschlagen page ([8b60c08](https://github.com/felix-berlin/berliner-schnauze/commit/8b60c0845b474457cb9f471795c5947c0fcdc803))
* combile new components to a functional search ([dbbb9ca](https://github.com/felix-berlin/berliner-schnauze/commit/dbbb9ca257476e9928c4f9625b4efb2f1255906e))
* create word routes ([a99f507](https://github.com/felix-berlin/berliner-schnauze/commit/a99f50792b3dfbbc345fbe07e87d29b1cf4249d4))
* get all the word data ([5f1a64c](https://github.com/felix-berlin/berliner-schnauze/commit/5f1a64c0a1fc2a4a70b42e6ade6a79fb47fd77ea))
* **Main Header:** add Main Components incl. Childs ([aa771e5](https://github.com/felix-berlin/berliner-schnauze/commit/aa771e52a3a3f91c86d817dc9e25e8af779fbaaf))
* migrate Alert and SuggestWordForm from Vue 2 to 3 ([465d6ae](https://github.com/felix-berlin/berliner-schnauze/commit/465d6aec988c04fc0c067e8501a9ed3f6f5876fd))
* migrate all filter components to vue 3 ([ba78d03](https://github.com/felix-berlin/berliner-schnauze/commit/ba78d03a34c5af2e8947e5a2f801b720305ccdda))
* migrate from nuxt 3 beta to astro ([36fdff1](https://github.com/felix-berlin/berliner-schnauze/commit/36fdff1f8b3c40a83b48c0a9e2c7ba83b179d475))
* migrate ScrollToTop ([afbd8d3](https://github.com/felix-berlin/berliner-schnauze/commit/afbd8d3a20306ba74145d5130a5ffe3688e918d1))
* migrate vuex store to pinia ([4a27d2d](https://github.com/felix-berlin/berliner-schnauze/commit/4a27d2d02057db93d71843d080bfe9fe80750f8c))
* migrate WordOfTheDay and Child Components ([eb73c75](https://github.com/felix-berlin/berliner-schnauze/commit/eb73c75ffdbd76111d06a6b815a646c08cfb1efc))
* move all word search logic to nano stores + update components ([408a2b7](https://github.com/felix-berlin/berliner-schnauze/commit/408a2b76169d022d79ac22ae9999b3a5a714e375))
* next major release, migration to Astro and Vue 3 ([e229f36](https://github.com/felix-berlin/berliner-schnauze/commit/e229f369671e53fc34300d60e4e7367ba687dacc))
* **nuxt:** del nuxt 2 project & add nuxt nuxt 3 ([8709e79](https://github.com/felix-berlin/berliner-schnauze/commit/8709e7956ffbcba57e057aa48af848ed9578c802))
* **plugins:** add plugins ([2705029](https://github.com/felix-berlin/berliner-schnauze/commit/2705029ee8dc2c94ecf1448e2dd26b3f22276edb))
* port the styles ([a25d387](https://github.com/felix-berlin/berliner-schnauze/commit/a25d387824d60fd96eadb8d866639fc1a56b7b96))
* readd reset function ([4f12685](https://github.com/felix-berlin/berliner-schnauze/commit/4f1268565ff94696c69f4259051f2135765629c0))
* remove mobile only icon ([c7f4a43](https://github.com/felix-berlin/berliner-schnauze/commit/c7f4a43a156d14ff4d23cf0470e921f28d128abb))
* save the search in local storage ([39dd215](https://github.com/felix-berlin/berliner-schnauze/commit/39dd215fbc20c8edd9b7c467bc829c1d4786ac45))
* **searchbar:** limit width & chg border color ([222ffb4](https://github.com/felix-berlin/berliner-schnauze/commit/222ffb4cd74c0ef8b940869222571512c9fd7d46))
* start rebuilding the single page template ([50157f2](https://github.com/felix-berlin/berliner-schnauze/commit/50157f241f3a404915548028bbcd6bd64a25c4d5))
* start working on SingleWord ([1880d55](https://github.com/felix-berlin/berliner-schnauze/commit/1880d559ed534786190b21911195d80670235b27))
* **SuggestWordForm:** add types ([cfca507](https://github.com/felix-berlin/berliner-schnauze/commit/cfca50759d3920f65fb03e529f94ad9b8eba43d9))
* update seo meta fields ([02645a7](https://github.com/felix-berlin/berliner-schnauze/commit/02645a75f54fc9bd99c0a9dd9f43b9594a8098f7))
* **WordList:** remove page mode ([a266f37](https://github.com/felix-berlin/berliner-schnauze/commit/a266f37c3b98566044db88b02762ea7445c77bdc))
* **WordSearch:** persist all data ([155b5fe](https://github.com/felix-berlin/berliner-schnauze/commit/155b5fe7d7128ad881b10cb3915a208add121abf))


### Performance Improvements

* create letter group server side ([20d3b2b](https://github.com/felix-berlin/berliner-schnauze/commit/20d3b2bb5c7031ae429412fdaa9b903bb9b42ebb))


### BREAKING CHANGES

* Migrate from Nuxt 2 and Vue 2 to Astro in combination with Vue 3, Nanostores and Typescript
* **nuxt:** start project from scratch

# [2.0.0-beta.42](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.41...v2.0.0-beta.42) (2023-11-18)


### Bug Fixes

* url ([bc13f9a](https://github.com/felix-berlin/berliner-schnauze/commit/bc13f9a9efbe1091f793a942b8c7583811594732))

# [2.0.0-beta.41](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.40...v2.0.0-beta.41) (2023-11-18)


### Bug Fixes

* replace to with href ([75ddbf0](https://github.com/felix-berlin/berliner-schnauze/commit/75ddbf0de2fad197e17443f49465f1d285d31c2b))

# [2.0.0-beta.40](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.39...v2.0.0-beta.40) (2023-11-18)


### Features

* add related words ([489b1b3](https://github.com/felix-berlin/berliner-schnauze/commit/489b1b30082c4b55113f5c29dfe684bbf550ce72))
* update seo meta fields ([02645a7](https://github.com/felix-berlin/berliner-schnauze/commit/02645a75f54fc9bd99c0a9dd9f43b9594a8098f7))

# [2.0.0-beta.39](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.38...v2.0.0-beta.39) (2023-11-18)


### Features

* **searchbar:** limit width & chg border color ([222ffb4](https://github.com/felix-berlin/berliner-schnauze/commit/222ffb4cd74c0ef8b940869222571512c9fd7d46))

# [2.0.0-beta.38](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.37...v2.0.0-beta.38) (2023-11-18)


### Bug Fixes

* add missing modal styles ([641148f](https://github.com/felix-berlin/berliner-schnauze/commit/641148f5ed971e03d8eaad924aaa48adbf74e32d))
* current filter highlight ([4746b79](https://github.com/felix-berlin/berliner-schnauze/commit/4746b79eb723073a683e2df745dba00e4058c15f))
* footer links ([4b9b7bc](https://github.com/felix-berlin/berliner-schnauze/commit/4b9b7bc487ae26d59e96d4d33bd5faa23b1be64b))
* hide large searchbar on mobile ([2f07b1c](https://github.com/felix-berlin/berliner-schnauze/commit/2f07b1cdea57a517e436f3540cd6847c1f2bf57b))
* ScrollToTop ([c93e1a5](https://github.com/felix-berlin/berliner-schnauze/commit/c93e1a5664b03909e99a83ce0f6c3cd7a4db2d16))


### Features

* add own pagefind vars ([80bd9bc](https://github.com/felix-berlin/berliner-schnauze/commit/80bd9bcb8bee1b35a4d681c1246682ec2e01efbf))
* remove mobile only icon ([c7f4a43](https://github.com/felix-berlin/berliner-schnauze/commit/c7f4a43a156d14ff4d23cf0470e921f28d128abb))

# [2.0.0-beta.37](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.36...v2.0.0-beta.37) (2023-11-17)


### Bug Fixes

* **WordSearch:** missing wordGroup ([21ea2c1](https://github.com/felix-berlin/berliner-schnauze/commit/21ea2c19f8a7bcb3f1eeef1fff9f85d036472ed3))

# [2.0.0-beta.36](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.35...v2.0.0-beta.36) (2023-11-17)


### Performance Improvements

* create letter group server side ([20d3b2b](https://github.com/felix-berlin/berliner-schnauze/commit/20d3b2bb5c7031ae429412fdaa9b903bb9b42ebb))

# [2.0.0-beta.35](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.34...v2.0.0-beta.35) (2023-11-17)


### Bug Fixes

* **index:** spacing issues ([18a8c57](https://github.com/felix-berlin/berliner-schnauze/commit/18a8c57b960c56716e85ceb80cb687963545782b))


### Features

* **WordSearch:** persist all data ([155b5fe](https://github.com/felix-berlin/berliner-schnauze/commit/155b5fe7d7128ad881b10cb3915a208add121abf))

# [2.0.0-beta.34](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.33...v2.0.0-beta.34) (2023-11-17)


### Bug Fixes

* remove unused props ([358d73a](https://github.com/felix-berlin/berliner-schnauze/commit/358d73a0b32dd99e9a449dcdc32268ef4f83cc23))

# [2.0.0-beta.33](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.32...v2.0.0-beta.33) (2023-11-17)


### Features

* add oder sorting ([5888b7c](https://github.com/felix-berlin/berliner-schnauze/commit/5888b7c206d8c591dc28322c48c84ed63c4c9fba))

# [2.0.0-beta.32](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.31...v2.0.0-beta.32) (2023-11-17)


### Features

* move all word search logic to nano stores + update components ([408a2b7](https://github.com/felix-berlin/berliner-schnauze/commit/408a2b76169d022d79ac22ae9999b3a5a714e375))

# [2.0.0-beta.31](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.30...v2.0.0-beta.31) (2023-11-16)


### Features

* migrate all filter components to vue 3 ([ba78d03](https://github.com/felix-berlin/berliner-schnauze/commit/ba78d03a34c5af2e8947e5a2f801b720305ccdda))

# [2.0.0-beta.30](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.29...v2.0.0-beta.30) (2023-11-16)


### Features

* **SuggestWordForm:** add types ([cfca507](https://github.com/felix-berlin/berliner-schnauze/commit/cfca50759d3920f65fb03e529f94ad9b8eba43d9))
* **WordList:** remove page mode ([a266f37](https://github.com/felix-berlin/berliner-schnauze/commit/a266f37c3b98566044db88b02762ea7445c77bdc))

# [2.0.0-beta.29](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.28...v2.0.0-beta.29) (2023-11-16)


### Bug Fixes

* suggest form ([ede4f97](https://github.com/felix-berlin/berliner-schnauze/commit/ede4f97a1e009bbee528a99c392c00518040eb91))

# [2.0.0-beta.28](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.27...v2.0.0-beta.28) (2023-11-16)


### Features

* migrate Alert and SuggestWordForm from Vue 2 to 3 ([465d6ae](https://github.com/felix-berlin/berliner-schnauze/commit/465d6aec988c04fc0c067e8501a9ed3f6f5876fd))

# [2.0.0-beta.27](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.26...v2.0.0-beta.27) (2023-11-15)


### Bug Fixes

* close modal after transition ([c7222cb](https://github.com/felix-berlin/berliner-schnauze/commit/c7222cbb312cd6c6b9d628a4533cdd1ca7e3d769))

# [2.0.0-beta.26](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.25...v2.0.0-beta.26) (2023-11-15)


### Features

* add wort vorschlagen page ([8b60c08](https://github.com/felix-berlin/berliner-schnauze/commit/8b60c0845b474457cb9f471795c5947c0fcdc803))

# [2.0.0-beta.25](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.24...v2.0.0-beta.25) (2023-11-15)


### Features

* add favicons ([57dd649](https://github.com/felix-berlin/berliner-schnauze/commit/57dd6491a359555e8af21b18005905e1d6fb3aad))

# [2.0.0-beta.24](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.23...v2.0.0-beta.24) (2023-11-15)


### Features

* save the search in local storage ([39dd215](https://github.com/felix-berlin/berliner-schnauze/commit/39dd215fbc20c8edd9b7c467bc829c1d4786ac45))

# [2.0.0-beta.23](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.22...v2.0.0-beta.23) (2023-11-15)


### Features

* readd reset function ([4f12685](https://github.com/felix-berlin/berliner-schnauze/commit/4f1268565ff94696c69f4259051f2135765629c0))

# [2.0.0-beta.22](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.21...v2.0.0-beta.22) (2023-11-14)


### Features

* port the styles ([a25d387](https://github.com/felix-berlin/berliner-schnauze/commit/a25d387824d60fd96eadb8d866639fc1a56b7b96))

# [2.0.0-beta.21](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.20...v2.0.0-beta.21) (2023-11-14)


### Features

* add order to getAllWords ([53a3fca](https://github.com/felix-berlin/berliner-schnauze/commit/53a3fca39b50c3ad267e45948d4d0f4fef4336d5))
* combile new components to a functional search ([dbbb9ca](https://github.com/felix-berlin/berliner-schnauze/commit/dbbb9ca257476e9928c4f9625b4efb2f1255906e))

# [2.0.0-beta.20](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.19...v2.0.0-beta.20) (2023-11-13)


### Features

* add WordList ([1d6f932](https://github.com/felix-berlin/berliner-schnauze/commit/1d6f932255c24d3bcd4aa95d8f826080e0016fe4))

# [2.0.0-beta.19](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.18...v2.0.0-beta.19) (2023-11-13)


### Bug Fixes

* SingleWord bgc ([13aead5](https://github.com/felix-berlin/berliner-schnauze/commit/13aead538677a8090dec073c69e8999375bfb609))

# [2.0.0-beta.18](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.17...v2.0.0-beta.18) (2023-11-13)


### Features

* start working on SingleWord ([1880d55](https://github.com/felix-berlin/berliner-schnauze/commit/1880d559ed534786190b21911195d80670235b27))

# [2.0.0-beta.17](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.16...v2.0.0-beta.17) (2023-11-12)


### Bug Fixes

* main grid ([fb33248](https://github.com/felix-berlin/berliner-schnauze/commit/fb3324898a80db8716a74a05144b703ba0a7b408))

# [2.0.0-beta.16](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.15...v2.0.0-beta.16) (2023-11-12)


### Features

* add fonts ([89d9686](https://github.com/felix-berlin/berliner-schnauze/commit/89d9686bb1af85e6fe4de9719d1bc11c0b31c768))

# [2.0.0-beta.15](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.14...v2.0.0-beta.15) (2023-11-12)


### Bug Fixes

* main header child compont persist ([46c7e06](https://github.com/felix-berlin/berliner-schnauze/commit/46c7e065f7ae325ca4063fe400d37d32462ac53a))

# [2.0.0-beta.14](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.13...v2.0.0-beta.14) (2023-11-12)


### Features

* add legal pages ([edfe174](https://github.com/felix-berlin/berliner-schnauze/commit/edfe1742e83b72de2f3e48019fcbe8baf2f58079))

# [2.0.0-beta.13](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.12...v2.0.0-beta.13) (2023-11-12)


### Features

* **Main Header:** add Main Components incl. Childs ([aa771e5](https://github.com/felix-berlin/berliner-schnauze/commit/aa771e52a3a3f91c86d817dc9e25e8af779fbaaf))

# [2.0.0-beta.12](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.11...v2.0.0-beta.12) (2023-11-12)


### Features

* add footer and missing images ([1c90d04](https://github.com/felix-berlin/berliner-schnauze/commit/1c90d0454df86e5c15b1cfd7df73b051a064906c))
* add more elements to single page ([3f614c8](https://github.com/felix-berlin/berliner-schnauze/commit/3f614c8823db4fd1627d1bccb3190fbbe4b8d5bd))

# [2.0.0-beta.11](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.10...v2.0.0-beta.11) (2023-11-12)


### Bug Fixes

* **WordOfTheDay:** type errors and a11y issues ([54e1609](https://github.com/felix-berlin/berliner-schnauze/commit/54e160999fe14c31d62701500c22d5bd2c50ebea))


### Features

* migrate ScrollToTop ([afbd8d3](https://github.com/felix-berlin/berliner-schnauze/commit/afbd8d3a20306ba74145d5130a5ffe3688e918d1))
* start rebuilding the single page template ([50157f2](https://github.com/felix-berlin/berliner-schnauze/commit/50157f241f3a404915548028bbcd6bd64a25c4d5))

# [2.0.0-beta.10](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.9...v2.0.0-beta.10) (2023-11-12)


### Bug Fixes

* whitespace ([72e1436](https://github.com/felix-berlin/berliner-schnauze/commit/72e14360afb50db8ba641cd4081feb63aecb1661))

# [2.0.0-beta.9](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.8...v2.0.0-beta.9) (2023-11-12)


### Features

* migrate WordOfTheDay and Child Components ([eb73c75](https://github.com/felix-berlin/berliner-schnauze/commit/eb73c75ffdbd76111d06a6b815a646c08cfb1efc))

# [2.0.0-beta.8](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.7...v2.0.0-beta.8) (2023-11-11)


### Features

* get all the word data ([5f1a64c](https://github.com/felix-berlin/berliner-schnauze/commit/5f1a64c0a1fc2a4a70b42e6ade6a79fb47fd77ea))

# [2.0.0-beta.7](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.6...v2.0.0-beta.7) (2023-11-11)


### Bug Fixes

* render word in html doc ([a61d9cc](https://github.com/felix-berlin/berliner-schnauze/commit/a61d9ccc778921ab61bf01f00bc653aecea3b6e6))

# [2.0.0-beta.6](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.5...v2.0.0-beta.6) (2023-11-11)


### Bug Fixes

* release action ([3bff8d7](https://github.com/felix-berlin/berliner-schnauze/commit/3bff8d7984201f2bf3162abf17f82d6fefadb3be))


### Features

* add Modal, Search and SearchModal ([9bb796d](https://github.com/felix-berlin/berliner-schnauze/commit/9bb796d918316a93310d8d3c87e9a4c691729ade))
* create word routes ([a99f507](https://github.com/felix-berlin/berliner-schnauze/commit/a99f50792b3dfbbc345fbe07e87d29b1cf4249d4))
* migrate from nuxt 3 beta to astro ([36fdff1](https://github.com/felix-berlin/berliner-schnauze/commit/36fdff1f8b3c40a83b48c0a9e2c7ba83b179d475))

# [2.0.0-beta.5](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.4...v2.0.0-beta.5) (2023-03-19)


### Features

* add default layout and main footer ([d870a40](https://github.com/felix-berlin/berliner-schnauze/commit/d870a40cb59357de8fbdab6ecd6235f94fabf0dc))

# [2.0.0-beta.4](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.3...v2.0.0-beta.4) (2023-03-19)


### Features

* add privacy-policy; add aliases ([5e71fd8](https://github.com/felix-berlin/berliner-schnauze/commit/5e71fd8ed5c9ea844fe3d110067f3405519f05e0))

# [2.0.0-beta.3](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.2...v2.0.0-beta.3) (2023-03-19)


### Features

* migrate vuex store to pinia ([4a27d2d](https://github.com/felix-berlin/berliner-schnauze/commit/4a27d2d02057db93d71843d080bfe9fe80750f8c))
* **plugins:** add plugins ([2705029](https://github.com/felix-berlin/berliner-schnauze/commit/2705029ee8dc2c94ecf1448e2dd26b3f22276edb))

# [2.0.0-beta.2](https://github.com/felix-berlin/berliner-schnauze/compare/v2.0.0-beta.1...v2.0.0-beta.2) (2023-03-19)


### Bug Fixes

* **deps:** update ([ace6dfe](https://github.com/felix-berlin/berliner-schnauze/commit/ace6dfe4ba771cf8df86eb4c6b480ef98a4e2343))


### Features

* add imprint and index page; add gutenbergBlock component ([31f3b78](https://github.com/felix-berlin/berliner-schnauze/commit/31f3b78fc1f72e822b2aaf64102c278b42396828))

# [2.0.0-beta.1](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.5...v2.0.0-beta.1) (2023-03-17)


### Features

* **nuxt:** del nuxt 2 project & add nuxt nuxt 3 ([8709e79](https://github.com/felix-berlin/berliner-schnauze/commit/8709e7956ffbcba57e057aa48af848ed9578c802))


### BREAKING CHANGES

* **nuxt:** start project from scratch

## [1.20.5](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.4...v1.20.5) (2022-08-27)


### Performance Improvements

* load header and footer in main file ([926ae50](https://github.com/felix-berlin/berliner-schnauze/commit/926ae504466dd2221975ab00575d8dc80b26c8e8))

## [1.20.4](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.3...v1.20.4) (2022-08-27)


### Performance Improvements

* exstract css to files ([9d8d4dc](https://github.com/felix-berlin/berliner-schnauze/commit/9d8d4dcde630d7c1c9c41020b22ad9f65bf262b2))

## [1.20.3](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.2...v1.20.3) (2022-08-27)


### Bug Fixes

* js config & use of lucide vue ([75c5458](https://github.com/felix-berlin/berliner-schnauze/commit/75c54586b25c070fddb5de752f4f6b5a9934afe8))


### Performance Improvements

* load styles inside components ([027c1ff](https://github.com/felix-berlin/berliner-schnauze/commit/027c1ff6c1d84e7b05ef149e57b5d4bd885a7ee3))

## [1.20.2](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.1...v1.20.2) (2022-07-30)


### Bug Fixes

* axios import in nuxt.config ([347059f](https://github.com/felix-berlin/berliner-schnauze/commit/347059fabed0f4404e72918ab85df563a9ac3d62))
* nuxt build finished but did not exit after 5s ([a25e79e](https://github.com/felix-berlin/berliner-schnauze/commit/a25e79e575bd23d397cf42dddc3d4eeb010244b9))

## [1.20.1](https://github.com/felix-berlin/berliner-schnauze/compare/v1.20.0...v1.20.1) (2022-07-27)


### Bug Fixes

* **error page:** static error pages ([7c9dd78](https://github.com/felix-berlin/berliner-schnauze/commit/7c9dd78df24597053a033b8616df6ea733754ee9))

# [1.20.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.19.0...v1.20.0) (2022-07-22)


### Bug Fixes

* **reserved component names:** import icons via alias ([d4dfcf2](https://github.com/felix-berlin/berliner-schnauze/commit/d4dfcf210eacb1fecb0632caf792fea5081c98a3))


### Features

* **header menu:** add report bug link to github issue ([9fb6476](https://github.com/felix-berlin/berliner-schnauze/commit/9fb647671383fa7668c73938ccf2b2c9184c3488))

# [1.19.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.18.3...v1.19.0) (2022-07-18)


### Features

* **letter filter:** save and restore letter filter from local storage ([7923bdd](https://github.com/felix-berlin/berliner-schnauze/commit/7923bdd3034b20636aaa7f0797c471425862a272))
* **search words:** save and restore word search from local storage ([a5811f6](https://github.com/felix-berlin/berliner-schnauze/commit/a5811f64db4b28ae1127baaef4ff86352a501880))

## [1.18.3](https://github.com/felix-berlin/berliner-schnauze/compare/v1.18.2...v1.18.3) (2022-07-18)


### Bug Fixes

* **word of the day:** add missing Promise ([be294e0](https://github.com/felix-berlin/berliner-schnauze/commit/be294e03955cc28173b6f51a370f256319d874fa))
* **word of the day:** caching condition ([4672ca7](https://github.com/felix-berlin/berliner-schnauze/commit/4672ca7ec4a656a041de08154824ea32d2d910e2))
* **word of the day:** condition before init func ([f21894d](https://github.com/felix-berlin/berliner-schnauze/commit/f21894d08636fc007a5caa160ddcb6234b0f74ea))
* **word of the day:** not load when caching active ([c098b6c](https://github.com/felix-berlin/berliner-schnauze/commit/c098b6c6dc32ed721bb83ba330f27a20ba5ede8b))
* **word search:** it is no longer possible to have a active empty search when switching to a single page ([6a7c63d](https://github.com/felix-berlin/berliner-schnauze/commit/6a7c63d251c6aff6ce907531a4e214a75ebea8d2))


### Performance Improvements

* **word of the day:** cache first fetch ([4e3392b](https://github.com/felix-berlin/berliner-schnauze/commit/4e3392bc7f87ec5913794f7c9c5dc8ba5795abda))

## [1.18.2](https://github.com/felix-berlin/berliner-schnauze/compare/v1.18.1...v1.18.2) (2022-07-17)


### Bug Fixes

* image dimentions for all sizes ([da9b678](https://github.com/felix-berlin/berliner-schnauze/commit/da9b678558a3e93fc758fe18bbf4223fe03e7d22))

## [1.18.1](https://github.com/felix-berlin/berliner-schnauze/compare/v1.18.0...v1.18.1) (2022-07-17)


### Bug Fixes

* mobile image sizes ([47df193](https://github.com/felix-berlin/berliner-schnauze/commit/47df1933bf08b7c23a10665953593615101348dd))

# [1.18.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.17.0...v1.18.0) (2022-07-17)


### Features

* **random word button:** add random word button as last element in related words component ([7427701](https://github.com/felix-berlin/berliner-schnauze/commit/7427701b7b1262febc39b907697108ff6a0f4aed))

# [1.17.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.16.0...v1.17.0) (2022-07-17)


### Bug Fixes

* Safari Date() format ([b8846ed](https://github.com/felix-berlin/berliner-schnauze/commit/b8846ed08ac5ab55897b220d70e2186a71ff15ae))


### Features

* **header:** menu icon transition ([d68963f](https://github.com/felix-berlin/berliner-schnauze/commit/d68963f027b8f9bc0798838421723d7da634decb))
* **related post:** add related words component to single word page ([be00a84](https://github.com/felix-berlin/berliner-schnauze/commit/be00a84b1a772012c8d2c879407505b17fe31af5))

# [1.16.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.15.0...v1.16.0) (2022-07-16)


### Features

* **robots.txt:** add sitemap URL ([9cb0b64](https://github.com/felix-berlin/berliner-schnauze/commit/9cb0b6427017d48819a1b3dc12952bf598b67e17))

# [1.15.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.6...v1.15.0) (2022-07-16)


### Bug Fixes

* **button:** wrong color on active state ([c6d6d63](https://github.com/felix-berlin/berliner-schnauze/commit/c6d6d63f82437280987a8bbd5ee4158cb387dec0))
* **color mode button:** remove transition ([04eb60d](https://github.com/felix-berlin/berliner-schnauze/commit/04eb60d62bd91e22aac4b0793f873f6b754a1502))
* **color-mode-button:** Mismatching childNodes unsing transition-group ([02f2581](https://github.com/felix-berlin/berliner-schnauze/commit/02f2581daf1d63a03b6770144314d9a8f69cf561))


### Features

* **index:** removed desktop letter filter ([dc2be6c](https://github.com/felix-berlin/berliner-schnauze/commit/dc2be6c0fe8a219a4865b73c49ddf4109435ed23))
* **search words:** aria label reacts on state ([a5a826c](https://github.com/felix-berlin/berliner-schnauze/commit/a5a826c856d7c420b27797f3b770967f32a0f5e8))
* **sort word direction toggle:** add to index + styling ([b85138d](https://github.com/felix-berlin/berliner-schnauze/commit/b85138d951f3d0d4d66d7d4b64879958bc119fc4))
* **sort word direction:** add sort function to the general filter function ([f415d2d](https://github.com/felix-berlin/berliner-schnauze/commit/f415d2d9c8a0b635df7f76a25917042c4fa20c67))

## [1.14.6](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.5...v1.14.6) (2022-07-15)


### Performance Improvements

* **color-mode-button:** render only the used button ([49def3f](https://github.com/felix-berlin/berliner-schnauze/commit/49def3fad312888e6df9bacaf9ad8e440f25ee23))
* reduced dom size ([fc8adae](https://github.com/felix-berlin/berliner-schnauze/commit/fc8adae86e812d84d8b24a0867dbc00fcacc8f23))

## [1.14.5](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.4...v1.14.5) (2022-07-08)


### Bug Fixes

* filter dropdown text color ([d37e9ea](https://github.com/felix-berlin/berliner-schnauze/commit/d37e9ea77aa62294c4e0d74b1099d506fa716008))

## [1.14.4](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.3...v1.14.4) (2022-07-08)


### Bug Fixes

* word of the day loading status (4) ([f5c1adf](https://github.com/felix-berlin/berliner-schnauze/commit/f5c1adf6f981dc5a6ada0610bd0b652e02eec0c1))

## [1.14.3](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.2...v1.14.3) (2022-07-08)


### Bug Fixes

* word of the day loading status (3) ([89d6548](https://github.com/felix-berlin/berliner-schnauze/commit/89d65486f64219d8ec20985fc49c05943006f0aa))

## [1.14.2](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.1...v1.14.2) (2022-07-08)


### Bug Fixes

* woftd status ([36ae0d0](https://github.com/felix-berlin/berliner-schnauze/commit/36ae0d0eca8c20d9f1ff04f180c8e1a83d05b502))
* word of the day loading status (2) ([b13ed6b](https://github.com/felix-berlin/berliner-schnauze/commit/b13ed6b45d06e77016a6ea8797615ef68fd32727))

## [1.14.1](https://github.com/felix-berlin/berliner-schnauze/compare/v1.14.0...v1.14.1) (2022-07-08)


### Bug Fixes

* word of the day loading status ([25ae0cd](https://github.com/felix-berlin/berliner-schnauze/commit/25ae0cd4859e7a0faefa3c29f85bbcc47802a20c))

# [1.14.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.13.1...v1.14.0) (2022-07-08)


### Bug Fixes

* **elements:** dark mode color contrast tooltip color ([57d192c](https://github.com/felix-berlin/berliner-schnauze/commit/57d192c52fac259c6585814feb188144210a8faf))


### Features

* **elements:** add crown icon to the word of the day ([a532a1f](https://github.com/felix-berlin/berliner-schnauze/commit/a532a1f9ac2e4baabd93b6efb9f31617bf357d65))

## [1.13.1](https://github.com/felix-berlin/berliner-schnauze/compare/v1.13.0...v1.13.1) (2022-07-02)


### Bug Fixes

* date format ([5cc041f](https://github.com/felix-berlin/berliner-schnauze/commit/5cc041f3fbcb7141c5b52719cba7fb29492916ca))

# [1.13.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.12.0...v1.13.0) (2022-07-01)


### Bug Fixes

* date format for safari ([f6fc2ab](https://github.com/felix-berlin/berliner-schnauze/commit/f6fc2abb67fd0d252221986bcffa980e4059c8ab))
* **filter dropdown:** removed hide delay ([cb72ce8](https://github.com/felix-berlin/berliner-schnauze/commit/cb72ce87e825c8ce6817acf5e0ec2051ee595ba4))
* **single word:** learn more link spacing top ([21e6b17](https://github.com/felix-berlin/berliner-schnauze/commit/21e6b17a9435ca19f53cfa89d74f20aca4d22350))


### Features

* better word of the day tooltip position ([18c3393](https://github.com/felix-berlin/berliner-schnauze/commit/18c3393323d2808ba229d4dab341d3fcdca1ca18))

# [1.12.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.11.0...v1.12.0) (2022-07-01)


### Features

* **nav:** split menu nav in half ([799819e](https://github.com/felix-berlin/berliner-schnauze/commit/799819e01e4bc8dfc6a503b4e3a127a9ba2bad97))
* **seo:** create router middleware ([65ecbe4](https://github.com/felix-berlin/berliner-schnauze/commit/65ecbe4be04c5da0d8e0f76a8eab0279e7f8c2cd))

# [1.11.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.10.0...v1.11.0) (2022-06-29)


### Features

* add error page ([a4f626a](https://github.com/felix-berlin/berliner-schnauze/commit/a4f626a277e17c805005c3b97f0731e2e2c1c6d2))

# [1.10.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.9.2...v1.10.0) (2022-06-27)


### Bug Fixes

* lint errors ([f5cc12a](https://github.com/felix-berlin/berliner-schnauze/commit/f5cc12a60e606795d89560860065ce323b2f6e05))


### Features

* update sassy-scss;  replace all scss functions with sassy functions ([84849d8](https://github.com/felix-berlin/berliner-schnauze/commit/84849d822431130e9f73d1a8a1a53c4a3d566e68))

## [1.9.2](https://github.com/felix-berlin/berliner-schnauze/compare/v1.9.1...v1.9.2) (2022-06-26)


### Bug Fixes

* version number ([a999aaa](https://github.com/felix-berlin/berliner-schnauze/commit/a999aaa15674c02502305436b6e3d54edf750065))

## [1.9.1](https://github.com/felix-berlin/berliner-schnauze/compare/v1.9.0...v1.9.1) (2022-06-26)


### Bug Fixes

* package.json version ([6d8c6e6](https://github.com/felix-berlin/berliner-schnauze/commit/6d8c6e6f87eeafee117d2f2b606cb7c838ca3828))

# [1.9.0](https://github.com/felix-berlin/berliner-schnauze/compare/v1.8.0...v1.9.0) (2022-06-26)


### Features

* add husky, commit lint, semantic release ([230c386](https://github.com/felix-berlin/berliner-schnauze/commit/230c38667678a502d2e8aaa0806850ac5b1d8104))
