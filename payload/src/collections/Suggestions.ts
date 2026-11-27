import type { CollectionAfterChangeHook, CollectionConfig, FieldHook, Validate } from "payload";

import { relationship, select, text, textarea } from "payload/shared";

import { authenticatedOnly, notOverMcp } from "../access";
import { adoptSuggestion, refuseBulkAccept } from "../hooks/adoptSuggestion";
import { lockedByWordValue, refuseWhenLocked, updateUnlocked } from "../hooks/suggestionLock";
import { notifyEditors } from "../lib/notifyEditors";
import {
  BERLINER_WORD_MAX,
  EXAMPLE_MAX,
  FACT_MAX,
  HIGHDEUTSCH_MAX,
  RELATED_MAX,
  SUGGESTED_EXAMPLE_MAX,
  SUGGESTER_NAME_MAX,
  TRANSLATION_MAX,
} from "../lib/submissionLimits";
import { FACT_KINDS, RELATIONS } from "../lib/suggestionEnums";

const TYPES = ["word", "example", "fact", "related"] as const;
const TYPE_LABEL: Record<(typeof TYPES)[number], string> = {
  example: "Beispielsatz",
  fact: "Wissenswertes",
  related: "Verwandtes Wort",
  word: "Neues Wort",
};
const RELATION_LABEL: Record<(typeof RELATIONS)[number], string> = {
  gegenteil: "Gegenteil",
  gleich: "Gleich",
  redewendung: "Redewendung",
  verwandt: "Verwandt",
};
const FACT_KIND_LABEL: Record<(typeof FACT_KINDS)[number], string> = {
  anekdote: "Anekdote",
  gebrauch: "Gebrauch",
  geschichte: "Geschichte",
  herkunft: "Herkunft",
  sonstiges: "Sonstiges",
};
// The stored value stays a free string at runtime (old rows), so the lookups take any string.
const typeLabel = (type: string) => TYPE_LABEL[type as (typeof TYPES)[number]] ?? type;
const relationLabel = (relation: string) =>
  RELATION_LABEL[relation as (typeof RELATIONS)[number]] ?? relation;

/** Mails the editors about a new suggestion; a failed mail is logged, the suggestion stays in the admin. */
const mailEditors: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
  const type: string = doc.type ?? "word";
  if (type !== "word") {
    const targetId = typeof doc.targetWord === "object" ? doc.targetWord?.id : doc.targetWord;
    const target = targetId
      ? await req.payload
          .findByID({
            collection: "words",
            depth: 0,
            id: targetId,
            req,
            select: { berlinerisch: true },
          })
          .catch((error: unknown) => {
            // The mail goes out without the word's name; the lookup failing must not block the suggestion.
            req.payload.logger.warn(
              `suggestion mail: word ${String(targetId)} lookup failed (${error instanceof Error ? error.name : typeof error})`,
            );
            return null;
          })
      : null;
    const rows: [string, string | null | undefined][] = [
      ["Zu Wort", target?.berlinerisch],
      ...(type === "example"
        ? [
            ["Beispiel", doc.text],
            ["Hochdeutsch", doc.highdeutsch],
          ]
        : []),
      ...(type === "fact"
        ? [
            ["Art", doc.kind],
            ["Text", doc.text],
          ]
        : []),
      ...(type === "related"
        ? [
            ["Beziehung", relationLabel(doc.relation)],
            ["Verwandtes Wort", doc.relatedText],
          ]
        : []),
      ["Name", doc.userName],
      ["E-Mail", doc.userMail],
    ] as [string, string | null | undefined][];
    notifyEditors(
      req,
      `${typeLabel(type)} - Berliner Schnauze`,
      [
        `Ein neuer Beitrag (${typeLabel(type)}) wurde eingereicht:`,
        "",
        ...rows.map(([label, value]) => `${label}: ${value ?? ""}`),
      ],
      doc.userMail ?? undefined,
    );
    return doc;
  }
  const similar = (req.context.similarWords as string[] | undefined) ?? [];
  const rows: [string, string | null | undefined][] = [
    ["Berliner Wort", doc.berlinerWord],
    ["Übersetzung", doc.translation],
    ["Beispiel", doc.example],
    ["Name", doc.userName],
    ["E-Mail", doc.userMail],
    ...(similar.length ? [["Ähnliche Wörter", similar.join(", ")] as [string, string]] : []),
  ];
  notifyEditors(
    req,
    "Wortvorschlag - Berliner Schnauze",
    [
      "Ein neues Berliner Wort wurde eingereicht:",
      "",
      ...rows.map(([label, value]) => `${label}: ${value ?? ""}`),
    ],
    doc.userMail ?? undefined,
  );
  return doc;
};

