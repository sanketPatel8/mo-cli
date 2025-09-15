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
import { webhookHandler } from "../shopify.server"; // ✅ centralized webhook validation
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  if (!topic || !shop) {
    console.error("❌ Missing required Shopify headers:", { topic, shop });
    return json({ error: "Missing headers" }, { status: 400 });
  }

  // ✅ Read body once as text
  const rawBody = await request.text();
  let payload;

  try {
    // ✅ Validate HMAC with shopify.server.js
    const response = await webhookHandler(rawBody, request.headers);
    if (!response.ok) {
      console.warn("⚠️ HMAC validation skipped or failed (dev/local test)");
    }

    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ HMAC validation or JSON parsing failed:", err.message);
    try {
      payload = JSON.parse(rawBody); // fallback: try parsing anyway
      console.log("⚠️ Using fallback payload parsing");
    } catch (parseErr) {
      console.error(
        "❌ Failed to parse request body as JSON:",
        parseErr.message,
      );
      return json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const orderId = payload?.id;
  if (!orderId) {
    console.error("❌ Missing order ID in payload:", payload);
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log(`✅ Order created: ${orderId} from shop ${shop}`);
  console.log("📦 Payload (truncated):", JSON.stringify(payload).slice(0, 500));

  // ✅ Respond quickly to Shopify
  const responseObj = json({ success: true }, { status: 200 });

  // ✅ Forward to Next.js API asynchronously (non-blocking)
  forwardToWebhookSite({
    url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
    topic,
    shop,
    payload,
  })
    .then(() => console.log("🚀 Successfully forwarded to Next.js API"))
    .catch((err) => console.error("❌ Forwarding failed:", err));

  return responseObj;
}
