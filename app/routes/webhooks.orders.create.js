// import { json } from "@remix-run/node";
// import { webhookHandler } from "../shopify.server"; // ✅ centralized webhook validation
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: orders/create");

//   const topic = request.headers.get("x-shopify-topic");
//   const shop = request.headers.get("x-shopify-shop-domain");

//   // ✅ read body once as text
//   const rawBody = await request.text();
//   let payload;

//   try {
//     // ✅ Pass rawBody to webhookHandler (so it can validate HMAC)
//     const response = await webhookHandler(rawBody, request.headers);
//     if (!response.ok) {
//       console.warn("⚠️ HMAC validation skipped (likely dev/local test)");
//     }
//     payload = JSON.parse(rawBody);
//   } catch (err) {
//     console.warn("⚠️ HMAC validation failed, using fallback:", err.message);
//     payload = JSON.parse(rawBody); // ✅ safe, already read
//   }

//   const orderId = payload?.id;
//   if (!orderId) {
//     console.warn("⚠️ Missing order ID in payload");
//     return json({ error: "Invalid payload" }, { status: 400 });
//   }

//   console.log(`✅ Order created: ${orderId} from shop ${shop}`);

//   const responseObj = json({ success: true });

//   forwardToWebhookSite({
//     url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//     topic,
//     shop,
//     payload,
//   }).catch((err) => console.error("❌ Forwarding failed:", err));

//   return responseObj;
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

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

  console.log(`✅ Order webhook received: ${payload?.id} from shop ${shop}`);

  // 🔗 Forward raw payload to Next.js API
  forwardToWebhookSite({
    url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
    topic,
    shop,
    payload,
  })
    .then(() => console.log("🚀 Payload forwarded successfully"))
    .catch((err) => console.error("❌ Forwarding failed:", err));

  // Shopify ne hamesha 200 return karvo, nahi to retry thay
  return json({ success: true });
}
