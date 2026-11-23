import type { CollectionAfterChangeHook, CollectionConfig } from "payload";

import { relationship, select, text, textarea } from "payload/shared";

import type { AnyValidate } from "../lib/requiredField";

import { authenticatedOnly, notOverMcp } from "../access";
import { adoptSuggestion } from "../hooks/adoptSuggestion";
import { lockedByWordValue, refuseWhenLocked, updateUnlocked } from "../hooks/suggestionLock";
import { notifyEditors } from "../lib/notifyEditors";

const TYPE_LABEL: Record<string, string> = {
  example: "Beispielsatz",
  fact: "Wissenswertes",
  related: "Verwandtes Wort",
  word: "Neues Wort",
};

/** Mails the editors about a new suggestion; a failed mail is logged, the suggestion stays in the admin. */
const mailEditors: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
  const type: string = doc.type ?? "word";
  const similar = (req.context.similarWords as string[] | undefined) ?? [];
  // The other types name the word they are for; show its headword, not an id.
  const target = doc.targetWord
    ? await req.payload
        .findByID({
          collection: "words",
          depth: 0,
          id: typeof doc.targetWord === "object" ? doc.targetWord.id : doc.targetWord,
          req,
        })
        .then((w) => w.berlinerisch)
        .catch(() => null)
    : null;
  const rows: [string, string | null | undefined][] =
    type === "word"
      ? [
          ["Berliner Wort", doc.berlinerWord],
          ["Übersetzung", doc.translation],
          ["Beispiel", doc.example],
        ]
      : [
          ["Zu Wort", target],
          ["Text", doc.text],
          ["Art", doc.kind],
          ["Beziehung", doc.relation],
          ["Verwandtes Wort", doc.relatedText],
          ["Hochdeutsch", doc.highdeutsch],
        ];
  rows.push(["Name", doc.userName], ["E-Mail", doc.userMail]);
  if (similar.length) rows.push(["Ähnliche Wörter", similar.join(", ")]);
  notifyEditors(
    req,
    `${TYPE_LABEL[type] ?? "Vorschlag"} - Berliner Schnauze`,
    [
      `Ein neuer Vorschlag wurde eingereicht (${TYPE_LABEL[type] ?? type}):`,
      "",
      ...rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    ],
    doc.userMail ?? undefined,
  );
  return doc;
};

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

const labelled = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Words suggested through the site's form. The site creates them through the Local API (after Turnstile). */
export const Suggestions: CollectionConfig = {
  slug: "suggestions",
  // A suggestion whose word is live is locked (hooks/suggestionLock.ts).
  access: { ...authenticatedOnly, update: updateUnlocked },
  admin: {
    useAsTitle: "berlinerWord",
    defaultColumns: ["type", "berlinerWord", "text", "status", "createdAt"],
    group: "Community",
  },
  hooks: { beforeChange: [refuseWhenLocked, adoptSuggestion], afterChange: [mailEditors] },
  fields: [
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
      options: labelled({
        word: "Neues Wort",
        example: "Beispielsatz",
        fact: "Wissenswertes",
        related: "Verwandtes Wort",
      }),
      admin: { position: "sidebar" },
    },
    // Only for type "word": nullable in the database (additive for the rolling release), enforced by validate.
    {
      name: "berlinerWord",
      type: "text",
      maxLength: 100,
      validate: requiredFor(["word"], text as AnyValidate),
    },
    {
      name: "translation",
      type: "text",
      maxLength: 300,
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
      options: labelled({
        herkunft: "Herkunft",
        geschichte: "Geschichte",
        gebrauch: "Gebrauch",
        anekdote: "Anekdote",
        sonstiges: "Sonstiges",
      }),
      validate: requiredFor(["fact"], select as AnyValidate),
    },
    {
      name: "relation",
      type: "select",
      options: labelled({
        gleich: "Gleich",
        gegenteil: "Gegenteil",
        verwandt: "Verwandt",
        redewendung: "Redewendung",
      }),
      validate: requiredFor(["related"], select as AnyValidate),
    },
    {
      name: "relatedText",
      type: "text",
      maxLength: 60,
      validate: requiredFor(["related"], text as AnyValidate),
    },
    {
      name: "text",
      type: "textarea",
      maxLength: 1000,
      admin: {
        description: "Beispielsatz (max. 200 Zeichen) oder Text zum Wissenswerten (max. 1000).",
      },
      validate: limitFor({ example: 200 }, ["example", "fact"], textarea as AnyValidate),
    },
    { name: "highdeutsch", type: "text", maxLength: 200 },
    {
      name: "example",
      type: "textarea",
      maxLength: 1000,
      admin: {
        description:
          "Nur bei „Neues Wort“: optionaler Beispielsatz. Für „Beispielsatz“ siehe Feld Text.",
      },
    },
    {
      name: "userName",
      type: "text",
      maxLength: 100,
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
          "Beispielsatz, Wissenswertes und Verwandtes übernimmt das CMS nicht selbst: erst von Hand ins Wort eintragen (dort „Vorschlag“ verknüpfen), dann hier auf „Übernommen“ setzen.",
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
