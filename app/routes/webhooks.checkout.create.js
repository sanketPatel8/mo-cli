// import { json } from "@remix-run/node";
// import shopify from "../shopify.server"; // adjust path if different
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite"; // adjust path if needed

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for checkouts/create");

//     let payload;
//     try {
//       // ✅ Validate webhook with Shopify
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
//       payload = await request.json(); // fallback for curl/local tests
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic"); // "checkouts/create"

//     console.log("✅ Checkout created webhook payload:", payload);

//     // 🔗 Forward payload to your Next.js API (or webhook.site for debugging)
//     await forwardToWebhookSite({
//       // url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/checkouts/create`,
//       url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
//       topic,
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling checkouts/create webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// import { json } from "@remix-run/node";
// import shopify from "../shopify.server"; // adjust path
// import pool from "../db.server"; // MySQL pool
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for checkouts/create");

//     let payload;
//     try {
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) console.warn("⚠️ Skipping HMAC check (local test)");
//       payload = await request.json();
//     } catch (e) {
//       console.warn(
//         "⚠️ shopify.webhooks.process failed, falling back to raw body:",
//         e.message,
//       );
//       payload = await request.json();
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic");

//     console.log("✅ Checkout payload:", payload);

//     // Forward payload to webhook.site for debugging (optional)
//     await forwardToWebhookSite({
//       url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
//       topic,
//       shop,
//       payload,
//     });

//     // Prepare checkout data
//     const checkout = {
//       id: payload.id,
//       token: payload.token,
//       cart_token: payload.cart_token,
//       email: payload.email,
//       created_at: payload.created_at,
//       updated_at: payload.updated_at,
//       landing_site: payload.landing_site || null,
//       note: payload.note || null,
//       total_line_items_price: payload.total_line_items_price || 0,
//       total_tax: payload.total_tax || 0,
//       total_discounts: payload.total_discounts || 0,
//       subtotal_price: payload.subtotal_price || 0,
//       total_price: payload.total_price || 0,
//       currency: payload.currency,
//       taxes_included: payload.taxes_included || false,
//       abandoned_checkout_url: payload.abandoned_checkout_url || null,

//       customer_id: payload.customer?.id || null,
//       customer_first_name: payload.customer?.first_name || null,
//       customer_last_name: payload.customer?.last_name || null,
//       customer_email: payload.customer?.email || null,
//       customer_phone: payload.customer?.phone || null,

//       shipping_first_name: payload.shipping_address?.first_name || null,
//       shipping_last_name: payload.shipping_address?.last_name || null,
//       shipping_address1: payload.shipping_address?.address1 || null,
//       shipping_address2: payload.shipping_address?.address2 || null,
//       shipping_city: payload.shipping_address?.city || null,
//       shipping_province: payload.shipping_address?.province || null,
//       shipping_country: payload.shipping_address?.country || null,
//       shipping_zip: payload.shipping_address?.zip || null,
//       shipping_phone: payload.shipping_address?.phone || null,

//       line_items: JSON.stringify(payload.line_items || []),
//       shipping_lines: JSON.stringify(payload.shipping_lines || []),
//       tax_lines: JSON.stringify(payload.tax_lines || []),
//     };

//     // --- Check if checkout exists ---
//     const [rows] = await pool.execute("SELECT id FROM checkouts WHERE id = ?", [
//       checkout.id,
//     ]);

