<template>
  <!-- <input v-model="searchQuery" type="text" placeholder="Search words..." /> -->

  <div v-text="searchResults?.count ?? 0"></div>
  <div v-if="searchResults">
    <p>Search Results:</p>
    <ul>
      <li v-for="(result, index) in searchResults.hits" :key="index">
        {{ result.document.wordProperties.berlinerisch }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { create, search, insertMultiple } from "@orama/orama";
import { stemmer, language } from "@orama/stemmers/german";
import {
  afterInsert as highlightAfterInsert,
  searchWithHighlight,
} from "@orama/plugin-match-highlight";
import { useStore } from "@nanostores/vue";
import { $wordSearch, $oramaSearchResults } from "@stores/index.ts";
import type { TypedDocument, Orama, Results, SearchParams } from "@orama/orama";

const { words, limit = null } = defineProps<{
  words: WordDocument[];
  limit?: number;
}>();

type WordDocument = TypedDocument<Orama<typeof wordSchema>>;

type CustomSearchParams = Omit<SearchParams<Orama<typeof wordSchema>>, "sortBy"> & {
  sortBy: {
    property: "wordProperties.berlinerisch";
    order: "ASC" | "DESC";
  };
};

const testData = words.map((word) => {
  const examples = Array.isArray(word.wordProperties.examples)
    ? word.wordProperties.examples.map((e) => e.example).filter((ex) => typeof ex === "string")
    : [];

  const translations = Array.isArray(word.wordProperties.translations)
    ? word.wordProperties.translations
        .map((t) => t.translation)
        .filter((tr) => typeof tr === "string")
    : [];

  const berlinerischWordTypes = word.berlinerischWordTypes.nodes.map((type) => type.name);
  return {
    berlinerischWordTypes: berlinerischWordTypes,
    dateGmt: word.dateGmt,
    modifiedGmt: word.modifiedGmt,
    wordGroup: word.wordGroup,
    wordProperties: {
      berlinerisch: word.wordProperties.berlinerisch,
      berolinismus: word.wordProperties.berolinismus,
      translations: translations,
      examples: examples,
    },
  };
});

const wordSchema = {
  berlinerischWordTypes: "string[]",
  dateGmt: "string",
  modifiedGmt: "string",
  wordGroup: "string",
  wordProperties: {
    berlinerisch: "string",
    berolinismus: "boolean",
    translations: "string[]",
    examples: "string[]",
  },
} as const;

// const wordSchema = {
//   __typename: "string",
//   berlinerWordId: "number",
//   berlinerischWordTypes: {
//     __typename: "string",
//   },
//   dateGmt: "string",
//   id: "string",
//   modifiedGmt: "string",
//   slug: "string",
//   wordGroup: "string",
//   wordProperties: {
//     __typename: "string",
//     alternativeWords: "string",
//     article: "string",
//     berlinerisch: "string",
//     berlinerischAudio: "string",
//     berolinismus: "boolean",
//   },
// } as const;

const db: Orama<typeof wordSchema> = create({
  schema: wordSchema,
  components: {
    tokenizer: {
      stemming: true,
      stemmerSkipProperties: [
        "wordGroup",
        "modifiedGmt",
        "dateGmt",
        "wordProperties.berolinismus",
        "berlinerischWordTypes",
      ],
      language,
      stemmer,
    },
  },
  plugins: [
    // Register the hook
    {
      name: "highlight",
      afterInsert: highlightAfterInsert,
    },
  ],
});

await insertMultiple(db, testData);

const wordSearch = useStore($wordSearch);
const orama = useStore($oramaSearchResults);

const searchQuery = ref("");
const searchResults = ref<Results<WordDocument> | null>(null);
const resultLimit = ref(limit ?? testData.length);
const searchParams = ref<SearchParams<Orama<typeof wordSchema>>>({
  term: wordSearch.value.search,
  properties: [
    "wordProperties.berlinerisch",
    "wordProperties.translations",
    "wordProperties.examples",
  ],
  limit: resultLimit.value,
  sortBy: {
    property: "wordProperties.berlinerisch",
    order: "ASC", // default is "ASC"
  },
});

const getSearchResult = async () => {
  searchParams.value.term = wordSearch.value.search;
  // TODO: implement show all when searchQuery is empty (use documentStore)
  // if (!searchQuery.value) {
  // }
  // TODO: add <mark> to highlight search term
  searchResults.value = await searchWithHighlight(db, searchParams.value);
};

// Custom sort function for date or modifiedDate
function getSortByFn(property: "dateGmt" | "modifiedGmt", order: "ASC" | "DESC") {
  return (a: any, b: any) => {
    const aDate = new Date(a[2][property]);
    const bDate = new Date(b[2][property]);
    return order === "ASC" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
  };
}

// watch(wordSearch.value.search, async () => {
//   await getSearchResult();
// });

watch(wordSearch, async (newValue) => {
  // Build the where clause based on filters
  const where: any = {};

  // Filter for berolinismus (boolean)
  const berolinismus = wordSearch.value.berolinismus || newValue.berolinismus;
  if (berolinismus) {
    where["wordProperties.berolinismus"] = true;
  }

  // Filter for active letter (wordGroup)
  const activeLetter = wordSearch.value.activeLetterFilter || newValue.activeLetterFilter;
  if (activeLetter) {
    where.wordGroup = activeLetter;
  }

  const activeWordTypeFilter =
    wordSearch.value.activeWordTypeFilter || newValue.activeWordTypeFilter;
  if (activeWordTypeFilter) {
    where.berlinerischWordTypes = activeWordTypeFilter;
  }

  // Only set where if any filter is active, else remove it
  if (Object.keys(where).length > 0) {
    searchParams.value.where = where;
  } else {
    delete searchParams.value.where;
  }

  if (newValue.activeOrderCategory === "alphabetical") {
    searchParams.value.sortBy = {
      property: "wordProperties.berlinerisch",
      order: newValue.alphabeticalOrder,
    };
  } else if (newValue.activeOrderCategory === "date") {
    searchParams.value.sortBy = getSortByFn("dateGmt", newValue.dateOrder);
  } else if (newValue.activeOrderCategory === "modifiedDate") {
    searchParams.value.sortBy = getSortByFn("modifiedGmt", newValue.modifiedDateOrder);
  }

  await getSearchResult();
});
</script>

<style scoped></style>
