import type { GetAllWordsQuery } from "./graphql";

type WordEdge = NonNullable<NonNullable<GetAllWordsQuery["berlinerWords"]>["edges"][number]>;

export type BerlinerWord = WordEdge["node"];

export type Maybe<T> = T | null;

export type WordProperties = NonNullable<BerlinerWord["wordProperties"]>;

type BerlinerischAudioArr = NonNullable<WordProperties["berlinerischAudio"]>;
export type WordPropertiesBerlinerischAudio = NonNullable<BerlinerischAudioArr[number]>;

type ExamplesArr = NonNullable<WordProperties["examples"]>;
export type WordPropertiesExamples = NonNullable<ExamplesArr[number]>;

type ExampleAudioArr = NonNullable<WordPropertiesExamples["exampleAudio"]>;
export type WordPropertiesExamplesExampleAudio = NonNullable<ExampleAudioArr[number]>;

type WikimediaFilesArr = NonNullable<WordProperties["wikimediaFiles"]>;
export type WordPropertiesWikimediaFiles = NonNullable<WikimediaFilesArr[number]>;

export type MediaItem = NonNullable<NonNullable<WordPropertiesBerlinerischAudio["audio"]>["node"]>;
