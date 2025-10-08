// app/routes/webhooks.jsx

import { json } from "@remix-run/node";

import { webhookHandler } from "~/shopify.server.js";

export const action = async ({ request }) => {
  try {
    const response = await webhookHandler(request); // Handles and verifies webhook

    console.log("Webhook processed.", response);

    return json({ success: true });
  } catch (error) {
    console.error("Error in webhook:", error);

    return new Response("Webhook error", { status: 500 });
  }
};
