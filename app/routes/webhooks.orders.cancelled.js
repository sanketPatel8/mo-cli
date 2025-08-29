// app/routes/webhooks.orders.cancelled.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import shopify from "../shopify.server.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/cancelled");

    let payload;
    try {
      // Try verifying like a real Shopify webhook
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ Skipping HMAC check (local test)");
      }
      payload = await request.json();
    } catch (e) {
      console.warn(
        "⚠️ shopify.webhooks.process failed, falling back to raw body:",
        e.message,
      );
      payload = await request.json(); // fallback for curl / local testing
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic"); // "orders/cancelled"

    console.log("✅ Order cancelled webhook payload:", payload);

    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling orders/cancelled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
