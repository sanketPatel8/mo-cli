import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received");

    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("💰 Order paid webhook payload:", payload);

    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic: "orders/paid",
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling orders/paid webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
