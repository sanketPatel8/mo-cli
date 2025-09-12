import { json } from "@remix-run/node";
import { webhookHandler } from "../shopify.server"; // ✅ centralized webhook validation
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: orders/create");

//   const topic = request.headers.get("x-shopify-topic"); // "orders/create"
//   const shop = request.headers.get("x-shopify-shop-domain");

//   let payload = await request.json();

//   try {
//     // ✅ Validate & parse webhook
//     try {
//       const response = await webhookHandler(request);
//       if (!response.ok) {
//         console.warn("⚠️ HMAC validation skipped (likely dev/local test)");
//       }
//       payload = await request.json();
//     } catch (err) {
//       console.warn("⚠️ HMAC validation failed, using fallback:", err.message);
//       payload = await request.json(); // fallback for curl/local tests
//     }

//     const orderId = payload?.id;
//     if (!orderId) {
//       console.warn("⚠️ Missing order ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     console.log(`✅ Order created: ${orderId} from shop ${shop}`);

//     // ✅ Respond 200 immediately (avoid Shopify retries)
//     const responseObj = json({ success: true });

//     // 🔄 Forward asynchronously (non-blocking)
//     forwardToWebhookSite({
//       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       topic,
//       shop,
//       payload,
//     }).catch((err) => console.error("❌ Forwarding failed:", err));

//     return responseObj;
//   } catch (err) {
//     console.error("🔥 Error handling orders/create webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // ✅ read body once as text
  const rawBody = await request.text();
  let payload;

  try {
    // ✅ Pass rawBody to webhookHandler (so it can validate HMAC)
    const response = await webhookHandler(rawBody, request.headers);
    if (!response.ok) {
      console.warn("⚠️ HMAC validation skipped (likely dev/local test)");
    }
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.warn("⚠️ HMAC validation failed, using fallback:", err.message);
    payload = JSON.parse(rawBody); // ✅ safe, already read
  }

  const orderId = payload?.id;
  if (!orderId) {
    console.warn("⚠️ Missing order ID in payload");
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log(`✅ Order created: ${orderId} from shop ${shop}`);

  const responseObj = json({ success: true });

  forwardToWebhookSite({
    url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
    topic,
    shop,
    payload,
  }).catch((err) => console.error("❌ Forwarding failed:", err));

  return responseObj;
}
