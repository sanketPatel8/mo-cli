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
// app/routes/webhooks.orders.fulfilled.js
import { json } from "@remix-run/node";
import { webhookHandler } from "../shopify.server"; // ✅ for validation
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/fulfilled");

  const topic = request.headers.get("x-shopify-topic"); // should be "orders/fulfilled"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload;
  try {
    // ✅ Try validation first
    try {
      const response = await webhookHandler(request);
      if (!response.ok) {
        console.warn("⚠️ Webhook validation skipped (probably dev env)");
      }
      payload = await request.json();
    } catch (err) {
      console.warn("⚠️ Validation failed, fallback JSON parse:", err.message);
      payload = await request.json();
    }
  } catch (err) {
    console.error("❌ Failed to parse JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload?.id;
  console.log(`📦 Order fulfilled → ${orderId} from shop ${shop}`);

  // ✅ Respond immediately so Shopify doesn’t retry
  const response = json({ success: true });

  // 🔄 Forward asynchronously (non-blocking)
  forwardToWebhookSite({
    url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
    // url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413", // debug
    topic,
    shop,
    payload,
  })
    .then(() => console.log(`📤 Forwarded [${topic}] webhook → Next.js API`))
    .catch((fwdErr) => console.error("❌ Forwarding failed:", fwdErr));

  return response;
}
