import { json } from "@remix-run/node";
import { webhookHandler } from "../shopify.server"; // ✅ centralized webhook validation
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

  const topic = request.headers.get("x-shopify-topic"); // "orders/create"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = await request.json();

  try {
    const orderId = payload?.id;
    if (!orderId) {
      console.warn("⚠️ Missing order ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(`✅ Order created: ${orderId} from shop ${shop}`);

    // ✅ Respond 200 immediately (avoid Shopify retries)
    const responseObj = json({ success: true });

    // 🔄 Forward asynchronously (non-blocking)
    forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    }).catch((err) => console.error("❌ Forwarding failed:", err));

    return responseObj;
  } catch (err) {
    console.error("🔥 Error handling orders/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
