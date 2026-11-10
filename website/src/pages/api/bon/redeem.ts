import type { APIRoute } from "astro";

import { findPlayer, playerStats, setPlayerCookie } from "@services/bonPlayer.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reply } from "@utils/apiReply.ts";
import { redeemSchema } from "@utils/bonSchema.ts";

export const POST: APIRoute = async ({ cookies, request }) => {
  const input = redeemSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  try {
    const payload = await getPayloadClient();
    const player = await findPlayer(payload, input.data.code);
    if (!player) return reply({ error: "Den Code kenn ick nich." }, 404);
    setPlayerCookie(cookies, player.code);
    return reply({ playerName: player.name, ...(await playerStats(payload, player.id)) }, 200);
  } catch (error) {
    console.error("[bon] redeem failed:", error);
    return reply({ error: "Der Code wollte leider nich jeprüft werden." }, 502);
  }
};
