// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received");

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("💰 Order paid webhook payload:");

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic: "orders/paid",
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling orders/paid webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.paid.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic") || "orders/paid";
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    // ✅ Single read of JSON
    payload = await request.json();
  } catch (err) {
    console.error("❌ Invalid webhook payload:", err);
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log(`📥 Webhook received (${topic}) from ${shop}`);
  console.log("💰 Order paid webhook payload:", {
    id: payload?.id,
    name: payload?.name,
    total_price: payload?.total_price,
    financial_status: payload?.financial_status,
  });

  // 🔴 Immediate 200 response to Shopify
  const responseObj = json({ success: true });

  // 🔄 Background async task
  (async () => {
    try {
      // ✅ Idempotency check
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

      // 🔗 Forward event to Next.js API or external service
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });

      console.log("📤 Forwarded orders/paid webhook successfully");
    } catch (err) {
      console.error("🔥 Error in background orders/paid task:", err);
    }
  })();

  return responseObj;
}
