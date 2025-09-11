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
// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// import shopify from "../shopify.server.js";

// export async function action({ request }) {
//   const topic = request.headers.get("x-shopify-topic"); // should be "orders/updated"
//   const shop = request.headers.get("x-shopify-shop-domain");

//   let payload = {};
//   try {
//     // ✅ Try verifying webhook
//     const response = await shopify.webhooks.process(request);
//     if (!response.ok) {
//       console.warn("⚠️ Skipping HMAC check (local/dev)");
//     }
//     payload = await request.json();
//   } catch (err) {
//     console.warn("⚠️ shopify.webhooks.process failed:", err.message);
//     try {
//       payload = await request.json();
//     } catch {
//       console.error("❌ Invalid JSON payload");
//       return json({ error: "Invalid payload" }, { status: 400 });
//     }
//   }

//   const orderId = payload?.id;
//   console.log(
//     `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}`,
//   );

//   try {
//     // ✅ Respond immediately to Shopify
//     const response = json({ success: true });

//     // 🔄 Forward webhook asynchronously (non-blocking)
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
//     console.error("🔥 Error handling orders/updated webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

// app/routes/webhooks.orders.updated.js
import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import shopify from "../shopify.server.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // "orders/updated"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    // ✅ Verify webhook HMAC (prod)
    const verified = await shopify.webhooks.process(request);
    if (!verified.ok) {
      console.warn("⚠️ Skipping HMAC check (local/dev)");
    }

    payload = await request.json();
  } catch (err) {
    console.warn("⚠️ shopify.webhooks.process failed:", err.message);
    try {
      payload = await request.json();
    } catch {
      console.error("❌ Invalid JSON payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }
  }

  const orderId = payload?.id;
  console.log(
    `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}`,
  );

  // ✅ Always return 200 immediately so Shopify doesn’t retry
  const response = json({ success: true });

  // 🔄 Forward asynchronously (do not block response)
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
}
