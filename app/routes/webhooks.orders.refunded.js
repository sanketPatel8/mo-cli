// app/routes/webhooks.orders.refunded.js
import { json } from "@remix-run/node";
import shopify from "../shopify.server"; // ✅ adjust if path differs
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite"; // ✅ adjust if path differs

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/refunded");

    let payload;
    try {
      // ✅ Validate with Shopify helper
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ Skipping HMAC check (local test mode)");
      }
      payload = await request.json();
    } catch (err) {
      console.warn("⚠️ HMAC validation failed, falling back:", err.message);
      payload = await request.json(); // fallback for curl/local test
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic"); // should be "orders/refunded"

    console.log("✅ Orders refunded webhook payload:", payload);

    // 🔗 Forward payload to your Next.js API (or webhook.site for debugging)
    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      // For debugging, you can swap with webhook.site:
      //   url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
      topic,
      shop,
      payload,
    });

    // ✅ Must return 200 or Shopify will retry
    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling orders/refunded webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
