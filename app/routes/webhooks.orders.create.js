import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // should be "orders/create"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    console.error("❌ Failed to parse webhook JSON:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload?.id;
  console.log(
    `📥 Webhook [${topic}] received from ${shop}, order_id=${orderId}`,
  );

  try {
    // ✅ Respond immediately so Shopify doesn’t retry
    const response = json({ success: true });

    // 🔄 Forward webhook asynchronously
    try {
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });
      console.log(`📤 Forwarded [${topic}] webhook → Next.js API`);
    } catch (fwdErr) {
      console.error("❌ Forwarding failed:", fwdErr);
    }

    if (orderId) {
      // 🔹 Step 1: Check if order exists

      pool.query(
        `INSERT INTO orders 
    (id, email, total_price, currency, created_at, updated_at, shop_url, raw_payload)
   VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)
   ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [
          orderId,
          payload.email || null,
          payload.total_price || 0,
          payload.currency || "USD",
          shop,
          JSON.stringify(payload),
        ],
      );
      console.log(`✅ Order ${orderId} inserted for shop ${shop}`);
    } else {
      console.log(`ℹ️ Order ${orderId} already exists in DB, skipping insert.`);
    }

    return response;
  } catch (err) {
    console.error("🔥 Error handling orders/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
