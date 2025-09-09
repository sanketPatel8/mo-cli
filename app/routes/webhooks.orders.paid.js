// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received");

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("💰 Order paid webhook payload:");

//     await forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic: "orders/paid",
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling orders/paid webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.paid.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // should be "orders/paid"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload?.id;
  console.log(
    `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}`,
  );

  try {
    // ✅ Respond immediately to Shopify
    const response = json({ success: true });

    // 🔄 Forward asynchronously (non-blocking)
    (async () => {
      try {
        await forwardToWebhookSite({
          url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
          topic,
          shop,
          payload,
        });
        console.log(`📤 Forwarded [${topic}] webhook → Next.js API`);
      } catch (fwdErr) {
        console.error("❌ Forwarding failed:", fwdErr);
      }
    })();

    return response;
  } catch (err) {
    console.error("🔥 Error handling orders/paid webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
