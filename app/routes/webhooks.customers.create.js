import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import { verifyShopifyHmac } from "../utils/verifyShopifyHmac";

// 🛑 In-memory set to track processed webhooks (DB-free)
const processedWebhooks = new Set();

export async function action({ request }) {
  console.log("📥 Webhook request received: customer/create");

  const isValid = await verifyShopifyHmac(request);

  if (!isValid) {
    console.error("❌ Invalid HMAC signature");
    return json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const shop =
    request.headers.get("x-shopify-shop-domain") ||
    request.headers.get("x-shopify-shop");

  // ✅ Unique webhook ID from Shopify headers
  const webhookId = request.headers.get("x-shopify-webhook-id");

  // 🛑 Prevent duplicate processing
  if (processedWebhooks.has(webhookId)) {
    console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
    return json({ success: true, duplicate: true });
  }

  // ✅ Mark webhook as processed
  processedWebhooks.add(webhookId);

  // 🧹 Prevent memory leak
  if (processedWebhooks.size > 5000) {
    processedWebhooks.clear();
    console.log("♻️ Processed set cleared to free memory");
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("❌ Failed to read request body:", err);
    return json({ error: "Invalid body" }, { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Invalid JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`✅ Customer webhook received: ${payload?.id} from shop ${shop}`);

  try {
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

  // ✅ Always return 200 so Shopify doesn’t retry
  return json({ success: true });
}
