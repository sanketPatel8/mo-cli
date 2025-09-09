// import { json } from "@remix-run/node";
// import shopify from "../shopify.server";
// import pool from "../db.server.js";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   try {
//     const topic = request.headers.get("x-shopify-topic");
//     const shopUrl = request.headers.get("x-shopify-shop-domain");

//     console.log(`📥 Webhook received: ${topic}`);

//     let payload;
//     try {
//       // Verify webhook (HMAC check)
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) console.warn("⚠️ Skipping HMAC check (local/dev)");
//       payload = await request.json();
//     } catch (err) {
//       console.warn("⚠️ shopify.webhooks.process failed:", err.message);
//       payload = await request.json();
//     }

//     const checkoutId = payload.id;
//     if (!checkoutId) {
//       console.warn("⚠️ No checkout ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     function getISTDateTime() {
//       const now = new Date();
//       const ist = new Date(
//         now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
//       );

//       const year = ist.getFullYear();
//       const month = String(ist.getMonth() + 1).padStart(2, "0");
//       const day = String(ist.getDate()).padStart(2, "0");
//       const hours = String(ist.getHours()).padStart(2, "0");
//       const minutes = String(ist.getMinutes()).padStart(2, "0");
//       const seconds = String(ist.getSeconds()).padStart(2, "0");

//       return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
//     }

//     const createdAt = getISTDateTime();
//     const updatedAt = getISTDateTime();

//     switch (topic) {
//       case "checkouts/create":
//         console.log("🆕 Handling checkout CREATE:", checkoutId);

//         // Try insert
//         await pool.execute(
//           `
//           INSERT IGNORE INTO checkouts (
//             id, token, cart_token, email, created_at, updated_at,
//             total_line_items_price, total_tax, subtotal_price, total_price,
//             currency, line_items, shipping_lines, tax_lines, shop_url
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//           [
//             checkoutId,
//             payload.token,
//             payload.cart_token,
//             payload.email,
//             createdAt,
//             updatedAt,
//             payload.total_line_items_price || 0,
//             payload.total_tax || 0,
//             payload.subtotal_price || 0,
//             payload.total_price || 0,
//             payload.currency,
//             JSON.stringify(payload.line_items || []),
//             JSON.stringify(payload.shipping_lines || []),
//             JSON.stringify(payload.tax_lines || []),
//             shopUrl,
//           ],
//         );

//         console.log(`✅ Checkout created/inserted: ${checkoutId}`);

//         const shop = request.headers.get("x-shopify-shop-domain");

//         await forwardToWebhookSite({
//           url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//           // url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
//           topic,
//           shop,
//           payload,
//         });

//         break;

//       case "checkouts/update":
//         console.log("♻️ Handling checkout UPDATE:", checkoutId);

//         // Update existing
//         await pool.execute(
//           `
//           UPDATE checkouts SET
//             token = ?, cart_token = ?, email = ?, created_at = ?, updated_at = ?,
//             total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
//             currency = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
//           WHERE id = ?
//         `,
//           [
//             payload.token,
//             payload.cart_token,
//             payload.email,
//             createdAt,
//             updatedAt,
//             payload.total_line_items_price || 0,
//             payload.total_tax || 0,
//             payload.subtotal_price || 0,
//             payload.total_price || 0,
//             payload.currency,
//             JSON.stringify(payload.line_items || []),
//             JSON.stringify(payload.shipping_lines || []),
//             JSON.stringify(payload.tax_lines || []),
//             shopUrl,
//             checkoutId,
//           ],
//         );

//         console.log(`✅ Checkout updated: ${checkoutId}`);
//         break;

//       default:
//         console.log(`⚠️ Unhandled webhook topic: ${topic}`);
//     }

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Checkout webhook error:", err);
//     return json({ error: "Webhook processing failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic");
  const shopUrl = request.headers.get("x-shopify-shop-domain");

  console.log(`📥 Webhook received: ${topic}`);

  let payload;
  try {
    // ✅ Validate webhook (HMAC check)
    const response = await shopify.webhooks.process(request);
    if (!response.ok) console.warn("⚠️ Skipping HMAC check (local/dev)");

    // Parse body
    payload = await request.json();
  } catch (err) {
    console.warn("⚠️ shopify.webhooks.process failed:", err.message);
    try {
      payload = await request.json();
    } catch {
      console.error("❌ Invalid payload body");
      return json({ error: "Invalid payload" }, { status: 400 });
    }
  }

  const checkoutId = payload?.id;
  if (!checkoutId) {
    console.warn("⚠️ No checkout ID in payload");
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  // 🔴 Return success to Shopify immediately → stops retries
  const response = json({ success: true });

  // 🔄 Background async task (fire & forget)
  (async () => {
    try {
      function getISTDateTime() {
        const now = new Date();
        const ist = new Date(
          now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        );
        const year = ist.getFullYear();
        const month = String(ist.getMonth() + 1).padStart(2, "0");
        const day = String(ist.getDate()).padStart(2, "0");
        const hours = String(ist.getHours()).padStart(2, "0");
        const minutes = String(ist.getMinutes()).padStart(2, "0");
        const seconds = String(ist.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }

      const createdAt = getISTDateTime();
      const updatedAt = getISTDateTime();

      switch (topic) {
        case "checkouts/create":
          console.log("🆕 Handling checkout CREATE:", checkoutId);

          // Insert or ignore duplicate
          await pool.execute(
            `
            INSERT IGNORE INTO checkouts (
              id, token, cart_token, email, created_at, updated_at,
              total_line_items_price, total_tax, subtotal_price, total_price,
              currency, line_items, shipping_lines, tax_lines, shop_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              checkoutId,
              payload.token,
              payload.cart_token,
              payload.email,
              createdAt,
              updatedAt,
              payload.total_line_items_price || 0,
              payload.total_tax || 0,
              payload.subtotal_price || 0,
              payload.total_price || 0,
              payload.currency,
              JSON.stringify(payload.line_items || []),
              JSON.stringify(payload.shipping_lines || []),
              JSON.stringify(payload.tax_lines || []),
              shopUrl,
            ],
          );

          console.log(`✅ Checkout inserted: ${checkoutId}`);

          // Forward to Next.js API (fire & forget)
          await forwardToWebhookSite({
            url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
            topic,
            shop: shopUrl,
            payload,
          });
          break;

        case "checkouts/update":
          console.log("♻️ Handling checkout UPDATE:", checkoutId);

          await pool.execute(
            `
            UPDATE checkouts SET
              token = ?, cart_token = ?, email = ?, created_at = ?, updated_at = ?,
              total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
              currency = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
            WHERE id = ?
          `,
            [
              payload.token,
              payload.cart_token,
              payload.email,
              createdAt,
              updatedAt,
              payload.total_line_items_price || 0,
              payload.total_tax || 0,
              payload.subtotal_price || 0,
              payload.total_price || 0,
              payload.currency,
              JSON.stringify(payload.line_items || []),
              JSON.stringify(payload.shipping_lines || []),
              JSON.stringify(payload.tax_lines || []),
              shopUrl,
              checkoutId,
            ],
          );

          console.log(`✅ Checkout updated: ${checkoutId}`);
          break;

        default:
          console.log(`⚠️ Unhandled webhook topic: ${topic}`);
      }
    } catch (err) {
      console.error("🔥 Error in background checkout task:", err);
    }
  })();

  return response;
}
