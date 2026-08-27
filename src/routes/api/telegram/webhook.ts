import { createFileRoute } from "@tanstack/react-router";
import {
  ensureTelegramWebhook,
  handleTelegramUpdate,
  publicOriginFromRequest,
} from "@/lib/telegram.server";

export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = publicOriginFromRequest(request);
        const result = await ensureTelegramWebhook(origin);
        return Response.json(result);
      },
      POST: async ({ request }) => {
        const origin = publicOriginFromRequest(request);
        try {
          const update = (await request.json()) as {
            message?: { chat?: { id?: number }; text?: string };
          };
          await handleTelegramUpdate(update, origin);
        } catch (err) {
          console.error("[lumi] telegram webhook", err);
        }
        return new Response("ok");
      },
    },
  },
});
