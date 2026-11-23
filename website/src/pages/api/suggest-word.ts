import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { parseSubmission, reply, submitFailure } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";
import { suggestWordSchema } from "@utils/suggestWordSchema.ts";

/**
 * Validates, then checks the Turnstile token server-side (the browser check alone protects nothing), then stores the
 * suggestion in Payload, whose hook mails the editors.
 */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const parsed = await parseSubmission(request, clientAddress, suggestWordSchema, {
    plainInvalid: true,
  });
  if ("response" in parsed) return parsed.response;

  try {
    await (await getPayloadClient()).create({ collection: "suggestions", data: parsed.data });
  } catch (error) {
    logRouteError("suggest-word", error);
    return submitFailure(error, "Dein Wort konnte leider nicht gesendet werden.");
  }
  return reply({ sent: true }, 200);
};
