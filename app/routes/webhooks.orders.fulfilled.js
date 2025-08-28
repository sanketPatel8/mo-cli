import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/fulfilled");

    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("✅ Order fulfilled webhook payload:", payload);

    await forwardToWebhookSite({
      url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
      topic: "orders/fulfilled",
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling orders/fulfilled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
