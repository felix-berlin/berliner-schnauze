import type { Access, CollectionBeforeChangeHook, FieldHook, PayloadRequest } from "payload";

import { APIError } from "payload";

import { authenticated } from "../access";

/**
 * A suggestion is locked while the word it became is live. Derived on every check from the word's `_status`, so
 * unpublishing or deleting the word (the link is dropped with it) unlocks the suggestion again.
 */
export const isLockedByWord = async (
  req: PayloadRequest,
  word: number | { id: number } | null | undefined,
): Promise<boolean> => {
  const id = typeof word === "object" ? word?.id : word;
  if (id == null) return false;
  const found = await req.payload.find({
    collection: "words",
    where: { id: { equals: id } },
    select: { _status: true },
    depth: 0,
    limit: 1,
    pagination: false,
    req,
  });
  return found.docs[0]?._status === "published";
};

export const LOCKED_MESSAGE =
  "Dieser Vorschlag ist gesperrt, weil das Wort aus ihm veröffentlicht ist. Zum Ändern das Wort zurück in den Entwurf setzen.";

/** Admin and single updates: a locked suggestion is read-only (the admin shows it so; REST and MCP get a 403). */
export const updateUnlocked: Access = async (args) => {
  if (!authenticated(args)) return false;
  if (args.id == null) return true; // bulk update: `refuseWhenLocked` checks every document
  const doc = await args.req.payload.findByID({
    collection: "suggestions",
    id: args.id,
    select: { word: true },
    depth: 0,
    req: args.req,
  });
  return !(await isLockedByWord(args.req, doc.word));
};

/** Backstop with a readable message for bulk updates (`where`) and Local API calls, which skip the check above. */
export const refuseWhenLocked: CollectionBeforeChangeHook = async ({ originalDoc, req }) => {
  if (await isLockedByWord(req, originalDoc?.word)) throw new APIError(LOCKED_MESSAGE, 403);
  return undefined;
};

/** Value of the virtual `lockedByWord` field: the admin banner and every API read tell the client the lock state. */
export const lockedByWordValue: FieldHook = ({ siblingData, req }) =>
  isLockedByWord(req, siblingData?.word);
