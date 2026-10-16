import type { CollectionConfig, Field } from "payload";

import { authenticatedOnly } from "../access";
import { contentModifiedAtField, touchContentModifiedAt } from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { setDerivedWordFields } from "../hooks/deriveWordFields";

const gender: Field = { name: "gender", type: "select", options: ["male", "female"] };
const audioRows = (name: string): Field => ({
  name,
  type: "array",
  fields: [gender, { name: "audio", type: "upload", relationTo: "media" }],
});

export const Words: CollectionConfig = {
  slug: "words",
  access: authenticatedOnly,
  admin: { useAsTitle: "berlinerisch" },
  versions: { drafts: true },
  hooks: { beforeChange: [touchContentModifiedAt, setDerivedWordFields] },
  fields: [
    { name: "berlinerisch", type: "text", required: true },
    ...identityFields,
    { name: "berlinerWordId", type: "number" },
    { name: "article", type: "text" },
    { name: "translations", type: "array", fields: [{ name: "translation", type: "text" }] },
    { name: "alternativeWords", type: "array", fields: [{ name: "alternativeWord", type: "text" }] },
    {
      name: "examples",
      type: "array",
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
      name: "derived",
      type: "group",
      admin: { readOnly: true, position: "sidebar", description: "Computed from berlinerisch on save." },
      fields: [
        { name: "wordGroup", type: "text" },
        { name: "characterLength", type: "number" },
        { name: "syllablesCount", type: "number" },
        { name: "consonantsCount", type: "number" },
        { name: "vowelsCount", type: "number" },
        { name: "nlpTags", type: "json" },
        { name: "wordComponents", type: "text", hasMany: true },
        { name: "soundexCode", type: "text", index: true },
      ],
    },
  ],
};
