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
import shopify from "../shopify.server"; // adjust path if needed
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js"; // tamaru DB connection

export async function action({ request }) {
  console.log("📥 Webhook request received: customers/create");

  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic"); // "customers/create"

  let payload;
  try {
    // ✅ Validate Shopify webhook
    try {
      const response = await shopify.webhooks.process(request);
      if (!response.ok) {
        console.warn("⚠️ HMAC validation skipped (local/dev test)");
      }
      payload = await request.json();
    } catch (err) {
      console.warn("⚠️ HMAC validation failed, falling back:", err.message);
      payload = await request.json(); // fallback for local/curl tests
    }

    if (!payload?.id) {
      console.warn("⚠️ Missing customer ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log("✅ Customer created:", payload.id, payload.email);

    // 🔹 Prevent duplicate processing in DB
    const [existing] = await pool.query(
      `SELECT * FROM customers WHERE customer_id = ? AND shop = ?`,
      [payload.id, shop],
    );

    if (existing.length > 0) {
      console.log(
        "⚠️ Customer already processed, skipping forward:",
        payload.id,
      );
      return json({ success: true, message: "Customer already processed" });
    }

    // 🔹 Insert customer into DB (optional, for record-keeping)
    await pool.query(
      `INSERT INTO customers (customer_id, shop, payload, created_at) VALUES (?, ?, ?, NOW())`,
      [payload.id, shop, JSON.stringify(payload)],
    );

    // 🔹 Respond 200 immediately to Shopify
    const responseObj = json({ success: true });

    // 🔹 Forward asynchronously (non-blocking)
    forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/customers`,
      topic,
      shop,
      payload,
    }).catch((err) => console.error("❌ Forwarding failed:", err));

    return responseObj;
  } catch (err) {
    console.error("🔥 Error handling customers/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
