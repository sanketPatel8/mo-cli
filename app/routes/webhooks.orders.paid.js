import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("💰 Order paid webhook received from Shopify:", payload.id);

    await forwardToWebhookSite({
      url: "https://my-operator.vercel.app/api/shopify/orders",
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
