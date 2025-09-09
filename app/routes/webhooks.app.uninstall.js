// import { json } from "@remix-run/node";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
// import pool from "../db.server.js";

// export async function action({ request }) {
//   try {
//     console.log("📥 Webhook request received for app/uninstalled");

//     const shop = request.headers.get("x-shopify-shop-domain");
//     const payload = await request.json();

//     console.log("✅ App uninstalled webhook payload:", payload);

//     // Pela store_id fetch karo
//     const [rows] = await pool.query(`SELECT id FROM stores WHERE shop = ?`, [
//       shop,
//     ]);
//     if (!rows.length) {
//       console.log(`⚠️ No store found for shop: ${shop}`);
//       return json({ success: true });
//     }

//     const storeId = rows[0].id;

//     // Related tables mathi delete
//     await pool.query(`DELETE FROM template WHERE store_id = ?`, [storeId]);
//     await pool.query(`DELETE FROM template_data WHERE store_id = ?`, [storeId]);
//     await pool.query(`DELETE FROM template_variable WHERE store_id = ?`, [
//       storeId,
//     ]);
//     await pool.query(`DELETE FROM category_event WHERE store_id = ?`, [
//       storeId,
//     ]);

//     console.log(`🗑️ Deleted related template data for store_id: ${storeId}`);

//     // Stores table mathi delete karo
//     await pool.query(`DELETE FROM stores WHERE id = ?`, [storeId]);
//     console.log(`🗑️ Deleted store row for shop: ${shop}`);

//     // Optional: forward payload to another service
//     await forwardToWebhookSite({
//       url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
//       topic: "app/uninstalled",
//       shop,
//       payload,
//     });

//     return json({ success: true });
//   } catch (err) {
//     console.error("❌ Error handling app/uninstalled webhook:", err);
//     return json({ error: "Webhook failed" }, { status: 500 });
//   }
// }

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  console.log("📥 Webhook request received for app/uninstalled");

  const shop = request.headers.get("x-shopify-shop-domain");
  let payload;

  try {
    payload = await request.json();
  } catch (e) {
    console.error("⚠️ JSON parse error:", e);
    payload = {};
  }

  // 🔴 Shopify ne pehla OK return karvo → no retry
  const response = json({ success: true });

  // 🔄 Fire-and-forget background task
  (async () => {
    try {
      // Pela store_id fetch karo
      const [rows] = await pool.query(`SELECT id FROM stores WHERE shop = ?`, [
        shop,
      ]);
      if (!rows.length) {
        console.log(`⚠️ No store found for shop: ${shop}`);
        return;
      }

      const storeId = rows[0].id;

      // Related tables mathi delete
      await pool.query(`DELETE FROM template WHERE store_id = ?`, [storeId]);
      await pool.query(`DELETE FROM template_data WHERE store_id = ?`, [
        storeId,
      ]);
      await pool.query(`DELETE FROM template_variable WHERE store_id = ?`, [
        storeId,
      ]);
      await pool.query(`DELETE FROM category_event WHERE store_id = ?`, [
        storeId,
      ]);

      console.log(`🗑️ Deleted related template data for store_id: ${storeId}`);

      // Stores table mathi delete karo
      await pool.query(`DELETE FROM stores WHERE id = ?`, [storeId]);
      console.log(`🗑️ Deleted store row for shop: ${shop}`);

      // Optional: forward payload to another service
      await forwardToWebhookSite({
        url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
        topic: "app/uninstalled",
        shop,
        payload,
      });
    } catch (err) {
      console.error(
        "❌ Error handling background task for app/uninstalled:",
        err,
      );
    }
  })();

  return response;
}
