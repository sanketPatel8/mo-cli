// // app/routes/webhooks.orders-update.js
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// import { webhookHandler } from "../shopify.server.js";

// // Simple in-memory dedupe (use Redis/DB in production)
// const seen = new Map(); // eventId -> timestamp

// export async function action({ request }) {
//   const topic = request.headers.get("x-shopify-topic") || "";
//   const shop = request.headers.get("x-shopify-shop-domain") || "";
//   // const eventId = request.headsers.get("x-shopify-event-id") || ""; // unique per event
//   const eventId = request.headers.get("x-shopify-event-id") || "";
//   const webhookId = request.headers.get("x-shopify-webhook-id") || ""; // delivery attempt id
//   const triggeredAt = request.headers.get("x-shopify-triggered-at") || "";

//   try {
//     const verifyReq = request.clone();
//     const verifyRes = await webhookHandler(verifyReq);
//     if (!verifyRes?.ok) {
//       console.warn("⚠️ HMAC verification failed (dev/local?)");
//     }
//   } catch (err) {
//     console.error("❌ HMAC verify threw:", err);
//   }

//   let payload = {};
//   let raw = "";
//   try {
//     raw = await request.text();
//     payload = raw ? JSON.parse(raw) : {};
//   } catch (err) {
//     console.error("❌ Failed to parse webhook JSON:", err);
//   }
//   const orderId = payload?.id;

//   // ✅ Idempotency check by eventId
//   if (eventId) {
//     if (seen.has(eventId)) {
//       console.log(`🔁 Duplicate event ${eventId} ignored`);
//       return json({ success: true, deduped: true });
//     }
//     seen.set(eventId, Date.now());
//     setTimeout(() => seen.delete(eventId), 60 * 60 * 1000); // 1h TTL
//   }

//   console.log(
//     `📥 [${topic}] shop=${shop} order_id=${orderId} event=${eventId} delivery=${webhookId} at=${triggeredAt}`,
//   );

//   // ✅ ACK immediately (under 5s)
//   const ack = json({ success: true });

//   // 🚀 Fire-and-forget forwarding
//   setImmediate(async () => {
//     try {
//       await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//         topic,
//         shop,
//         payload,
//       });
//       console.log(`📤 Forwarded event ${eventId} → Next API`);
//     } catch (err) {
//       console.error(`❌ Forwarding failed for event ${eventId}`, err);
//     }
//   });

//   return ack;
// }

// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: orders/update");

//   const topic = request.headers.get("x-shopify-topic");

//   // ✅ Fix: fallback if x-shopify-shop-domain is missing
//   const shop =
//     request.headers.get("x-shopify-shop-domain") ||
//     request.headers.get("x-shopify-shop");

//   let rawBody;
//   try {
//     rawBody = await request.text();
//   } catch (err) {
//     console.error("❌ Failed to read request body:", err);
//     return json({ error: "Invalid body" }, { status: 400 });
//   }

//   let payload;
//   try {
//     payload = JSON.parse(rawBody);
//   } catch (err) {
//     console.error("❌ Invalid JSON payload:", err);
//     return json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   console.log(`✅ Order webhook received: ${payload?.id} from shop ${shop}`);

//   try {
//     // 🔗 Await the forwarding to ensure it completes
//     const results = await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic,
//       shop,
//       payload,
//     });
//     console.log("🚀 Payload forwarded successfully:", results);
//   } catch (err) {
//     console.error("❌ Forwarding failed:", err);
//   }

//   // Shopify expects a 200 OK immediately to prevent retries
//   return json({ success: true });
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

// 🛑 Track processed webhook IDs (in-memory cache)
const processedWebhooks = new Set();

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/update");

  const topic = request.headers.get("x-shopify-topic");
  const shop =
    request.headers.get("x-shopify-shop-domain") ||
    request.headers.get("x-shopify-shop");

  // ✅ Unique webhook ID provided by Shopify
  const webhookId = request.headers.get("x-shopify-webhook-id");

  // 🛑 Skip if this webhook was already processed
  if (processedWebhooks.has(webhookId)) {
    console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
    return json({ success: true, duplicate: true });
  }

  // ✅ Mark as processed
  processedWebhooks.add(webhookId);

  // ♻️ Avoid memory leak
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

  console.log(`✅ Order webhook received: ${payload?.id} from shop ${shop}`);

  try {
    // 🔗 Forward the payload to Next.js API
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

  // ✅ Always return 200 immediately (to prevent Shopify retries)
  return json({ success: true });
}
