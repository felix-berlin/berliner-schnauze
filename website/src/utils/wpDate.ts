/** WP format (no milliseconds, no trailing Z): the date fields keep the shape WPGraphQL returned. */
export const wpDate = (iso: string | null | undefined): string | null =>
  iso ? iso.replace(/(\.\d+)?Z$/, "") : null;

/** Epoch ms of a `wpDate` value, which is UTC (`Date.parse` alone would read it in the server's timezone); NaN if absent. */
export const wpDateMs = (date: string | null | undefined): number =>
  date ? Date.parse(`${date}Z`) : Number.NaN;
