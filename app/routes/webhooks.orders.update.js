// app/routes/webhooks.orders.update.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import shopify from "../shopify.server.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/updated");

    // ✅ Validate webhook with Shopify
    const response = await shopify.webhooks.process(request);
    if (!response.ok) {
      console.error("❌ Invalid webhook signature:", response.statusText);
      return json({ error: "Invalid webhook" }, { status: 401 });
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic"); // should be "orders/updated"
    const payload = await request.json();

    console.log("✅ Valid Order updated webhook payload:", payload.id);

    // ✅ Optionally forward to your API / webhook.site
    await forwardToWebhookSite({
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
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
