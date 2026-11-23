import { visibleName } from "payload-app/bon-names";
import { z } from "zod";

/** Visitor text without invisible format characters, trimmed. */
export const visible = z.string().transform(visibleName).pipe(z.string().trim());

/** Like `visible`, on one line: whitespace and newlines collapse to one space (a name ends up in mail bodies). */
export const visibleLine = visible.transform((s) => s.replace(/\s+/g, " "));
