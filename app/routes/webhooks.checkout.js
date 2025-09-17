// import { json } from "@remix-run/node";
// import pool from "../db.server.js";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// // 🕑 Helper: IST timestamp
// function getISTDateTime() {
//   const now = new Date();
//   const ist = new Date(
//     now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
//   );
//   const y = ist.getFullYear();
//   const m = String(ist.getMonth() + 1).padStart(2, "0");
//   const d = String(ist.getDate()).padStart(2, "0");
//   const h = String(ist.getHours()).padStart(2, "0");
//   const min = String(ist.getMinutes()).padStart(2, "0");
//   const s = String(ist.getSeconds()).padStart(2, "0");
//   return `${y}-${m}-${d} ${h}:${min}:${s}`;
// }

// export async function action({ request }) {
//   try {
//     // ✅ Get shop and topic headers safely
//     const topic = request.headers.get("x-shopify-topic");
//     const shop =
//       request.headers.get("x-shopify-shop-domain") ||
//       request.headers.get("x-shopify-shop");

//     // ✅ Parse raw payload
//     let payload;
//     try {
//       payload = await request.json();
//     } catch (err) {
//       console.error("❌ Invalid JSON payload:", err);
//       return json({ error: "Invalid JSON" }, { status: 400 });
//     }

//     const checkoutId = payload?.id;
//     if (!checkoutId) {
//       console.warn("⚠️ Missing checkout ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     console.log(
//       `📥 Checkout webhook received: ${topic} | Shop: ${shop} | ID: ${checkoutId}`,
//     );

//     // 🔗 Forward payload to Next.js API and await
//     try {
//       const forwardResults = await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//         topic,
//         shop,
//         payload,
//       });
//       console.log("🚀 Payload forwarded successfully:", forwardResults);
//     } catch (err) {
//       console.error("❌ Forwarding failed:", err);
//     }

//     // 📝 Insert or update in database
//     const now = getISTDateTime();
//     try {
//       if (topic === "checkouts/create") {
//         await pool.execute(
//           `
//           INSERT INTO checkouts (
//             id, token, cart_token, email, created_at, updated_at,
//             total_line_items_price, total_tax, subtotal_price, total_price,
//             currency, abandoned_checkout_url, customer, line_items, shipping_lines, tax_lines, shop_url
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//           ON DUPLICATE KEY UPDATE
//             token = VALUES(token),
//             cart_token = VALUES(cart_token),
//             email = VALUES(email),
//             updated_at = VALUES(updated_at),
//             total_line_items_price = VALUES(total_line_items_price),
//             total_tax = VALUES(total_tax),
//             subtotal_price = VALUES(subtotal_price),
//             total_price = VALUES(total_price),
//             currency = VALUES(currency),
//             abandoned_checkout_url = VALUES(abandoned_checkout_url),
//             customer = VALUES(customer),
//             line_items = VALUES(line_items),
//             shipping_lines = VALUES(shipping_lines),
//             tax_lines = VALUES(tax_lines),
//             shop_url = VALUES(shop_url)
//           `,
//           [
//             checkoutId,
//             payload.token,
//             payload.cart_token,
//             payload.email,
//             now,
//             now,
//             payload.total_line_items_price || 0,
//             payload.total_tax || 0,
//             payload.subtotal_price || 0,
//             payload.total_price || 0,
//             payload.currency,
//             payload.abandoned_checkout_url,
//             JSON.stringify(payload.customer),
//             JSON.stringify(payload.line_items || []),
//             JSON.stringify(payload.shipping_lines || []),
//             JSON.stringify(payload.tax_lines || []),
//             shop,
//           ],
//         );
//         console.log(`✅ Checkout inserted/updated → ${checkoutId}`);
//       } else if (topic === "checkouts/update") {
//         await pool.execute(
//           `
//           UPDATE checkouts SET
//             token = ?, cart_token = ?, email = ?, updated_at = ?,
//             total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
//             currency = ?, abandoned_checkout_url = ?, customer = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
//           WHERE id = ?
//           `,
//           [
//             payload.token,
//             payload.cart_token,
//             payload.email,
//             now,
//             payload.total_line_items_price || 0,
//             payload.total_tax || 0,
//             payload.subtotal_price || 0,
//             payload.total_price || 0,
//             payload.currency,
//             payload.abandoned_checkout_url,
//             JSON.stringify(payload.customer),
//             JSON.stringify(payload.line_items || []),
//             JSON.stringify(payload.shipping_lines || []),
//             JSON.stringify(payload.tax_lines || []),
//             shop,
//             checkoutId,
//           ],
//         );
//         console.log(`✅ Checkout updated → ${checkoutId}`);
//       } else {
//         console.log(`⚠️ Unhandled webhook topic: ${topic}`);
//       }
//     } catch (err) {
//       console.error("🔥 Error saving checkout to DB:", err);
//       console.error("📝 Payload:", JSON.stringify(payload, null, 2));
//     }

