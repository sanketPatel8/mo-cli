// app/routes/webhooks/shopify.jsx

import { json } from "@remix-run/node";

import { webhookHandler } from "../../shopify.server"; // Make sure this matches your setup

export const action = async ({ request }) => {
  try {
    // This will verify the HMAC, get the topic and shop, and run the correct handler

    await webhookHandler(request);

    return json({ success: true });
  } catch (error) {
    console.error("❌ Error processing Shopify webhook:", error);

    return new Response("Webhook error", { status: 500 });
  }
};
