<template>
  <input v-model="searchQuery" type="text" placeholder="Search words..." />

  <input id="sortBerlinerisch" v-model="sortBerlinerisch" type="checkbox" name="sortBerlinerisch" />

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
import type { TypedDocument, Orama, Results, SearchParams } from "@orama/orama";

const { words } = defineProps<{
  words: WordDocument[];
}>();

type WordDocument = TypedDocument<Orama<typeof wordSchema>>;

type CustomSearchParams = Omit<SearchParams<Orama<typeof wordSchema>>, "sortBy"> & {
  sortBy: {
    property: "wordProperties.berlinerisch";
    order: "ASC" | "DESC";
  };
};

const testData = words.map((word) => ({
  wordProperties: {
    berlinerisch: word.wordProperties.berlinerisch,
    berolinismus: word.wordProperties.berolinismus,
  },
}));

const wordSchema = {
  wordProperties: {
    berlinerisch: "string",
    berolinismus: "boolean",
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

const searchQuery = ref("");
const searchResults = ref<Results<WordDocument> | null>(null);
const searchParams = ref<SearchParams<Orama<typeof wordSchema>>>({
  term: searchQuery.value,
  properties: ["wordProperties.berlinerisch"],
  sortBy: {
    property: "wordProperties.berlinerisch",
    order: "ASC", // default is "ASC"
  },
});
const sortBerlinerisch = ref(false);

const getSearchResult = async () => {
  searchParams.value.term = searchQuery.value;
  // TODO: implement show all when searchQuery is empty (use documentStore)
  // if (!searchQuery.value) {
  // }
  // TODO: add <mark> to highlight search term
  searchResults.value = await searchWithHighlight(db, searchParams.value);
};

watch(searchQuery, async () => {
  await getSearchResult();
});

watch(sortBerlinerisch, async () => {
  searchParams.value.sortBy.order = sortBerlinerisch.value ? "DESC" : "ASC";
  await getSearchResult();
});
</script>

<style scoped></style>
