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

import { json } from "@remix-run/node";

import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

import crypto from "crypto";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

function verifyShopifyWebhook(rawBody, hmacHeader) {
  if (!hmacHeader || !SHOPIFY_WEBHOOK_SECRET) {
    console.warn("⚠️ Missing HMAC header or webhook secret");

    return false;
  }

  const generatedHmac = crypto

    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)

    .update(rawBody, "utf8")

    .digest("base64");

  const bufferFromGeneratedHmac = Buffer.from(generatedHmac, "base64");

  const bufferFromHeader = Buffer.from(hmacHeader, "base64");

  if (bufferFromGeneratedHmac.length !== bufferFromHeader.length) {
    console.warn("⚠️ HMAC length mismatch");

    return false;
  }

  return crypto.timingSafeEqual(bufferFromGeneratedHmac, bufferFromHeader);
}

export async function action({ request }) {
  try {
    console.log("📥 ORDERS_REFUND webhook request received");

    const shop = request.headers.get("x-shopify-shop-domain");

    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

    const rawBody = await request.text();

    // Verify HMAC

    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.warn("❌ Invalid HMAC signature");

      return json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // Parse JSON only after verifying

    const payload = JSON.parse(rawBody);

    console.log("↩️ Refund webhook payload:", payload);

    // Extract customer details

    const customer = payload.customer
      ? {
          id: payload.customer.id,

          first_name: payload.customer.first_name,

          last_name: payload.customer.last_name,

          email: payload.customer.email,

          phone: payload.customer.phone,
        }
      : null;

    console.log("👤 Extracted customer:", customer);

    // Forward to your app (optional, or handle directly here)

    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,

      topic: "refunds/create",

      shop,

      payload: { customer },
    });

    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling refunds/create webhook:", err);

    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
