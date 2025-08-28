import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("✅ Order webhook received from Shopify:", payload.id);

    // Forward to your Next.js app API
    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });

    // Respond 200 so Shopify knows we got it
    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
