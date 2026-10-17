// Shared with the Astro app via `payload-app/routes`: keep it free of payload/next/config imports.

/** Public path prefix of each collection with its own page. */
export const ROUTES = { pages: "", posts: "/magazin", themen: "/themen", words: "/wort" } as const;

export type RoutedCollection = keyof typeof ROUTES;

export const isRoutedCollection = (slug: string | undefined): slug is RoutedCollection =>
  slug !== undefined && Object.hasOwn(ROUTES, slug);

/** Site path of a doc, e.g. `/wort/kiez`. */
export const docPath = (collection: RoutedCollection, slug: string): string => `${ROUTES[collection]}/${slug}`;
