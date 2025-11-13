import { json } from "@remix-run/node";

import { webhookHandler } from "~/shopify.server.js";

export const action = async ({ request }) => {
  try {
    await webhookHandler(request);

    return json({ success: true });
  } catch (error) {
    console.error("❌ Error processing Shopify webhook:", error);

    return new Response("Webhook error", { status: 500 });
  }
};
