// // app/routes/webhooks.orders.refund.js

// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 ORDERS_REFUND webhook request received");

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("↩️ Refund webhook payload:", payload);

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`, // reuse same endpoint
//       topic: "refunds/create", // changed from "orders/paid"
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling refunds/create webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.refunds.create.js

import { json } from "@remix-run/node";
import shopify from "../shopify.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import pool from "../db.server.js";

export async function action({ request }) {
  try {
    console.log("📥 REFUNDS_CREATE webhook received");

    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("↩️ Refund webhook payload:", payload);

    // 1. Get session from DB
    const [rows] = await pool.query(
      "SELECT accessToken FROM sessions WHERE shop = ? ORDER BY updatedAt DESC LIMIT 1",
      [shop],
    );

    if (!rows.length) {
      throw new Error(`No session found for shop: ${shop}`);
    }

    const accessToken = rows[0].accessToken;

    // 2. Create REST client using session token
    const client = new shopify.api.clients.Rest({
      session: {
        shop,
        accessToken,
      },
    });

    // 3. Fetch order details using order_id from webhook payload
    const orderResponse = await client.get({
      path: `orders/${payload.order_id}`,
    });

    const order = orderResponse.body.order;
    const customer = order?.customer;

    // 4. Extract only customer details
    const customerDetails = {
      id: customer?.id,
      name: `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim(),
      email: customer?.email,
      phone: customer?.phone,
    };

    console.log("👤 Customer details:", customerDetails);

    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`, // reuse same endpoint
      topic: "refunds/create",
      shop,
      payload: customerDetails,
    });

    return json({ success: true, customer: customerDetails });
  } catch (err) {
    console.error("❌ Error handling refund webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
