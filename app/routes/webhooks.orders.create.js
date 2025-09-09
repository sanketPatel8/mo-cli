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

// app/routes/webhooks.orders.create.js
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
    if (orderId) {
      // 🔹 Step 1: Check if order exists
      const [rows] = await pool.query("SELECT id FROM orders WHERE id = ?", [
        orderId,
      ]);

      if (rows.length === 0) {
        // 🔹 Step 2: Insert new order
        await pool.query(
          `INSERT INTO orders 
            (id, email, total_price, currency, created_at, updated_at, shop_url, raw_payload) 
          VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
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
        console.log(
          `ℹ️ Order ${orderId} already exists in DB, skipping insert.`,
        );
      }
    } else {
      console.warn("⚠️ No order.id in payload, skipping DB insert.");
    }

    // ✅ Respond immediately so Shopify doesn’t retry
    const response = json({ success: true });

    // 🔄 Forward webhook asynchronously
    (async () => {
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
    })();

    return response;
  } catch (err) {
    console.error("🔥 Error handling orders/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
