// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for orders/fulfilled");

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("✅ Order fulfilled webhook payload:");

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic: "orders/fulfilled",
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling orders/fulfilled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.fulfilled.js
// app/routes/webhooks.orders.fulfilled.js
// import { webhookHandler } from "../shopify.server.js";
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: orders/fulfilled");

//   const topic = request.headers.get("x-shopify-topic"); // should be "orders/fulfilled"
//   const shop = request.headers.get("x-shopify-shop-domain");

//   let payload;
//   try {
//     // ✅ Try validation first
//     try {
//       const response = await webhookHandler(request);
//       if (!response.ok) {
//         console.warn("⚠️ Webhook validation skipped (probably dev env)");
//       }
//       payload = await request.json();
//     } catch (err) {
//       console.warn("⚠️ Validation failed, fallback JSON parse:", err.message);
//       payload = await request.json();
//     }
//   } catch (err) {
//     console.error("❌ Failed to parse JSON payload:", err);
//     return json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const orderId = payload?.id;
//   console.log(`📦 Order fulfilled → ${orderId} from shop ${shop}`);

//   // ✅ Respond immediately so Shopify doesn’t retry
//   const response = json({ success: true });

//   // 🔄 Forward asynchronously (non-blocking)
//   forwardToWebhookSite({
//     url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//     // url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413", // debug
//     topic,
//     shop,
//     payload,
//   })
//     .then(() => console.log(`📤 Forwarded [${topic}] webhook → Next.js API`))
//     .catch((fwdErr) => console.error("❌ Forwarding failed:", fwdErr));

//   return response;
// }

// app/routes/webhooks.orders-update.js
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// import { webhookHandler } from "../shopify.server.js";

// // Simple in-memory dedupe (use Redis/DB in production)
// const seen = new Map(); // eventId -> timestamp

// export async function action({ request }) {
//   const topic = request.headers.get("x-shopify-topic") || "";
//   const shop = request.headers.get("x-shopify-shop-domain") || "";
//   const eventId = request.headers.get("x-shopify-event-id") || ""; // unique per event
//   const webhookId = request.headers.get("x-shopify-webhook-id") || ""; // delivery attempt id
//   const triggeredAt = request.headers.get("x-shopify-triggered-at") || "";

//   // ✅ Verify HMAC on a clone
//   try {
//     const verifyReq = request.clone();
//     const verifyRes = await webhookHandler(verifyReq);
//     if (!verifyRes?.ok) {
//       console.warn("⚠️ HMAC verification failed (dev/local?)");
//     }
//   } catch (err) {
//     console.error("❌ HMAC verify threw:", err);
//   }

//   // ✅ Read body once
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

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/fulfilled");

  const topic = request.headers.get("x-shopify-topic");

  // ✅ Fix: fallback if x-shopify-shop-domain is missing
  const shop =
    request.headers.get("x-shopify-shop-domain") ||
    request.headers.get("x-shopify-shop");

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

  // Shopify expects a 200 OK immediately to prevent retries
  return json({ success: true });
}
