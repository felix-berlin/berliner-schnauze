<template><slot /></template>

<script setup lang="ts">
import { $wordSearch } from "@stores/index";
import type { Maybe } from "@/gql/graphql.ts";

type WordSearchListProps = {
  availableLetterGroups: Maybe<string>[];
  wordTypes: Maybe<string>[];
};

const props = defineProps<WordSearchListProps>();

$wordSearch.setKey("letterGroups", props.availableLetterGroups);
$wordSearch.setKey("wordTypes", props.wordTypes);
</script>
