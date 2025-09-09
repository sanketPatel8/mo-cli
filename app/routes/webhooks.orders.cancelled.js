// // app/routes/webhooks.orders.cancelled.js
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
// import shopify from "../shopify.server.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for orders/cancelled");

//     let payload;
//     try {
//       // Try verifying like a real Shopify webhook
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) {
//         console.warn("⚠️ Skipping HMAC check (local test)");
//       }
//       payload = await request.json();
//     } catch (e) {
//       console.warn(
//         "⚠️ shopify.webhooks.process failed, falling back to raw body:",
//         e.message,
//       );
//       payload = await request.json(); // fallback for curl / local testing
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic"); // "orders/cancelled"

//     console.log("✅ Order cancelled webhook payload:");

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic,
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling orders/cancelled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import shopify from "../shopify.server.js";
import pool from "../db.server.js";

export async function action({ request }) {
  console.log("📥 Webhook request received for orders/cancelled");

  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic"); // "orders/cancelled"
  let payload = {};

  try {
    // ✅ Verify webhook (HMAC check)
    const response = await shopify.webhooks.process(request);
    if (!response.ok) console.warn("⚠️ Skipping HMAC check (local/dev)");

    // Single read of JSON
    payload = await request.json();
  } catch (e) {
    console.warn(
      "⚠️ shopify.webhooks.process failed, falling back to raw body:",
      e.message,
    );
    try {
      payload = await request.json();
    } catch {
      console.error("❌ Invalid webhook payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }
  }

  // 🔴 Immediate 200 response to Shopify
  const responseObj = json({ success: true });

  // 🔄 Background async task
  (async () => {
    try {
      // ✅ Idempotency check using webhook_id
      const webhookId = request.headers.get("x-shopify-webhook-id");
      if (webhookId) {
        const [exists] = await pool.query(
          `SELECT id FROM processed_webhooks WHERE webhook_id = ?`,
          [webhookId],
        );
        if (exists.length) {
          console.log(`🔁 Duplicate webhook skipped: ${webhookId}`);
          return;
        }

        await pool.query(
          `INSERT INTO processed_webhooks (webhook_id, topic, shop, created_at) VALUES (?, ?, ?, NOW())`,
          [webhookId, topic, shop],
        );
      } else {
        console.warn("⚠️ No webhook id found, cannot ensure idempotency");
      }

      // Optional: Forward payload to another service
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });

      console.log("📤 Forwarded orders/cancelled webhook successfully");
    } catch (err) {
      console.error("🔥 Error handling orders/cancelled webhook:", err);
    }
  })();

  return responseObj;
}
