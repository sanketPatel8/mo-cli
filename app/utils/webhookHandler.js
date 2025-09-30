import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import { verifyShopifyHmac } from "./verifyShopifyHmac.js";

const processedWebhooks = new Set();

export async function handleWebhook(request, topic, forwardPath) {
  const shop =
    request.headers.get("x-shopify-shop-domain") ||
    request.headers.get("x-shopify-shop");

  console.log(`📥 Webhook received: ${topic}`);

  const isValid = await verifyShopifyHmac(request);

  if (!isValid) {
    console.error("❌ Invalid HMAC signature");
    return json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (processedWebhooks.has(webhookId)) {
    console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
    return json({ success: true, duplicate: true });
  }

  processedWebhooks.add(webhookId);
  if (processedWebhooks.size > 5000) processedWebhooks.clear();

  const rawBody = await request.text(); // get raw string

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`✅ ${topic} webhook payload received from shop ${shop}`);

  try {
    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/custom-send`,
      topic,
      shop,
      payload,
    });
    console.log("🚀 Payload forwarded successfully");
  } catch (err) {
    console.error("❌ Forwarding failed:", err);
  }

  return json({ success: true });
}
