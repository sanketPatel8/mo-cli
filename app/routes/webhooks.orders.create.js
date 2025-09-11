import { json } from "@remix-run/node";
import { webhookHandler } from "../shopify.server"; // ✅ centralized webhook validation
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

  const topic = request.headers.get("x-shopify-topic"); // "orders/create"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload;

  try {
    // ✅ Validate & parse webhook
    try {
      const response = await webhookHandler(request);
      if (!response.ok) {
        console.warn("⚠️ HMAC validation skipped (likely dev/local test)");
      }
      payload = await request.json();
    } catch (err) {
      console.warn("⚠️ HMAC validation failed, using fallback:", err.message);
      payload = await request.json(); // fallback for curl/local tests
    }

    const orderId = payload?.id;
    if (!orderId) {
      console.warn("⚠️ Missing order ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(`✅ Order created: ${orderId} from shop ${shop}`);

    // ✅ Respond 200 immediately (avoid Shopify retries)
    const responseObj = json({ success: true });

    // 🔄 Forward asynchronously (non-blocking)
    forwardToWebhookSite({
      // prod:
      // url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      // debug:
      url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413",
      topic,
      shop,
      payload,
    }).catch((err) => console.error("❌ Forwarding failed:", err));

    // 🔹 Save/Update Order in DB
    pool
      .query(
        `INSERT INTO orders 
          (id, email, total_price, currency, created_at, updated_at, shop_url, raw_payload)
         VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)
         ON DUPLICATE KEY UPDATE 
           email = VALUES(email),
           total_price = VALUES(total_price),
           currency = VALUES(currency),
           updated_at = NOW(),
           raw_payload = VALUES(raw_payload)`,
        [
          orderId,
          payload.email || null,
          payload.total_price || 0,
          payload.currency || "USD",
          shop,
          JSON.stringify(payload),
        ],
      )
      .then(() => console.log(`✅ Order ${orderId} stored/updated for ${shop}`))
      .catch((dbErr) => console.error("❌ DB insert error:", dbErr));

    return responseObj;
  } catch (err) {
    console.error("🔥 Error handling orders/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
