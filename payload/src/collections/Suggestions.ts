import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  FieldAccess,
  FieldHook,
  Validate,
} from "payload";

import { relationship, select, text, textarea } from "payload/shared";

import { authenticatedOnly } from "../access";
import { adoptSuggestion } from "../hooks/adoptSuggestion";
import { lockedByWordValue, refuseWhenLocked, updateUnlocked } from "../hooks/suggestionLock";
import { notifyEditors } from "../lib/notifyEditors";

const TYPE_LABEL: Record<string, string> = {
  example: "Beispielsatz",
  fact: "Wissenswertes",
  related: "Verwandtes Wort",
  word: "Neues Wort",
};
const RELATION_LABEL: Record<string, string> = {
  gegenteil: "Gegenteil",
  gleich: "Gleich",
  redewendung: "Redewendung",
  verwandt: "Verwandt",
};

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
          .catch(() => null)
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
            ["Beziehung", RELATION_LABEL[doc.relation] ?? doc.relation],
            ["Verwandtes Wort", doc.relatedText],
          ]
        : []),
      ["Name", doc.userName],
      ["E-Mail", doc.userMail],
    ] as [string, string | null | undefined][];
    notifyEditors(
      req,
      `${TYPE_LABEL[type] ?? type} - Berliner Schnauze`,
      [
        `Ein neuer Beitrag (${TYPE_LABEL[type] ?? type}) wurde eingereicht:`,
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
  return `${TYPE_LABEL[d.type ?? ""] ?? d.type}: ${body.length > 60 ? `${body.slice(0, 59)}…` : body}`;
};

/**
 * The sender's name and mail never reach an MCP client (and so the model): Payload drops the fields from every MCP
 * read, write result and query, whatever the plugin's output format or `select` (its tools run with overrideAccess: false).
 */
const notOverMcp: FieldAccess = ({ req }) => req.payloadAPI !== "MCP";

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

const labelled = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

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
  hooks: { beforeChange: [refuseWhenLocked, adoptSuggestion], afterChange: [mailEditors] },
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
        requiredFor(options.operation === "create" ? ["example"] : [], relationship as AnyValidate)(
          value,
          options,
        )) as AnyValidate,
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
    { name: "example", type: "textarea", maxLength: 1000 },
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
      admin: { position: "sidebar" },
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