//     // 🔹 Always return 200 to Shopify
//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Checkout webhook failed:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// 🛑 In-memory set to track processed webhooks
const processedWebhooks = new Set();

// 🕑 Helper: IST timestamp
function getISTDateTime() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  const h = String(ist.getHours()).padStart(2, "0");
  const min = String(ist.getMinutes()).padStart(2, "0");
  const s = String(ist.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export async function action({ request }) {
  try {
    const topic = request.headers.get("x-shopify-topic");
    const shop =
      request.headers.get("x-shopify-shop-domain") ||
      request.headers.get("x-shopify-shop");

    // ✅ Unique webhook ID from Shopify headers
    const webhookId = request.headers.get("x-shopify-webhook-id");

    // 🛑 Prevent duplicate processing
    if (processedWebhooks.has(webhookId)) {
      console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
      return json({ success: true, duplicate: true });
    }

    // ✅ Mark webhook as processed
    processedWebhooks.add(webhookId);

    // 🧹 Prevent memory leak
    if (processedWebhooks.size > 5000) {
      processedWebhooks.clear();
      console.log("♻️ Processed set cleared to free memory");
    }

    // ✅ Parse payload
    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      console.error("❌ Invalid JSON payload:", err);
      return json({ error: "Invalid JSON" }, { status: 400 });
    }

    const checkoutId = payload?.id;
    if (!checkoutId) {
      console.warn("⚠️ Missing checkout ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(
      `📥 Checkout webhook received: ${topic} | Shop: ${shop} | ID: ${checkoutId}`,
    );

    // 🔗 Forward payload to Next.js API and await
    try {
      const forwardResults = await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });
      console.log("🚀 Payload forwarded successfully:", forwardResults);
    } catch (err) {
      console.error("❌ Forwarding failed:", err);
    }

    // 📝 Insert or update in database
    const now = getISTDateTime();
    try {
      if (topic === "checkouts/create") {
        await pool.execute(
          `
          INSERT INTO checkouts (
            id, token, cart_token, email, created_at, updated_at,
            total_line_items_price, total_tax, subtotal_price, total_price,
            currency, abandoned_checkout_url, customer, line_items, shipping_lines, tax_lines, shop_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            token = VALUES(token),
            cart_token = VALUES(cart_token),
            email = VALUES(email),
            updated_at = VALUES(updated_at),
            total_line_items_price = VALUES(total_line_items_price),
            total_tax = VALUES(total_tax),
            subtotal_price = VALUES(subtotal_price),
            total_price = VALUES(total_price),
            currency = VALUES(currency),
            abandoned_checkout_url = VALUES(abandoned_checkout_url),
            customer = VALUES(customer),
            line_items = VALUES(line_items),
            shipping_lines = VALUES(shipping_lines),
            tax_lines = VALUES(tax_lines),
            shop_url = VALUES(shop_url)
          `,
          [
            checkoutId,
            payload.token,
            payload.cart_token,
            payload.email,
            now,
            now,
            payload.total_line_items_price || 0,
            payload.total_tax || 0,
            payload.subtotal_price || 0,
            payload.total_price || 0,
            payload.currency,
            payload.abandoned_checkout_url,
            JSON.stringify(payload.customer),
            JSON.stringify(payload.line_items || []),
            JSON.stringify(payload.shipping_lines || []),
            JSON.stringify(payload.tax_lines || []),
            shop,
          ],
        );
        console.log(`✅ Checkout inserted/updated → ${checkoutId}`);
      } else if (topic === "checkouts/update") {
        await pool.execute(
          `
          UPDATE checkouts SET
            token = ?, cart_token = ?, email = ?, updated_at = ?,
            total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
            currency = ?, abandoned_checkout_url = ?, customer = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
          WHERE id = ?
          `,
          [
            payload.token,
            payload.cart_token,
            payload.email,
            now,
            payload.total_line_items_price || 0,
            payload.total_tax || 0,
            payload.subtotal_price || 0,
            payload.total_price || 0,
            payload.currency,
            payload.abandoned_checkout_url,
            JSON.stringify(payload.customer),
            JSON.stringify(payload.line_items || []),
            JSON.stringify(payload.shipping_lines || []),
            JSON.stringify(payload.tax_lines || []),
            shop,
            checkoutId,
          ],
        );
        console.log(`✅ Checkout updated → ${checkoutId}`);
      } else {
        console.log(`⚠️ Unhandled webhook topic: ${topic}`);
      }
    } catch (err) {
      console.error("🔥 Error saving checkout to DB:", err);
      console.error("📝 Payload:", JSON.stringify(payload, null, 2));
    }

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Checkout webhook failed:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
