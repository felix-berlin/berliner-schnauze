/**
 * What the footer shows above the legal links: `sign` the word sign, `app` the sign until the app install callout
 * appears, `callout` a page's own callout (never passed by hand: derived from the layout's `footer-callout` slot).
 */
export type FooterMode = "app" | "callout" | "sign";

/** The layout's `footerCallout` prop: `app` offers the install callout where possible, `none` shows only the sign. */
export type FooterCalloutOption = "app" | "none";

/** A page that fills the `footer-callout` slot always wins; otherwise the prop decides. */
export const resolveFooterMode = (hasSlot: boolean, callout: FooterCalloutOption): FooterMode =>
  hasSlot ? "callout" : callout === "none" ? "sign" : "app";
