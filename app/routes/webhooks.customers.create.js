// import { json } from "@remix-run/node";
// import shopify from "../shopify.server"; // adjust path if needed
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js"; // ensure .js if in ESM

// export async function action({ request }) {
//   console.log("📥 Webhook request received: customers/create");

//   let payload = {};
//   const shop = request.headers.get("x-shopify-shop-domain");
//   const topic = request.headers.get("x-shopify-topic"); // "customers/create"

//   try {
//     // ✅ Validate webhook
//     try {
//       const response = await shopify.webhooks.process(request);
//       if (!response.ok) {
//         console.warn("⚠️ HMAC validation skipped (likely local/dev test)");
//       }
//       payload = await request.json();
//     } catch (err) {
//       console.warn("⚠️ HMAC validation failed, falling back:", err.message);
//       try {
//         payload = await request.json();
//       } catch {
//         console.error("❌ Could not parse webhook payload");
//         return json({ error: "Invalid payload" }, { status: 400 });
//       }
//     }

//     if (!payload?.id) {
//       console.warn("⚠️ Missing customer ID in payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }

//     console.log("✅ Customer created:", payload.id, payload.email);

//     // ✅ Respond 200 to Shopify right away
//     const responseObj = json({ success: true });

//     // 🔄 Process asynchronously (non-blocking)
//     try {
//       await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/customers`,
//         // Or use webhook.site for debugging:
//         // url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
//         topic,
//         shop,
//         payload,
//       });
//       console.log("📤 Forwarded customers/create → Next.js API");
//     } catch (forwardErr) {
//       console.error("❌ Forwarding error:", forwardErr);
//     }

//     return responseObj;
//   } catch (err) {
//     console.error("🔥 Error handling customers/create webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  console.log("📥 Webhook request received: customers/create");

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  let rawBody;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("❌ Failed to read request body:", err);
    return json({ error: "Invalid body" }, { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Invalid JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`✅ Order webhook received: ${payload?.id} from shop ${shop}`);

  // 🔗 Forward raw payload to Next.js API
  forwardToWebhookSite({
    url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
    topic,
    shop,
    payload,
  })
    .then(() => console.log("🚀 Payload forwarded successfully"))
    .catch((err) => console.error("❌ Forwarding failed:", err));

  // Shopify ne hamesha 200 return karvo, nahi to retry thay
  return json({ success: true });
}
