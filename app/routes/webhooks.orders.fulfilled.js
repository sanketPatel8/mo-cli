import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import { verifyShopifyHmac } from "../utils/verifyShopifyHmac";

// 🛑 Simple in-memory Set to track processed webhooks (no DB needed)
const processedWebhooks = new Set();

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/fulfilled");

  // 1️⃣ Read raw body
  const rawBody = await request.text();

  // 2️⃣ Verify HMAC using raw body
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const isValid = verifyShopifyHmac(rawBody, hmacHeader); // pass raw body
  if (!isValid) {
    console.error("❌ Invalid HMAC");
    return json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // 3️⃣ Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Invalid JSON payload", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // 4️⃣ Prevent duplicate processing
  if (processedWebhooks.has(payload.id)) {
    console.log(`⚠️ Webhook for order ${payload.id} already processed`);
    return json({ success: true });
  }
  processedWebhooks.add(payload.id);

  try {
    // 🔗 Await the forwarding to ensure it completes
    const results = await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });
    console.log("🚀 Payload forwarded successfully:", results);
  } catch (err) {
    console.error("❌ Forwarding failed:", err);
  }

  // ✅ Shopify expects a 200 OK immediately to prevent retries
  return json({ success: true });
}
