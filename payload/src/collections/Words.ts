import type { CollectionBeforeChangeHook, CollectionConfig, Field } from "payload";

import { authenticated } from "../access";
import { identityFields } from "../fields/identity";
import { seoField } from "../fields/seo";

const gender: Field = { name: "gender", type: "select", options: ["male", "female"] };
const audioRows = (name: string): Field => ({
  name,
  type: "array",
  fields: [gender, { name: "audio", type: "upload", relationTo: "media" }],
});

/** Payload always rewrites updatedAt on update, so WP's modifiedGmt lives here (sitemap lastmod). */
const touchContentModifiedAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  // On update `data` is merged with the stored doc, so "not passed" means "unchanged from stored".
  const unchanged = originalDoc && data.contentModifiedAt === originalDoc.contentModifiedAt;
  if (!data.contentModifiedAt || unchanged) data.contentModifiedAt = new Date().toISOString();
  return data;
};

export const Words: CollectionConfig = {
  slug: "words",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "berlinerisch" },
  versions: { drafts: true },
  hooks: { beforeChange: [touchContentModifiedAt] },
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
    seoField,
    { name: "contentModifiedAt", type: "date", admin: { readOnly: true } },
  ],
};
