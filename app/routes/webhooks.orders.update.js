// // app/routes/webhooks.orders.update.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import shopify from "../shopify.server.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/updated");

    let payload;
    try {
      // Try processing like a real Shopify webhook
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
      payload = await request.json(); // fallback for curl tests
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic");

    console.log("✅ Order update webhook payload:");

    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling orders/updated webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
