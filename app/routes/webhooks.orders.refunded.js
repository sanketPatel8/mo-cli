import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/refunded");

    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("✅ Order refunded webhook payload:", payload);

    // Forward to your Next.js API
    await forwardToWebhookSite({
      //   url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
      topic: "orders/refunded",
      shop,
      payload,
    });

    // Respond with 200 so Shopify knows webhook is received
    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling orders/refunded webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
