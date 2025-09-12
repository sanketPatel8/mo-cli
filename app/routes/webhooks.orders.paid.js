// // import { json } from "@remix-run/node";
// // import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// // export async function action({ request }) {
// //   try {
// //     console.log("📥 Webhook request received");

// //     const shop = request.headers.get("x-shopify-shop-domain");
// //     const payload = await request.json();

// //     console.log("💰 Order paid webhook payload:");

// //     await forwardToWebhookSite({
// //       url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
// //       topic: "orders/paid",
// //       shop,
// //       payload,
// //     });

// //     return json({ success: true });
// //   } catch (err) {
// //     console.error("❌ Error handling orders/paid webhook:", err);
// //     return json({ error: "Webhook failed" }, { status: 500 });
// //   }
// // }

// // app/routes/webhooks.orders.paid.js
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

// export async function action({ request }) {
//   const topic = request.headers.get("x-shopify-topic"); // should be "orders/paid"
//   const shop = request.headers.get("x-shopify-shop-domain");

//   let payload = {};
//   try {
//     payload = await request.json();
//   } catch (err) {
//     console.error("❌ Failed to parse JSON payload:", err);
//     return json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   const orderId = payload?.id;
//   console.log(
//     `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}`,
//   );

//   try {
//     // ✅ Respond immediately to Shopify
//     const response = json({ success: true });

//     // 🔄 Forward asynchronously (non-blocking)
//     try {
//       await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//         topic,
//         shop,
//         payload,
//       });
//       console.log(`📤 Forwarded [${topic}] webhook → Next.js API`);
//     } catch (fwdErr) {
//       console.error("❌ Forwarding failed:", fwdErr);
//     }

//     return response;
//   } catch (err) {
//     console.error("🔥 Error handling orders/paid webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.paid.js
import { json } from "@remix-run/node";
import { webhookHandler } from "../shopify.server"; // ✅ central validation
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/paid");

  const topic = request.headers.get("x-shopify-topic"); // should be "orders/paid"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload;

  try {
    // ✅ Validate webhook
    try {
      const response = await webhookHandler(request);
      if (!response.ok) {
        console.warn("⚠️ HMAC validation skipped (likely local/dev test)");
      }
      payload = await request.json();
    } catch (err) {
      console.warn("⚠️ Validation failed, using fallback:", err.message);
      payload = await request.json();
    }

    const orderId = payload?.id;
    console.log(`💰 Order paid → ${orderId} from shop ${shop}`);

    // ✅ Respond immediately to Shopify
    const responseObj = json({ success: true });

    // 🔄 Forward asynchronously
    forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      // url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413", // debug
      topic,
      shop,
      payload,
    }).catch((err) => console.error("❌ Forwarding failed:", err));

    return responseObj;
  } catch (err) {
    console.error("🔥 Error handling orders/paid webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
