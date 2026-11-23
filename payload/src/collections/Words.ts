import type { CollectionBeforeDeleteHook, CollectionConfig, Field, PayloadRequest } from "payload";

import { text } from "payload/shared";

import { draftsAccess, notOverMcp } from "../access";
import {
  contentModifiedAtField,
  preserveOnTrash,
  touchContentModifiedAt,
} from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { liveLinkField } from "../fields/liveLink";
import { setDerivedWordFields } from "../hooks/deriveWordFields";
import { mcpDraftOnly, mcpKeepCredits, mcpUpdateDraftOnly } from "../hooks/mcpDraftOnly";
import { previewUrl } from "../lib/preview";
import { requiredSelect, requiredRichText, type AnyValidate } from "../lib/requiredField";

const gender: Field = { name: "gender", type: "select", options: ["male", "female"] };
const audioRows = (name: string): Field => ({
  name,
  type: "array",
  interfaceName: "AudioArray",
  fields: [gender, { name: "audio", type: "upload", relationTo: "media" }],
});

/** comments.word, word_feedback.word_id, word_stats.word_id and reports.word_id are required (not-null FK): take the word's comments, feedback, daily stats and reports along. Top-level comments first, their hook removes the replies. */
const deleteComments: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const where = { word: { equals: id } };
  // Feedback, stats and reports have no hooks: one SQL delete each instead of one payload.delete per row (it throws on failure).
  await req.payload.db.deleteMany({ collection: "word-feedback", where, req });
  await req.payload.db.deleteMany({ collection: "word-stats", where, req });
  await req.payload.db.deleteMany({ collection: "reports", where, req });
  // A bulk delete reports per-document failures in `errors` instead of throwing: a row left behind would only
  // surface later as an opaque not-null FK error on the word delete.
  const { errors } = await req.payload.delete({
    collection: "comments",
    where: { ...where, parent: { exists: false } },
    req,
  });
  if (errors.length)
    throw new Error(
      `Could not remove the word's comments: ${errors.map((e) => e.message).join("; ")}`,
    );
};

export const Words: CollectionConfig = {
  slug: "words",
  access: draftsAccess,
  defaultSort: "-updatedAt",
  admin: {
    useAsTitle: "berlinerisch",
    defaultColumns: ["berlinerisch", "slug", "translations", "_status"],
    group: "Inhalt",
    listSearchableFields: ["berlinerisch", "slug"],
    preview: previewUrl("words"),
  },
  trash: true,
  versions: { drafts: true },
  hooks: {
    beforeOperation: [mcpUpdateDraftOnly],
    beforeChange: [
      mcpDraftOnly,
      mcpKeepCredits,
      preserveOnTrash,
      touchContentModifiedAt,
      setDerivedWordFields,
    ],
    beforeDelete: [deleteComments],
  },
  fields: [
    { name: "berlinerisch", type: "text", required: true },
    {
      name: "ipa",
      label: "Lautschrift (IPA)",
      type: "text",
      admin: { description: "IPA ohne eckige Klammern, z. B. ˈɪç. Die Klammern setzt die Seite." },
    },
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
    { name: "stress", label: "Betonung", type: "text" },
    {
      name: "grammar",
      label: "Grammatik",
      type: "group",
      fields: [
        { name: "plural", type: "text" },
        { name: "diminutive", type: "relationship", relationTo: "words" },
      ],
    },
    {
      name: "facts",
      label: "Fakten",
      type: "array",
      fields: [
        {
          name: "kind",
          type: "select",
          validate: requiredSelect,
          options: [
            { label: "Herkunft", value: "herkunft" },
            { label: "Geschichte", value: "geschichte" },
            { label: "Gebrauch", value: "gebrauch" },
            { label: "Anekdote", value: "anekdote" },
            { label: "Sonstiges", value: "sonstiges" },
          ],
        },
        // Rich text: the old origin text (`infoText`) moves here with its formatting.
        { name: "text", type: "richText", validate: requiredRichText },
        {
          name: "source",
          type: "text",
          maxLength: 200,
          admin: {
            description:
              "Quelle genau dieses Eintrags (z. B. Buch, Autor). Die Seite nennt sie vor der Namensnennung.",
          },
        },
        {
          name: "contributorName",
          type: "text",
          maxLength: 40,
          // Public credit under the entry, copied by an editor from the suggestion; not covered by the 90-day clean-up of
          // suggestions (name it in the privacy policy). Hidden from MCP like the suggestion's own name.
          access: { read: notOverMcp, update: notOverMcp },
        },
        { name: "contributorSuggestion", type: "relationship", relationTo: "suggestions" },
      ],
    },
    {
      name: "related",
      label: "Verwandte Wörter",
      type: "array",
      fields: [
        { name: "word", type: "relationship", relationTo: "words" },
        {
          name: "label",
          type: "text",
          maxLength: 60,
          // A row needs a linked word or a label, else the list shows an empty entry. Deleting the linked word nulls
          // `word_id` (FK on delete set null): such an existing row stays saveable, only a new row is checked.
          validate: (async (value, options) => {
            const stock = text as AnyValidate; // keeps maxLength
            const { siblingData, operation, id, req } = options as {
              siblingData: { id?: string; word?: unknown };
              operation?: string;
              id?: number | string;
              req: PayloadRequest;
            };
            if (value || siblingData?.word) return stock(value, options);
            if (operation === "update" && id != null && siblingData?.id) {
              const original = await req.payload
                .findByID({ collection: "words", id, depth: 0, draft: true, req })
                .catch(() => null);
              if (original?.related?.some((r) => r.id === siblingData.id)) return true;
            }
            return "Wort verknüpfen oder Bezeichnung eintragen.";
          }) as AnyValidate,
          admin: { description: "Wird genutzt, wenn kein Wort verknüpft ist." },
        },
        {
          name: "relation",
          type: "select",
          options: [
            { label: "Gleich", value: "gleich" },
            { label: "Gegenteil", value: "gegenteil" },
            { label: "Verwandt", value: "verwandt" },
            { label: "Redewendung", value: "redewendung" },
          ],
        },
        { name: "note", type: "text", maxLength: 60 },
        {
          name: "contributorName",
          type: "text",
          maxLength: 40,
          // Public credit under the entry, copied by an editor from the suggestion; not covered by the 90-day clean-up of
          // suggestions (name it in the privacy policy). Hidden from MCP like the suggestion's own name.
          access: { read: notOverMcp, update: notOverMcp },
        },
        { name: "contributorSuggestion", type: "relationship", relationTo: "suggestions" },
      ],
    },
    {
      name: "wikimediaFiles",
      type: "array",
      fields: [
        { name: "wikimediaFile", type: "text" },
        { name: "description", type: "text" },
        { name: "caption", type: "text" },
      ],
    },
    { name: "learnMore", type: "text" },
    { name: "berolinismus", type: "checkbox" },
    { name: "images", type: "upload", relationTo: "media", hasMany: true },
    { name: "wordTypes", type: "relationship", relationTo: "word-types", hasMany: true },
    { name: "themen", type: "relationship", relationTo: "themen", hasMany: true },
    { name: "publishedAt", type: "date" },
    contentModifiedAtField,
    liveLinkField,
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
