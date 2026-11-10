import type { CollectionBeforeDeleteHook, CollectionConfig, Field } from "payload";

import { draftsAccess } from "../access";
import { contentModifiedAtField, touchContentModifiedAt } from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { setDerivedWordFields } from "../hooks/deriveWordFields";
import { mcpDraftOnly } from "../hooks/mcpDraftOnly";
import { previewUrl } from "../lib/preview";

const gender: Field = { name: "gender", type: "select", options: ["male", "female"] };
const audioRows = (name: string): Field => ({
  name,
  type: "array",
  interfaceName: "AudioArray",
  fields: [gender, { name: "audio", type: "upload", relationTo: "media" }],
});

/** comments.word, word_feedback.word_id and word_stats.word_id are required (not-null FK): take the word's comments, feedback and daily stats along. Top-level comments first, their hook removes the replies. */
const deleteComments: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // A bulk delete reports per-document failures in `errors` instead of throwing: a row left behind would only
  // surface later as an opaque not-null FK error on the word delete.
  const removed = [
    await req.payload.delete({ collection: "word-feedback", where: { word: { equals: id } }, req }),
    await req.payload.delete({ collection: "word-stats", where: { word: { equals: id } }, req }),
    await req.payload.delete({
      collection: "comments",
      where: { word: { equals: id }, parent: { exists: false } },
      req,
    }),
  ];
  const failed = removed.flatMap((r) => r.errors ?? []);
  if (failed.length)
    throw new Error(
      `Could not remove the word's feedback/stats/comments: ${failed.map((e) => e.message).join("; ")}`,
    );
};

export const Words: CollectionConfig = {
  slug: "words",
  access: draftsAccess,
  admin: {
    useAsTitle: "berlinerisch",
    defaultColumns: ["berlinerisch", "slug", "translations", "_status"],
    preview: previewUrl("words"),
  },
  versions: { drafts: true },
  hooks: {
    beforeChange: [mcpDraftOnly, touchContentModifiedAt, setDerivedWordFields],
    beforeDelete: [deleteComments],
  },
  fields: [
    { name: "berlinerisch", type: "text", required: true },
    ...identityFields,
    { name: "article", type: "text" },
    { name: "translations", type: "array", fields: [{ name: "translation", type: "text" }] },
    {
      name: "alternativeWords",
      type: "array",
      fields: [{ name: "alternativeWord", type: "text" }],
    },
    {
      name: "examples",
      type: "array",
      interfaceName: "WordExamplesArray",
      fields: [
        { name: "example", type: "text" },
        { name: "exampleExplanation", type: "textarea" },
        audioRows("exampleAudio"),
      ],
    },
    audioRows("berlinerischAudio"),
    { name: "relatedWords", type: "relationship", relationTo: "words", hasMany: true },
    {
      name: "wikimediaFiles",
      type: "array",
      fields: [
        { name: "wikimediaFile", type: "text" },
        { name: "description", type: "text" },
        { name: "caption", type: "text" },
      ],
    },
    { name: "infoText", type: "richText" },
    { name: "learnMore", type: "text" },
    { name: "berolinismus", type: "checkbox" },
    { name: "sources", type: "text", hasMany: true },
    { name: "images", type: "upload", relationTo: "media", hasMany: true },
    { name: "wordTypes", type: "relationship", relationTo: "word-types", hasMany: true },
    { name: "themen", type: "relationship", relationTo: "themen", hasMany: true },
    { name: "publishedAt", type: "date" },
    contentModifiedAtField,
    {
      name: "feedbackCounts",
      type: "ui",
      admin: { position: "sidebar", components: { Field: "@/components/WordFeedbackCounts" } },
    },
    {
      name: "derived",
      type: "group",
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Computed from berlinerisch on save.",
      },
      fields: [
        { name: "wordGroup", type: "text" },
        { name: "characterLength", type: "number" },
        { name: "syllablesCount", type: "number" },
        { name: "consonantsCount", type: "number" },
        { name: "vowelsCount", type: "number" },
        { name: "nlpTags", type: "json" },
        { name: "wordComponents", type: "text", hasMany: true },
        { name: "soundexCode", type: "text", index: true },
        { name: "decomposition", type: "text", hasMany: true },
      ],
    },
  ],
};
