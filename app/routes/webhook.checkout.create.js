import { json } from "@remix-run/node";
import shopify from "../shopify.server"; // adjust path if different
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite"; // adjust path if needed

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for checkouts/create");

    let payload;
    try {
      // ✅ Validate webhook with Shopify
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ Skipping HMAC check (local test)");
      }
      payload = await request.json();
    } catch (e) {
      console.warn(
        "⚠️ shopify.webhooks.process failed, falling back to raw body:",
        e.message,
      );
      payload = await request.json(); // fallback for curl/local tests
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic"); // "checkouts/create"

    console.log("✅ Checkout created webhook payload:", payload);

    // 🔗 Forward payload to your Next.js API (or webhook.site for debugging)
    await forwardToWebhookSite({
      // url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/checkouts/create`,
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
      topic,
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling checkouts/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
