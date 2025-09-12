// app/routes/webhooks.orders.cancelled.js
// import { json } from "@remix-run/node";
// import shopify from "../shopify.server.js";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   console.log("📥 Webhook received: orders/cancelled");

//   let payload = {};
//   const shop = request.headers.get("x-shopify-shop-domain");
//   const topic = request.headers.get("x-shopify-topic"); // "orders/cancelled"

//   try {
//     // ✅ Validate webhook
//     try {
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) {
//         console.warn("⚠️ HMAC validation skipped (likely local/dev test)");
//       }
//       payload = await request.json();
//     } catch (err) {
//       console.warn(
//         "⚠️ shopify.webhooks.process failed, using raw body:",
//         err.message,
//       );
//       try {
//         payload = await request.json();
//       } catch {
//         console.error("❌ Could not parse webhook payload");
//         return json({ error: "Invalid payload" }, { status: 400 });
//       }
//     }

//     if (!payload?.id) {
//       console.warn("⚠️ Missing order ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     console.log(
//       `✅ Order cancelled: #${payload.name || payload.id} (Shop: ${shop})`,
//     );

//     // ✅ Return success immediately (prevents retries)
//     const responseObj = json({ success: true });

//     // 🔄 Forward asynchronously (non-blocking)
//     try {
//       await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders/cancelled`,
//         // Debugging? → replace with webhook.site
//         // url: "https://webhook.site/xxxx-xxxx-xxxx",
//         topic,
//         shop,
//         payload,
//       });
//       console.log("📤 Forwarded orders/cancelled → Next.js API");
//     } catch (forwardErr) {
//       console.error("❌ Forwarding failed:", forwardErr);
//     }

//     return responseObj;
//   } catch (err) {
//     console.error("🔥 Error handling orders/cancelled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import shopify from "../shopify.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// ✅ Optional wrapper for HMAC + payload parse
async function verifyWebhook(request) {
  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");

  try {
    const { body } = await shopify.webhooks.process(request); // SDK verifies HMAC
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      payload = body;
    }
    return { valid: true, shop, topic, payload };
  } catch (err) {
    console.warn("⚠️ HMAC validation failed:", err.message);
    let payload = {};
    try {
      payload = await request.json();
    } catch {
      throw new Error("Invalid webhook payload");
    }
    return { valid: false, shop, topic, payload };
  }
}

export async function action({ request }) {
  console.log("📥 Webhook received: orders/cancelled");

  try {
    const { valid, shop, topic, payload } = await verifyWebhook(request);

    if (!payload?.id) {
      console.warn("⚠️ Missing order ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(
      `✅ Order cancelled: #${payload.name || payload.id} (Shop: ${shop}) | HMAC valid: ${valid}`,
    );

    // ✅ Immediate 200 OK (prevents Shopify retries)
    const responseObj = json({ success: true });

    // 🔄 Forward in background (non-blocking)
    forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    })
      .then(() => {
        console.log("📤 Forwarded orders/cancelled → Next.js API");
      })
      .catch((err) => {
        console.error("❌ Forwarding failed:", err);
      });

    return responseObj;
  } catch (err) {
    console.error("🔥 Error handling orders/cancelled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
