// import { json } from "@remix-run/node";
// import shopify from "../shopify.server";
// import pool from "../db.server.js";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// function getISTDateTime() {
//   const now = new Date();
//   const ist = new Date(
//     now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
//   );
//   const year = ist.getFullYear();
//   const month = String(ist.getMonth() + 1).padStart(2, "0");
//   const day = String(ist.getDate()).padStart(2, "0");
//   const hours = String(ist.getHours()).padStart(2, "0");
//   const minutes = String(ist.getMinutes()).padStart(2, "0");
//   const seconds = String(ist.getSeconds()).padStart(2, "0");
//   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
// }

// export async function action({ request }) {
//   const topic = request.headers.get("x-shopify-topic");
//   const shopUrl = request.headers.get("x-shopify-shop-domain");

//   console.log(`📥 Webhook received: ${topic}`);

//   let payload = {};
//   try {
//     const response = await shopify.webhooks.process(request);
//     if (!response.ok) console.warn("⚠️ Skipping HMAC check (local/dev)");

//     payload = await request.json();
//   } catch (err) {
//     console.warn("⚠️ shopify.webhooks.process failed:", err.message);
//     try {
//       payload = await request.json();
//     } catch {
//       console.error("❌ Invalid payload body");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }
//   }

//   const checkoutId = payload?.id;

//   if (!checkoutId) {
//     console.warn("⚠️ No checkout ID in payload");
//     return json({ error: "Invalid payload" }, { status: 400 });
//   }

//   // ✅ Immediate 200 response to Shopify
//   const responseObj = json({ success: true });

//   // 🔄 Background async task (non-blocking)
//   (async () => {
//     const createdAt = getISTDateTime();
//     const updatedAt = getISTDateTime();

//     try {
//       switch (topic) {
//         case "checkouts/create":
//           console.log("🆕 Handling checkout CREATE:", checkoutId);

//           await pool.execute(
//             `
//             INSERT INTO checkouts (
//               id, token, cart_token, email, created_at, updated_at,
//               total_line_items_price, total_tax, subtotal_price, total_price,
//               currency, line_items, shipping_lines, tax_lines, shop_url
//             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//             ON DUPLICATE KEY UPDATE
//               token = VALUES(token),
//               cart_token = VALUES(cart_token),
//               email = VALUES(email),
//               updated_at = VALUES(updated_at),
//               total_line_items_price = VALUES(total_line_items_price),
//               total_tax = VALUES(total_tax),
//               subtotal_price = VALUES(subtotal_price),
//               total_price = VALUES(total_price),
//               currency = VALUES(currency),
//               line_items = VALUES(line_items),
//               shipping_lines = VALUES(shipping_lines),
//               tax_lines = VALUES(tax_lines),
//               shop_url = VALUES(shop_url)
//           `,
//             [
//               checkoutId,
//               payload.token,
//               payload.cart_token,
//               payload.email,
//               createdAt,
//               updatedAt,
//               payload.total_line_items_price || 0,
//               payload.total_tax || 0,
//               payload.subtotal_price || 0,
//               payload.total_price || 0,
//               payload.currency,
//               JSON.stringify(payload.line_items || []),
//               JSON.stringify(payload.shipping_lines || []),
//               JSON.stringify(payload.tax_lines || []),
//               shopUrl,
//             ],
//           );

//           console.log(`✅ Checkout inserted/updated: ${checkoutId}`);

//           // Forward only CREATE events
//           try {
//             await forwardToWebhookSite({
//               url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//               topic,
//               shop: shopUrl,
//               payload,
//             });
//             console.log(`📤 Forwarded checkout create → Next.js API`);
//           } catch (forwardErr) {
//             console.error("❌ Forwarding error:", forwardErr);
//           }
//           break;

//         case "checkouts/update":
//           console.log("♻️ Handling checkout UPDATE:", checkoutId);

//           await pool.execute(
//             `
//             UPDATE checkouts SET
//               token = ?, cart_token = ?, email = ?, updated_at = ?,
//               total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
//               currency = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
//             WHERE id = ?
//           `,
//             [
//               payload.token,
//               payload.cart_token,
//               payload.email,
//               updatedAt,
//               payload.total_line_items_price || 0,
//               payload.total_tax || 0,
//               payload.subtotal_price || 0,
//               payload.total_price || 0,
//               payload.currency,
//               JSON.stringify(payload.line_items || []),
//               JSON.stringify(payload.shipping_lines || []),
//               JSON.stringify(payload.tax_lines || []),
//               shopUrl,
//               checkoutId,
//             ],
//           );

//           console.log(`✅ Checkout updated: ${checkoutId}`);
//           break;

//         default:
//           console.log(`⚠️ Unhandled webhook topic: ${topic}`);
//       }
//     } catch (err) {
//       console.error("🔥 Error in background checkout task:", err);
//     }
//   })();

//   return responseObj;
// }

import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// 🕑 Helper: IST timestamp
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

export async function action({ request }) {
  let payload, topic, shopUrl;

  // ✅ Validate webhook (HMAC + parse)
  try {
    const { topic: t, shop, body } = await shopify.webhooks.process(request);
    topic = t;
    shopUrl = shop;
    payload = JSON.parse(body); // raw JSON → object
  } catch (err) {
    console.error("❌ Webhook validation failed:", err);
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("📥 Incoming Checkout Webhook →", { topic, shopUrl });

  // 🆔 Checkout ID
  const checkoutId = payload?.id;
  if (!checkoutId) {
    console.warn("⚠️ Missing checkout ID in payload:", payload);
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  // ✅ Immediately acknowledge Shopify
  const responseObj = json({ success: true });

  // 🔄 Process in background
  (async () => {
    const createdAt = getISTDateTime();
    const updatedAt = getISTDateTime();

    console.log(
      `🔎 Processing checkout webhook [${topic}] → ID: ${checkoutId}`,
    );

    try {
      switch (topic) {
        case "checkouts/create": {
          console.log("🆕 Checkout CREATE received:", {
            checkoutId,
            email: payload.email,
            total: payload.total_price,
            currency: payload.currency,
          });

          await pool.execute(
            `
            INSERT INTO checkouts (
              id, token, cart_token, email, created_at, updated_at,
              total_line_items_price, total_tax, subtotal_price, total_price,
              currency, line_items, shipping_lines, tax_lines, shop_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

          console.log(`✅ Checkout inserted/updated in DB → ${checkoutId}`);

          try {
            await forwardToWebhookSite({
              url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
              topic,
              shop: shopUrl,
              payload,
            });
            console.log("📤 Forwarded checkout create → Next.js API");
          } catch (forwardErr) {
            console.error("❌ Forwarding error:", forwardErr);
          }
          break;
        }

        case "checkouts/update": {
          console.log("♻️ Checkout UPDATE received:", {
            checkoutId,
            email: payload.email,
            total: payload.total_price,
            currency: payload.currency,
          });

          await pool.execute(
            `
            UPDATE checkouts SET
              token = ?, cart_token = ?, email = ?, updated_at = ?,
              total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
              currency = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
            WHERE id = ?
          `,
            [
              payload.token,
              payload.cart_token,
              payload.email,
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

          console.log(`✅ Checkout updated in DB → ${checkoutId}`);
          break;
        }

        default:
          console.log(`⚠️ Unhandled webhook topic: ${topic}`);
      }
    } catch (err) {
      console.error("🔥 Error processing checkout webhook:", err);
      console.error(
        "📝 Payload that caused error:",
        JSON.stringify(payload, null, 2),
      );
    }
  })();

  return responseObj;
}
