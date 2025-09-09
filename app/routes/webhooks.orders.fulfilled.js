// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for orders/fulfilled");

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("✅ Order fulfilled webhook payload:");

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic: "orders/fulfilled",
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling orders/fulfilled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.fulfilled.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  try {
    const topic = request.headers.get("x-shopify-topic") || "orders/fulfilled";
    const shop = request.headers.get("x-shopify-shop-domain");

    // Parse payload once
    const payload = await request.json();

    console.log(`📥 Webhook received (${topic}) from ${shop}`);
    console.log("✅ Order fulfilled webhook payload:", {
      id: payload?.id,
      name: payload?.name,
      fulfillment_status: payload?.fulfillment_status,
    });

    // Forward event to your Next.js API
    await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });

    // Respond success to Shopify
    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling orders/fulfilled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
