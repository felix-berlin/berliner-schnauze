import { getUserAgentRegex } from "browserslist-useragent-regexp";
import { writeFileSync } from "node:fs";

const regexp = getUserAgentRegex({ allowHigherVersions: true });

// Serialize via .source/.flags into a `new RegExp(...)` string literal instead
// of embedding a bare `/regex/` literal — sidesteps any shell-escaping
// ambiguity from the previous `echo "export default $(...)"` approach, since
// JSON.stringify safely escapes backslashes/quotes for a JS string context.
const content = `export default new RegExp(${JSON.stringify(regexp.source)}, ${JSON.stringify(regexp.flags)});\n`;

writeFileSync(new URL("../src/utils/supportedBrowsers.mjs", import.meta.url), content);
