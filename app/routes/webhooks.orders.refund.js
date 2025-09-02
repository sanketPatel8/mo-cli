// // app/routes/webhooks.orders.refund.js
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
// import shopify from "../shopify.server.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for orders/refund");

//     let payload;
//     try {
//       // Try verifying like a real Shopify webhook
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
//       payload = await request.json(); // fallback for curl / local testing
//     }

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const topic = request.headers.get("x-shopify-topic"); // "orders/refund"

//     console.log("✅ Order refund webhook payload:");

//     await forwardToWebhookSite({
//       //   url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//       url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
//       topic,
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("🔥 Error handling orders/refund webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks/orders/refund.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import shopify from "../shopify.server.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for orders/refund");

    let payload;
    try {
      // HMAC validation (optional for local testing)
      if (shopify?.webhooks?.process) {
        const response = await shopify.webhooks.process(request);
        if (!response.ok) console.warn("⚠️ Skipping HMAC check (local test)");
      }
      payload = await request.json();
    } catch (e) {
      console.warn(
        "⚠️ shopify.webhooks.process failed, falling back:",
        e.message,
      );
      payload = await request.json();
    }

    const shop = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic");

    console.log("✅ Order refund webhook payload:", payload);

    const result = await forwardToWebhookSite({
      url: `https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21`,
      topic,
      shop,
      payload,
    });

    console.log("📤 Forward result:", result);

    return json({
      success: true,
      message: "Refund webhook received and forwarded",
      forwardResult: result,
    });
  } catch (err) {
    console.error("🔥 Error handling orders/refund webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
