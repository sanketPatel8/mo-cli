// // import { json } from "@remix-run/node";
// // import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// // import pool from "../db.server.js";

// // export async function action({ request }) {
// //   try {
// //     console.log("📥 Webhook request received for app/uninstalled");

// //     const shop = request.headers.get("x-shopify-shop-domain");
// //     const webhookId = request.headers.get("x-shopify-webhook-id");
// //     const payload = await request.json();

// //     console.log("✅ App uninstalled webhook payload:", payload);

// //     // ✅ Always respond to Shopify fast
// //     const response = json({ success: true });

// //     // 🔄 Handle work in background (don’t block Shopify response)
// //     (async () => {
// //       try {
// //         // Pela store_id fetch karo
// //         const [rows] = await pool.query(
// //           `SELECT id FROM stores WHERE shop = ?`,
// //           [shop],
// //         );
// //         if (!rows.length) {
// //           console.log(`⚠️ No store found for shop: ${shop}`);
// //           return;
// //         }

// //         const storeId = rows[0].id;

// //         // Related tables mathi delete
// //         await pool.query(`DELETE FROM template WHERE store_id = ?`, [storeId]);
// //         await pool.query(`DELETE FROM template_data WHERE store_id = ?`, [
// //           storeId,
// //         ]);
// //         await pool.query(`DELETE FROM template_variable WHERE store_id = ?`, [
// //           storeId,
// //         ]);
// //         await pool.query(`DELETE FROM category_event WHERE store_id = ?`, [
// //           storeId,
// //         ]);

// //         console.log(
// //           `🗑️ Deleted related template data for store_id: ${storeId}`,
// //         );

// //         // Stores table mathi delete karo
// //         await pool.query(`DELETE FROM stores WHERE id = ?`, [storeId]);
// //         console.log(`🗑️ Deleted store row for shop: ${shop}`);

// //         // Optional: forward payload to another service
// //         await forwardToWebhookSite({
// //           url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
// //           topic: "app/uninstalled",
// //           shop,
// //           payload,
// //         });

// //         console.log(`📤 Forwarded uninstall event for shop: ${shop}`);
// //       } catch (err) {
// //         console.error("❌ Background uninstall handler failed:", err);
// //       }
// //     })();

// //     return response;
// //   } catch (err) {
// //     console.error("❌ Error handling app/uninstalled webhook:", err);
// //     return json({ error: "Webhook failed" }, { status: 500 });
// //   }
// // }

// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// import pool from "../db.server.js";

// export async function action({ request }) {
//   console.log("📥 Webhook request received: app/uninstalled");

//   const shop = request.headers.get("x-shopify-shop-domain");
//   const webhookId = request.headers.get("x-shopify-webhook-id");

//   let payload = {};
//   try {
//     payload = await request.json();
//   } catch {
//     console.warn("⚠️ No JSON body in app/uninstalled webhook");
//   }

//   // ✅ Respond immediately to Shopify
//   const response = json({ success: true });

//   // 🔄 Handle cleanup async (non-blocking)
//   (async () => {
//     const connection = await pool.getConnection();
//     try {
//       await connection.beginTransaction();

//       // 1️⃣ Find store_id
//       const [rows] = await pool.query(
//         `SELECT id FROM stores WHERE shop = ? LIMIT 1`,
//         [shop],
//       );
//       if (!rows.length) {
//         console.log(`⚠️ No store found for shop: ${shop}`);
//         await connection.release();
//         return;
//       }

//       const storeId = rows[0].id;
//       console.log(`🔎 Found store_id: ${storeId} for shop: ${shop}`);

//       // 2️⃣ Delete related rows
//       const tables = [
//         "template",
//         "template_data",
//         "template_variable",
//         "category_event",
//       ];
//       for (const table of tables) {
//         await pool.query(`DELETE FROM ${table} WHERE store_id = ?`, [storeId]);
//         console.log(`🗑️ Deleted rows from ${table} for store_id ${storeId}`);
//       }

//       // 3️⃣ Delete store itself
//       await pool.query(`DELETE FROM stores WHERE id = ?`, [storeId]);
//       console.log(`🗑️ Deleted store row for shop: ${shop}`);

//       await connection.commit();

//       // 4️⃣ Forward uninstall event (optional)
//       try {
//         await forwardToWebhookSite({
//           url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/uninstall`,
//           topic: "app/uninstalled",
//           shop,
//           payload,
//         });
//         console.log(`📤 Forwarded uninstall event for shop: ${shop}`);
//       } catch (fwdErr) {
//         console.error("❌ Forwarding uninstall event failed:", fwdErr);
//       }
//     } catch (err) {
//       await connection.rollback();
//       console.error("❌ Uninstall cleanup failed, rolled back:", err);
//     } finally {
//       connection.release();
//     }
//   })();

//   return response;
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  console.log("📥 Webhook request received: app/uninstalled");

  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json();
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

    // 4️⃣ Forward uninstall event (optional)
    try {
      await forwardToWebhookSite({
        url: `https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413`,
        topic: "app/uninstalled",
        shop,
        payload,
      });
      console.log(`📤 Forwarded uninstall event for shop: ${shop}`);
    } catch (fwdErr) {
      console.error("❌ Forwarding uninstall event failed:", fwdErr);
    }
  } catch (err) {
    console.error("❌ Uninstall cleanup failed:", err);
  }
  // })();

  return response;
}
