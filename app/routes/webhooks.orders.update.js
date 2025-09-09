// // // app/routes/webhooks.orders.update.js
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
// import shopify from "../shopify.server.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for orders/updated");

//     let payload;
//     try {
//       // Try processing like a real Shopify webhook
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
//       payload = await request.json(); // fallback for curl tests
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic");

//     console.log("✅ Order update webhook payload:");

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic,
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling orders/updated webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.update.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import shopify from "../shopify.server.js";

// Simple in-memory cache (for production, use DB/Redis)
const processedUpdates = new Set();

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/updated");

    let payload;
    try {
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ Skipping HMAC check (local/dev)");
      }
      payload = await request.json();
    } catch (e) {
      console.warn(
        "⚠️ shopify.webhooks.process failed, falling back to raw body:",
        e.message,
      );
      payload = await request.json();
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic"); // should be "orders/updated"

    const orderId = payload?.id;
    const updatedAt = payload?.updated_at;

    if (!orderId) {
      console.warn("⚠️ Missing order ID in payload, skipping.");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    // ✅ Deduplication key = orderId + updatedAt
    const dedupeKey = `${orderId}-${updatedAt}`;
    if (processedUpdates.has(dedupeKey)) {
      console.log(
        `⏭️ Skipping duplicate update for order ${orderId} (${updatedAt})`,
      );
      return json({ success: true, duplicate: true });
    }
    processedUpdates.add(dedupeKey);

    console.log(`✅ Forwarding order update for ${orderId} (${updatedAt})`);

    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling orders/updated webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
