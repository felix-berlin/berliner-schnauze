import { atom } from "nanostores";

/** The form currently open on the word page (SPEC §13: only one at a time); `null` = all closed. A form id is its type. */
export const openForm = atom<null | string>(null);

/** Opens `id`; the form that was open closes itself (it keeps its input in memory). */
export const openContributeForm = (id: string): void => openForm.set(id);

/** Closes `id` only when it is the open one, so a late close of an old form cannot shut a newer one. */
export const closeContributeForm = (id: string): void => {
  if (openForm.get() === id) openForm.set(null);
};
