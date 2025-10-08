import { json } from "@remix-run/node";

import pool from "../db.server.js";
import { verifyShopifyHmac } from "../utils/verifyShopifyHmac.js";

// 🛑 Track processed webhook IDs (in-memory cache)
const processedWebhooks = new Set();

export async function action({ request }) {
  console.log("📥 Webhook request received: app/uninstalled");
  const isValid = await verifyShopifyHmac(request);

  if (!isValid) {
    console.error("❌ Invalid HMAC signature");
    return json({ error: "Invalid HMAC" }, { status: 401 });
  }
  const shop = request.headers.get("x-shopify-shop-domain");

  // const rawBody = await request.text(); // get raw string

  // let payload = {};
  // try {
  //   payload = await request.json();
  //   console.log("✅ App uninstalled payload:", payload);
  // } catch {
  //   console.warn("⚠️ No JSON body in uninstall webhook (expected empty)");
  // }

  const topic = request.headers.get("x-shopify-topic");

  // ✅ Unique webhook ID from Shopify
  const webhookId = request.headers.get("x-shopify-webhook-id");

  // 🛑 Skip if already processed
  if (processedWebhooks.has(webhookId)) {
    console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
    return json({ success: true, duplicate: true });
  }

  // ✅ Mark as processed
  processedWebhooks.add(webhookId);

  // ♻️ Cleanup if memory grows large
  if (processedWebhooks.size > 5000) {
    processedWebhooks.clear();
    console.log("♻️ Processed set cleared to free memory");
  }

  const rawBody = await request.text(); // read body only once
  let payload = {};
  try {
    payload = JSON.parse(rawBody); // parse manually
    console.log("✅ App uninstalled payload:", payload);
  } catch {
    console.warn("⚠️ No JSON body in uninstall webhook (expected empty)");
  }

  // ✅ Respond to Shopify fast (avoid retries)
  const response = json({ success: true });

  // 🔄 Cleanup in background
  // (async () => {
  try {
    // 1️⃣ Find store_id
    const [rows] = await pool.query(
      `SELECT id FROM stores WHERE shop = ? LIMIT 1`,
      [shop],
    );

    if (!rows.length) {
      console.log(`⚠️ No store found for shop: ${shop}`);
      return;
    }

    const storeId = rows[0].id;
    console.log(`🔎 Found store_id: ${storeId} for shop: ${shop}`);

    // 2️⃣ Delete related rows
    const tables = [
      "template",
      "template_data",
      "template_variable",
      "category_event",
    ];
    for (const table of tables) {
      const [res] = await pool.query(
        `DELETE FROM ${table} WHERE store_id = ?`,
        [storeId],
      );
      console.log(`🗑️ Deleted ${res.affectedRows} rows from ${table}`);
    }

    // 3️⃣ Delete store itself
    const [res] = await pool.query(`DELETE FROM stores WHERE id = ?`, [
      storeId,
    ]);
    console.log(`🗑️ Deleted ${res.affectedRows} row from stores for ${shop}`);
  } catch (err) {
    console.error("❌ Uninstall cleanup failed:", err);
  }
  // })();

  return response;
}

// import { json } from "@remix-run/node";
// import pool from "../db.server.js";
// import { verifyShopifyHmac } from "../utils/verifyShopifyHmac.js";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: app/uninstalled");

//   // 1️⃣ Read the body only once
//   const rawBody = await request.text();

//   // 2️⃣ Verify HMAC using rawBody
//   const isValid = await verifyShopifyHmac(rawBody, request.headers);
//   if (!isValid) {
//     console.error("❌ Invalid HMAC signature");
//     return json({ error: "Invalid HMAC" }, { status: 401 });
//   }

//   // 3️⃣ Parse JSON payload safely
//   let payload = {};
//   try {
//     payload = JSON.parse(rawBody);
//     console.log("✅ App uninstalled payload:", payload);
//   } catch {
//     console.warn("⚠️ No JSON body in uninstall webhook (expected empty)");
//   }

//   const shop = request.headers.get("x-shopify-shop-domain");
//   if (!shop) {
//     console.error("❌ Missing shop header");
//     return json({ error: "Missing shop header" }, { status: 400 });
//   }

//   // 4️⃣ Respond to Shopify immediately
//   const response = json({ success: true });

//   // 5️⃣ Cleanup in background asynchronously
//   (async () => {
//     try {
//       // Find store_id
//       const [rows] = await pool.query(
//         `SELECT id FROM stores WHERE shop = ? LIMIT 1`,
//         [shop],
//       );

//       if (!rows.length) {
//         console.log(`⚠️ No store found for shop: ${shop}`);
//         return;
//       }

//       const storeId = rows[0].id;
//       console.log(`🔎 Found store_id: ${storeId} for shop: ${shop}`);

//       // Delete related tables
//       const tables = [
//         "template",
//         "template_data",
//         "template_variable",
//         "category_event",
//       ];
//       for (const table of tables) {
//         const [res] = await pool.query(
//           `DELETE FROM ${table} WHERE store_id = ?`,
//           [storeId],
//         );
//         console.log(`🗑️ Deleted ${res.affectedRows} rows from ${table}`);
//       }

//       // Delete store itself
//       const [res] = await pool.query(`DELETE FROM stores WHERE id = ?`, [
//         storeId,
//       ]);
//       console.log(`🗑️ Deleted ${res.affectedRows} row from stores for ${shop}`);
//     } catch (err) {
//       console.error("❌ Uninstall cleanup failed:", err);
//     }
//   })();

//   return response;
// }
