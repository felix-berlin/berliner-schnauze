import { useOnline } from "@vueuse/core";

/** Shown wherever the page locks itself offline: the forms, the vote and the reactions (SPEC §15). */
export const OFFLINE_HINT =
  "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.";

/** `online` as a ref (follows `navigator.onLine` and the online/offline events). */
export { useOnline };
