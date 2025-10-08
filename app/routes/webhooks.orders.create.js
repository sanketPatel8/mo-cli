// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
// import { verifyShopifyHmac } from "../utils/verifyShopifyHmac";
// import pool from "../db.server";

// const processedWebhooks = new Set();

// export async function action({ request }) {
//   console.log("📥 Webhook request received: orders/create");

//   const isValid = await verifyShopifyHmac(request);

//   if (!isValid) {
//     console.error("❌ Invalid HMAC signature");
//     return json({ error: "Invalid HMAC" }, { status: 401 });
//   }

//   const topic = request.headers.get("x-shopify-topic");
//   const shop =
//     request.headers.get("x-shopify-shop-domain") ||
//     request.headers.get("x-shopify-shop");

//   const webhookId = request.headers.get("x-shopify-webhook-id");
//   console.log("Webhook ID received:", webhookId);

//   // if (processedWebhooks.has(webhookId)) {
//   //   console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
//   //   return json({ success: true, duplicate: true });
//   // }

//   processedWebhooks.add(webhookId);
//   if (processedWebhooks.size > 5000) processedWebhooks.clear();

//   let rawBody;
//   try {
//     rawBody = await request.text();
//   } catch (err) {
//     console.error("❌ Failed to read request body:", err);
//     return json({ error: "Invalid body" }, { status: 400 });
//   }

//   let payload;
//   try {
//     payload = JSON.parse(rawBody);
//   } catch (err) {
//     console.error("❌ Invalid JSON payload:", err);
//     return json({ error: "Invalid JSON" }, { status: 400 });
//   }

//   console.log(`✅ Order webhook received: ${payload?.id} from shop ${shop}`);

//   // ✅ Defer heavy work
//   queueMicrotask(async () => {
//     try {
//       // 1️⃣ Forward payload
//       await forwardToWebhookSite({
//         url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
//         topic,
//         shop,
//         payload,
//       });
//       console.log("🚀 Payload forwarded successfully");

//       // 2️⃣ Delete order from DB
//       if (payload?.id) {
//         const [res] = await pool.query(`DELETE FROM checkouts WHERE id = ?`, [
//           payload.id,
//         ]);
//         console.log(
//           `🗑️ Deleted ${res.affectedRows} row(s) for ID ${payload.id}`
//         );
//       }
//     } catch (err) {
//       console.error("❌ Forwarding or deletion failed:", err);
//     }
//   });

//   // ✅ Respond immediately so Shopify doesn't retry
//   return json({ success: true });
// }

import { json } from "@remix-run/node"; // or NextResponse.json if Next.js App Router
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import { verifyShopifyHmac } from "../utils/verifyShopifyHmac";
import pool from "../db.server";

const processedWebhooks = new Set();

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

  // 1️⃣ Read raw body
  const rawBody = await request.text();

  // 2️⃣ Verify HMAC using raw body
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const isValid = verifyShopifyHmac(rawBody, hmacHeader); // pass raw body
  if (!isValid) {
    console.error("❌ Invalid HMAC");
    return json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // 3️⃣ Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("❌ Invalid JSON payload", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // 4️⃣ Prevent duplicate processing
  if (processedWebhooks.has(payload.id)) {
    console.log(`⚠️ Webhook for order ${payload.id} already processed`);
    return json({ success: true });
  }
  processedWebhooks.add(payload.id);

  // 5️⃣ Forward immediately
  try {
    const forwardResult = await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });
    console.log("🚀 Forwarded payload:", forwardResult);
  } catch (err) {
    console.error("❌ Forward failed:", err);
  }

  // 6️⃣ Delete from DB (optional)
  if (payload?.id) {
    try {
      const [res] = await pool.query(`DELETE FROM checkouts WHERE id = ?`, [
        payload.id,
      ]);
      console.log(`🗑️ Deleted ${res.affectedRows} row(s)`);
    } catch (err) {
      console.error("❌ DB deletion failed:", err);
    }
  }

  return json({ success: true });
}
