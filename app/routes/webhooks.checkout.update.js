// import { json } from "@remix-run/node";
// import shopify from "../shopify.server";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for checkouts/update");

//     let payload;
//     try {
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) {
//         console.warn("⚠️ Skipping HMAC check (local test)");
//       }
//       payload = await request.json();
//     } catch (e) {
//       console.warn("⚠️ shopify.webhooks.process failed:", e.message);
//       payload = await request.json();
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic"); // "checkouts/update"

//     console.log("🔄 Checkout updated webhook payload:", payload);

//     await forwardToWebhookSite({
//       // url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/checkouts/update`,
//       url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
//       topic,
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling checkouts/update webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for checkouts/update");

    let payload;
    try {
      const response = await shopify.webhooks.process(request);
      if (!response.ok) console.warn("⚠️ Skipping HMAC check (local test)");
      payload = await request.json();
    } catch (e) {
      console.warn("⚠️ shopify.webhooks.process failed:", e.message);
      payload = await request.json();
    }

    const shopUrl = request.headers.get("x-shopify-shop-domain");
    const checkoutId = payload.id;

    console.log("🔄 Checkout update payload:", payload);

    // Forward to webhook.site for testing
    await forwardToWebhookSite({
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
      topic: request.headers.get("x-shopify-topic"),
      shop: shopUrl,
      payload,
    });

    // Prepare checkout data for update
    const checkoutData = [
      payload.token,
      payload.cart_token,
      payload.email,
      payload.updated_at,
      payload.total_line_items_price || 0,
      payload.total_tax || 0,
      payload.subtotal_price || 0,
      payload.total_price || 0,
      payload.currency,
      JSON.stringify(payload.line_items || []),
      JSON.stringify(payload.shipping_lines || []),
      JSON.stringify(payload.tax_lines || []),
      shopUrl,
      checkoutId, // WHERE id = ?
    ];

    // Update query — only updates existing row
    const sql = `
      UPDATE checkouts SET
        token = ?,
        cart_token = ?,
        email = ?,
        updated_at = ?,
        total_line_items_price = ?,
        total_tax = ?,
        subtotal_price = ?,
        total_price = ?,
        currency = ?,
        line_items = ?,
        shipping_lines = ?,
        tax_lines = ?,
        shop_url = ?
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, checkoutData);

    if (result.affectedRows === 0) {
      console.log(`⚠️ Checkout not found, nothing updated: ${checkoutId}`);
    } else {
      console.log(`✅ Checkout updated successfully: ${checkoutId}`);
    }

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling checkouts/update webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