//     if (rows.length === 0) {
//       // Insert new checkout
//       await pool.execute(
//         `INSERT INTO checkouts (
//           id, token, cart_token, email, created_at, updated_at, landing_site, note,
//           total_line_items_price, total_tax, total_discounts, subtotal_price, total_price,
//           currency, taxes_included, abandoned_checkout_url,
//           customer_id, customer_first_name, customer_last_name, customer_email, customer_phone,
//           shipping_first_name, shipping_last_name, shipping_address1, shipping_address2,
//           shipping_city, shipping_province, shipping_country, shipping_zip, shipping_phone,
//           line_items, shipping_lines, tax_lines
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           checkout.id,
//           checkout.token,
//           checkout.cart_token,
//           checkout.email,
//           checkout.created_at,
//           checkout.updated_at,
//           checkout.landing_site,
//           checkout.note,
//           checkout.total_line_items_price,
//           checkout.total_tax,
//           checkout.total_discounts,
//           checkout.subtotal_price,
//           checkout.total_price,
//           checkout.currency,
//           checkout.taxes_included,
//           checkout.abandoned_checkout_url,
//           checkout.customer_id,
//           checkout.customer_first_name,
//           checkout.customer_last_name,
//           checkout.customer_email,
//           checkout.customer_phone,
//           checkout.shipping_first_name,
//           checkout.shipping_last_name,
//           checkout.shipping_address1,
//           checkout.shipping_address2,
//           checkout.shipping_city,
//           checkout.shipping_province,
//           checkout.shipping_country,
//           checkout.shipping_zip,
//           checkout.shipping_phone,
//           checkout.line_items,
//           checkout.shipping_lines,
//           checkout.tax_lines,
//         ],
//       );
//       console.log("✅ Checkout inserted:", checkout.id);
//     }
//     // else {
//     //   // Update existing checkout
//     //   await pool.execute(
//     //     `UPDATE checkouts SET
//     //       token = ?, cart_token = ?, email = ?, updated_at = ?, landing_site = ?, note = ?,
//     //       total_line_items_price = ?, total_tax = ?, total_discounts = ?, subtotal_price = ?, total_price = ?,
//     //       currency = ?, taxes_included = ?, abandoned_checkout_url = ?,
//     //       customer_id = ?, customer_first_name = ?, customer_last_name = ?, customer_email = ?, customer_phone = ?,
//     //       shipping_first_name = ?, shipping_last_name = ?, shipping_address1 = ?, shipping_address2 = ?,
//     //       shipping_city = ?, shipping_province = ?, shipping_country = ?, shipping_zip = ?, shipping_phone = ?,
//     //       line_items = ?, shipping_lines = ?, tax_lines = ?
//     //     WHERE id = ?`,
//     //     [
//     //       checkout.token,
//     //       checkout.cart_token,
//     //       checkout.email,
//     //       checkout.updated_at,
//     //       checkout.landing_site,
//     //       checkout.note,
//     //       checkout.total_line_items_price,
//     //       checkout.total_tax,
//     //       checkout.total_discounts,
//     //       checkout.subtotal_price,
//     //       checkout.total_price,
//     //       checkout.currency,
//     //       checkout.taxes_included,
//     //       checkout.abandoned_checkout_url,
//     //       checkout.customer_id,
//     //       checkout.customer_first_name,
//     //       checkout.customer_last_name,
//     //       checkout.customer_email,
//     //       checkout.customer_phone,
//     //       checkout.shipping_first_name,
//     //       checkout.shipping_last_name,
//     //       checkout.shipping_address1,
//     //       checkout.shipping_address2,
//     //       checkout.shipping_city,
//     //       checkout.shipping_province,
//     //       checkout.shipping_country,
//     //       checkout.shipping_zip,
//     //       checkout.shipping_phone,
//     //       checkout.line_items,
//     //       checkout.shipping_lines,
//     //       checkout.tax_lines,
//     //       checkout.id,
//     //     ],
//     //   );
//     //   console.log("✅ Checkout updated:", checkout.id);
//     // }

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling checkouts/create webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  try {
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

    // Prepare checkout data
    const checkoutData = [
      checkoutId,
      payload.token,
      payload.cart_token,
      payload.email,
      payload.created_at,
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
    ];

    // --- Insert only if not exists ---
    const sql = `
      INSERT IGNORE INTO checkouts (
        id, token, cart_token, email, created_at, updated_at,
        total_line_items_price, total_tax, subtotal_price, total_price,
        currency, line_items, shipping_lines, tax_lines, shop_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [rows] = await pool.execute("SELECT id FROM checkouts WHERE id = ?", [
      checkoutId,
    ]);

    if (rows.length === 0) {
      console.log(`⚠️ Checkout already exists, skipping insert: ${checkoutId}`);
    } else {
      const [result] = await pool.execute(sql, checkoutData);
      console.log(`✅ New checkout inserted: ${checkoutId}`);
    }

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling checkouts/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
