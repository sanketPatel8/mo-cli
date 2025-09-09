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
  const topic = request.headers.get("x-shopify-topic") || "orders/fulfilled";
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    // ✅ Single read of JSON
    payload = await request.json();
  } catch (err) {
    console.error("❌ Invalid webhook payload:", err);
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log(`📥 Webhook received (${topic}) from ${shop}`);
  console.log("✅ Order fulfilled webhook payload:", {
    id: payload?.id,
    name: payload?.name,
    fulfillment_status: payload?.fulfillment_status,
  });

  // 🔴 Immediate 200 response to Shopify
  const responseObj = json({ success: true });

  // 🔄 Background async task
  (async () => {
    try {
      // 🔗 Forward event to your Next.js API
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });

      console.log("📤 Forwarded orders/fulfilled webhook successfully");
    } catch (err) {
      console.error("🔥 Error in background orders/fulfilled task:", err);
    }
  })();

  return responseObj;
}
