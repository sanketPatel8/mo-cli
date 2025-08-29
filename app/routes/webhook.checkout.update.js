import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for checkouts/update");

    let payload;
    try {
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ Skipping HMAC check (local test)");
      }
      payload = await request.json();
    } catch (e) {
      console.warn("⚠️ shopify.webhooks.process failed:", e.message);
      payload = await request.json();
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic"); // "checkouts/update"

    console.log("🔄 Checkout updated webhook payload:", payload);

    await forwardToWebhookSite({
      // url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/checkouts/update`,
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
      topic,
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling checkouts/update webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
