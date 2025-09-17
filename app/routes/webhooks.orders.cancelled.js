// app/routes/webhooks.orders.cancelled.js
// import { json } from "@remix-run/node";
// import shopify from "../shopify.server.js";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   console.log("📥 Webhook received: orders/cancelled");

//   let payload = {};
//   const shop = request.headers.get("x-shopify-shop-domain");
//   const topic = request.headers.get("x-shopify-topic"); // "orders/cancelled"

//   try {
//     // ✅ Validate webhook
//     try {
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) {
//         console.warn("⚠️ HMAC validation skipped (likely local/dev test)");
//       }
//       payload = await request.json();
//     } catch (err) {
//       console.warn(
//         "⚠️ shopify.webhooks.process failed, using raw body:",
//         err.message,
//       );
//       try {
//         payload = await request.json();
//       } catch {
//         console.error("❌ Could not parse webhook payload");
//         return json({ error: "Invalid payload" }, { status: 400 });
//       }
//     }

//     if (!payload?.id) {
//       console.warn("⚠️ Missing order ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     console.log(
//       `✅ Order cancelled: #${payload.name || payload.id} (Shop: ${shop})`,
//     );

//     // ✅ Return success immediately (prevents retries)
//     const responseObj = json({ success: true });

//     // 🔄 Forward asynchronously (non-blocking)
//     try {
//       await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders/cancelled`,
//         // Debugging? → replace with webhook.site
//         // url: "https://webhook.site/xxxx-xxxx-xxxx",
//         topic,
//         shop,
//         payload,
//       });
//       console.log("📤 Forwarded orders/cancelled → Next.js API");
//     } catch (forwardErr) {
//       console.error("❌ Forwarding failed:", forwardErr);
//     }

//     return responseObj;
//   } catch (err) {
//     console.error("🔥 Error handling orders/cancelled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// import { json } from "@remix-run/node";
// import shopify from "../shopify.server.js";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// // ✅ Optional wrapper for HMAC + payload parse
// async function verifyWebhook(request) {
//   const shop = request.headers.get("x-shopify-shop-domain");
//   const topic = request.headers.get("x-shopify-topic");

//   try {
//     const { body } = await shopify.webhooks.process(request); // SDK verifies HMAC
//     let payload;
//     try {
//       payload = JSON.parse(body);
//     } catch {
//       payload = body;
//     }
//     return { valid: true, shop, topic, payload };
//   } catch (err) {
//     console.warn("⚠️ HMAC validation failed:", err.message);
//     let payload = {};
//     try {
//       payload = await request.json();
//     } catch {
//       throw new Error("Invalid webhook payload");
//     }
//     return { valid: false, shop, topic, payload };
//   }
// }

// export async function action({ request }) {
//   console.log("📥 Webhook received: orders/cancelled");

//   try {
//     const { valid, shop, topic, payload } = await verifyWebhook(request);

//     if (!payload?.id) {
//       console.warn("⚠️ Missing order ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     console.log(
//       `✅ Order cancelled: #${payload.name || payload.id} (Shop: ${shop}) | HMAC valid: ${valid}`,
//     );

//     // ✅ Immediate 200 OK (prevents Shopify retries)
//     const responseObj = json({ success: true });

//     // 🔄 Forward in background (non-blocking)
//     forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       // url: "https://webhosok.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413",
//       topic,
//       shop,
//       payload,
//     })
//       .then(() => {
//         console.log("📤 Forwarded orders/cancelled → Next.js API");
//       })
//       .catch((err) => {
//         console.error("❌ Forwarding failed:", err);
//       });

//     return responseObj;
//   } catch (err) {
//     console.error("🔥 Error handling orders/cancelled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: orders/cancelled");

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
  console.log("📥 Webhook request received: orders/cancelled");

  const topic = request.headers.get("x-shopify-topic");
  const shop =
    request.headers.get("x-shopify-shop-domain") ||
    request.headers.get("x-shopify-shop");

  // ✅ Unique webhook ID from Shopify
  const webhookId = request.headers.get("x-shopify-webhook-id");

  // 🛑 Skip if already processed
  if (processedWebhooks.has(webhookId)) {
    console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
    return json({ success: true, duplicate: true });
  }

  // ✅ Mark as processed
  processedWebhooks.add(webhookId);

  // ♻️ Cleanup if memory grows large
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
    // 🔗 Forward to Next.js API
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

  // ✅ Always return 200 quickly (so Shopify doesn’t retry)
  return json({ success: true });
}