/** The list title: the word itself, or the type with the start of its text. */
const titleValue: FieldHook = ({ siblingData }) => {
  const d = siblingData as Record<string, string | undefined>;
  if ((d.type ?? "word") === "word") return d.berlinerWord ?? "";
  const body = (d.type === "related" ? d.relatedText : d.text) ?? "";
  return `${typeLabel(d.type ?? "")}: ${body.length > 60 ? `${body.slice(0, 59)}…` : body}`;
};

/** Payload's `Validate` generics differ per field type; the wrappers below only forward to the stock validator. */
// oxlint-disable-next-line typescript/no-explicit-any
type AnyValidate = Validate<any, any, any, any>;

/** Required only for the given suggestion types: runs the stock validator with `required` switched per type. */
const requiredFor =
  (types: string[], base: AnyValidate): AnyValidate =>
  (value, options) => {
    const type = (options.siblingData as { type?: string } | undefined)?.type ?? "word";
    return base(value, { ...options, required: types.includes(type) });
  };

/** Like `requiredFor`, with a per-type character limit (one column, the limit differs by type). */
const limitFor =
  (limits: Record<string, number>, types: string[], base: AnyValidate): AnyValidate =>
  (value, options) => {
    const type = (options.siblingData as { type?: string } | undefined)?.type ?? "word";
    const max = limits[type];
    return requiredFor(types, base)(value, { ...options, ...(max ? { maxLength: max } : {}) });
  };

const labelled = <K extends string>(keys: readonly K[], labels: Record<K, string>) =>
  keys.map((value) => ({ value, label: labels[value] }));

