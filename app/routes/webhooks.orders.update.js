import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import { webhookHandler } from "../shopify.server.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // "orders/updated"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};

  try {
    const response = await webhookHandler(request);
    if (!response.ok) {
      console.warn("⚠️ HMAC validation skipped (likely dev/local test)");
    }
    payload = await request.json();
  } catch (err) {
    console.warn("⚠️ HMAC validation failed, using fallback:", err.message);
    payload = await request.json(); // fallback for curl/local tests
  }

  const orderId = payload?.id;
  console.log(
    `📥 Webhook [${topic}] received from ${shop}, order_id=${orderId}`,
  );

  // ✅ Always respond to Shopify immediately
  const response = json({ success: true });

  // 🔄 Forward asynchronously
  // (async () => {
  try {
    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      // url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413",
      topic,
      shop,
      payload,
    });
    console.log(`📤 Forwarded [${topic}] → Next.js API`);
  } catch (fwdErr) {
    console.error("❌ Forwarding failed:", fwdErr);
  }
  // })();

  return response;
}
