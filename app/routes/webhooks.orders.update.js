import { json } from "@remix-run/node";
import pool from "../db.server.js"; // MySQL pool
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/updated");

    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("✅ Order updated webhook payload:", payload);

    // Optional: forward to another service (like your Next.js API)
    await forwardToWebhookSite({
      //   url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
      topic: "orders/updated",
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling orders/updated webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