/** Words suggested through the site's form. The site creates them through the Local API (after Turnstile). */
export const Suggestions: CollectionConfig = {
  slug: "suggestions",
  // A suggestion whose word is live is locked (hooks/suggestionLock.ts).
  access: { ...authenticatedOnly, update: updateUnlocked },
  admin: {
    // Payload refuses a virtual `useAsTitle`, so the document header keeps the word; `title` is the list column.
    useAsTitle: "berlinerWord",
    // The search runs on stored columns; `title` is virtual.
    listSearchableFields: ["berlinerWord", "text", "relatedText"],
    defaultColumns: ["title", "type", "translation", "status", "createdAt"],
    group: "Community",
  },
  hooks: {
    beforeOperation: [refuseBulkAccept],
    beforeChange: [refuseWhenLocked, adoptSuggestion],
    afterChange: [mailEditors],
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "Titel",
      virtual: true,
      hooks: { afterRead: [titleValue] },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "lockNotice",
      type: "ui",
      admin: {
        condition: (data) => Boolean(data?.lockedByWord),
        components: { Field: "/components/SuggestionLockNotice#SuggestionLockNotice" },
      },
    },
    {
      name: "type",
      type: "select",
      defaultValue: "word",
      index: true,
      options: labelled(TYPES, TYPE_LABEL),
      admin: { position: "sidebar" },
    },
    // Only for type "word": nullable in the database (additive for the rolling release), enforced by validate.
    {
      name: "berlinerWord",
      type: "text",
      maxLength: BERLINER_WORD_MAX,
      validate: requiredFor(["word"], text as AnyValidate),
    },
    {
      name: "translation",
      type: "text",
      maxLength: TRANSLATION_MAX,
      validate: requiredFor(["word"], text as AnyValidate),
    },
    {
      name: "targetWord",
      type: "relationship",
      relationTo: "words",
      // Create only: the FK nulls it when the word is deleted, and the suggestion must stay saveable then.
      validate: ((value: unknown, options: Parameters<AnyValidate>[1]) =>
        requiredFor(
          options.operation === "create" ? ["example", "fact", "related"] : [],
          relationship as AnyValidate,
        )(value, options)) as AnyValidate,
      admin: {
        position: "sidebar",
        description:
          "Das Wort, zu dem Beispiel, Wissenswertes oder Verwandtes eingereicht wurde. Nicht „Wort“ (das sperrt den Vorschlag).",
      },
    },
    {
      name: "kind",
      type: "select",
      options: labelled(FACT_KINDS, FACT_KIND_LABEL),
      validate: requiredFor(["fact"], select as AnyValidate),
    },
    {
      name: "relation",
      type: "select",
      options: labelled(RELATIONS, RELATION_LABEL),
      validate: requiredFor(["related"], select as AnyValidate),
    },
    {
      name: "relatedText",
      type: "text",
      maxLength: RELATED_MAX,
      validate: requiredFor(["related"], text as AnyValidate),
    },
    {
      name: "text",
      type: "textarea",
      maxLength: FACT_MAX,
      admin: {
        description: "Beispielsatz (max. 200 Zeichen) oder Text zum Wissenswerten (max. 1000).",
      },
      validate: limitFor({ example: EXAMPLE_MAX }, ["example", "fact"], textarea as AnyValidate),
    },
    { name: "highdeutsch", type: "text", maxLength: HIGHDEUTSCH_MAX },
    {
      name: "example",
      type: "textarea",
      maxLength: SUGGESTED_EXAMPLE_MAX,
      admin: {
        description:
          "Nur bei „Neues Wort“: optionaler Beispielsatz. Für „Beispielsatz“ siehe Feld Text.",
      },
    },
    {
      name: "userName",
      type: "text",
      maxLength: SUGGESTER_NAME_MAX,
      access: { read: notOverMcp, update: notOverMcp },
    },
    { name: "userMail", type: "email", access: { read: notOverMcp, update: notOverMcp } },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "Neu", value: "new" },
        { label: "Übernommen", value: "accepted" },
        { label: "Abgelehnt", value: "rejected" },
      ],
      admin: {
        position: "sidebar",
        description:
          "„Übernommen“ trägt den Vorschlag ins Wort ein und veröffentlicht es sofort (neues Wort: anlegen und veröffentlichen). Bei Beispielsatz, Wissenswertem und Verwandtem muss das Wort veröffentlicht sein und darf keine ungespeicherten Entwurfsänderungen haben, sonst bricht das Speichern mit einer Meldung ab.",
      },
    },
    {
      name: "word",
      type: "relationship",
      relationTo: "words",
      admin: {
        position: "sidebar",
        description:
          "Das Wort, das aus diesem Vorschlag entstanden ist. Beim Wechsel auf „Übernommen“ ohne Wort legt das CMS einen Entwurf an; ein hier gewähltes Wort wird stattdessen verknüpft.",
      },
    },
    {
      name: "similarWords",
      type: "relationship",
      relationTo: "words",
      hasMany: true,
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "Wörter mit gleicher oder ähnlicher Schreibweise (automatisch beim Anlegen und beim Ändern des Berliner Worts).",
      },
    },
    {
      name: "lockedByWord",
      type: "checkbox",
      virtual: true,
      label: "Gesperrt (Wort ist veröffentlicht)",
      hooks: { afterRead: [lockedByWordValue] },
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "Wird aus dem Wort abgeleitet: gesperrt, solange das verknüpfte Wort veröffentlicht ist.",
      },
    },
  ],
};
