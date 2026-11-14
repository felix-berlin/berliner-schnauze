// Sass import aliases, shared by astro.config.mjs and the Sass unit tests.
export const sassAliases = {
  "@sass-butler/": new URL("./node_modules/@felix_berlin/sass-butler/", import.meta.url),
  "@styles/": new URL("./src/styles/", import.meta.url),
};

/** Sass importer that resolves the aliases above. */
export const sassAliasImporter = {
  findFileUrl(url) {
    for (const [prefix, base] of Object.entries(sassAliases)) {
      if (url.startsWith(prefix)) return new URL(url.slice(prefix.length), base);
    }
    return null;
  },
};
