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
//       url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413",
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
  try {
    console.log("📥 Webhook request received for app/uninstalled");

    const shop = request.headers.get("x-shopify-shop-domain");
    const webhookId = request.headers.get("x-shopify-webhook-id");
    const payload = await request.json();

    console.log("✅ App uninstalled webhook payload:", payload);

    // ✅ Always respond to Shopify fast
    const response = json({ success: true });

    // 🔄 Handle work in background (don’t block Shopify response)
    (async () => {
      try {
        // ✅ Idempotency check
        const [processed] = await pool.query(
          "SELECT id FROM processed_webhooks WHERE id = ?",
          [webhookId],
        );
        if (processed.length) {
          console.log(`⚠️ Duplicate webhook ignored: ${webhookId}`);
          return;
        }
        await pool.query("INSERT INTO processed_webhooks (id) VALUES (?)", [
          webhookId,
        ]);

        // Pela store_id fetch karo
        const [rows] = await pool.query(
          `SELECT id FROM stores WHERE shop = ?`,
          [shop],
        );
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

        console.log(
          `🗑️ Deleted related template data for store_id: ${storeId}`,
        );

        // Stores table mathi delete karo
        await pool.query(`DELETE FROM stores WHERE id = ?`, [storeId]);
        console.log(`🗑️ Deleted store row for shop: ${shop}`);

        // Optional: forward payload to another service
        await forwardToWebhookSite({
          url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413",
          topic: "app/uninstalled",
          shop,
          payload,
        });

        console.log(`📤 Forwarded uninstall event for shop: ${shop}`);
      } catch (err) {
        console.error("❌ Background uninstall handler failed:", err);
      }
    })();

    return response;
  } catch (err) {
    console.error("❌ Error handling app/uninstalled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
