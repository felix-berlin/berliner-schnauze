import type { CollectionAfterChangeHook, CollectionConfig, FieldAccess } from "payload";

import { authenticatedOnly } from "../access";
import { adoptSuggestion } from "../hooks/adoptSuggestion";
import { lockedByWordValue, refuseWhenLocked, updateUnlocked } from "../hooks/suggestionLock";
import { notifyEditors } from "../lib/notifyEditors";

/** Mails the editors about a new suggestion; a failed mail is logged, the suggestion stays in the admin. */
const mailEditors: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
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

/**
 * The sender's name and mail never reach an MCP client (and so the model): Payload drops the fields from every MCP
 * read, write result and query, whatever the plugin's output format or `select` (its tools run with overrideAccess: false).
 */
const notOverMcp: FieldAccess = ({ req }) => req.payloadAPI !== "MCP";

/** Words suggested through the site's form. The site creates them through the Local API (after Turnstile). */
export const Suggestions: CollectionConfig = {
  slug: "suggestions",
  // A suggestion whose word is live is locked (hooks/suggestionLock.ts).
  access: { ...authenticatedOnly, update: updateUnlocked },
  admin: {
    useAsTitle: "berlinerWord",
    defaultColumns: ["berlinerWord", "translation", "status", "createdAt"],
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
    { name: "berlinerWord", type: "text", required: true, maxLength: 100 },
    { name: "translation", type: "text", required: true, maxLength: 300 },
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
