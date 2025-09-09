// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// import pool from "../db.server.js";

// export async function action({ request }) {
//   try {
//     const topic = request.headers.get("x-shopify-topic");
//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("✅ Order webhook received from Shopify:", payload.checkout_id);

//     // 🔹 Step 1: Check if checkout exists
//     const [rows] = await pool.query("SELECT id FROM checkouts WHERE id = ?", [
//       payload.checkout_id,
//     ]);

//     if (rows.length > 0) {
//       // 🔹 Step 2: Delete if found
//       await pool.query("DELETE FROM checkouts WHERE id = ?", [
//         payload.checkout_id,
//       ]);
//       console.log(`🗑️ Checkout ${payload.checkout_id} deleted.`);
//     } else {
//       console.log("ℹ️ Checkout not found, skipping delete.");
//     }

//     // Forward to your Next.js app API
//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic,
//       shop,
//       payload,
//     });

//     // Respond 200 so Shopify knows we got it
//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // e.g. "orders/cancelled"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json(); // ✅ Single read
  } catch (err) {
    console.error("❌ Invalid webhook payload:", err);
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log(`📥 Webhook received (${topic}) from ${shop}`);

  // 🔴 Immediate 200 to Shopify
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

      // ✅ Handle checkout deletion for cancelled orders
      if (topic === "orders/cancelled" && payload.checkout_id) {
        console.log("🔍 Checking checkout in DB:", payload.checkout_id);

        const [rows] = await pool.query(
          "SELECT id FROM checkouts WHERE id = ?",
          [payload.checkout_id],
        );

        if (rows.length > 0) {
          await pool.query("DELETE FROM checkouts WHERE id = ?", [
            payload.checkout_id,
          ]);
          console.log(`🗑️ Checkout ${payload.checkout_id} deleted.`);
        } else {
          console.log("ℹ️ Checkout not found, skipping delete.");
        }
      }

      // 🔗 Forward event for downstream processing
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });
      console.log(`📤 Forwarded ${topic} webhook successfully`);
    } catch (err) {
      console.error("🔥 Error in background webhook task:", err);
    }
  })();

  return responseObj;
}
