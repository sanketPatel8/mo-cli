// import { json } from "@remix-run/node";
// import shopify from "../shopify.server"; // adjust path if different
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite"; // adjust path if you have helper

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for customers/create");

//     let payload;
//     try {
//       // Try validating as a real Shopify webhook
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
//       payload = await request.json(); // fallback for curl / local tests
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic"); // "customers/create"

//     console.log("✅ Customer created webhook payload:", payload);

//     // 🔗 Forward payload to your Next.js API (or webhook.site for debugging)
//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       // url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
//       topic,
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling customers/create webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import shopify from "../shopify.server"; // adjust path if different
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  console.log("📥 Webhook request received for customers/create");

  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic"); // "customers/create"
  let payload = {};

  try {
    // ✅ Verify webhook (HMAC check)
    const response = await shopify.webhooks.process(request);
    if (!response.ok) console.warn("⚠️ Skipping HMAC check (local/dev)");
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

  // 🔴 Immediate 200 response
  const responseObj = json({ success: true });

  // 🔄 Background processing
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
      console.log("📤 Forwarded customers/create webhook successfully");
    } catch (err) {
      console.error("🔥 Error handling customers/create webhook:", err);
    }
  })();

  return responseObj;
}
