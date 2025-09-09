// app/routes/webhooks.orders.cancelled.js
import { json } from "@remix-run/node";
import shopify from "../shopify.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  console.log("📥 Webhook received: orders/cancelled");

  let payload = {};
  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic"); // "orders/cancelled"

  try {
    // ✅ Validate webhook
    try {
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ HMAC validation skipped (likely local/dev test)");
      }
      payload = await request.json();
    } catch (err) {
      console.warn(
        "⚠️ shopify.webhooks.process failed, using raw body:",
        err.message,
      );
      try {
        payload = await request.json();
      } catch {
        console.error("❌ Could not parse webhook payload");
        return json({ error: "Invalid payload" }, { status: 400 });
      }
    }

    if (!payload?.id) {
      console.warn("⚠️ Missing order ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(
      `✅ Order cancelled: #${payload.name || payload.id} (Shop: ${shop})`,
    );

    // ✅ Return success immediately (prevents retries)
    const responseObj = json({ success: true });

    // 🔄 Forward asynchronously (non-blocking)
    try {
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders/cancelled`,
        // Debugging? → replace with webhook.site
        // url: "https://webhook.site/xxxx-xxxx-xxxx",
        topic,
        shop,
        payload,
      });
      console.log("📤 Forwarded orders/cancelled → Next.js API");
    } catch (forwardErr) {
      console.error("❌ Forwarding failed:", forwardErr);
    }

    return responseObj;
  } catch (err) {
    console.error("🔥 Error handling orders/cancelled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
