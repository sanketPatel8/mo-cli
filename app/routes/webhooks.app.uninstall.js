import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  console.log("📥 Webhook request received for app/uninstalled");

  const shop = request.headers.get("x-shopify-shop-domain");
  let payload = {};

  try {
    payload = await request.json();
  } catch (e) {
    console.error("⚠️ JSON parse error:", e);
  }

  // ✅ Shopify ne pehla OK response mokli dau (retry avoid karva)
  const response = json({ success: true });

  // 🔄 Background process
  (async () => {
    try {
      // Shopify webhook idempotency handle (event id ya timestamp)
      const webhookId = request.headers.get("x-shopify-webhook-id");
      if (!webhookId) {
        console.warn("⚠️ No webhook id found");
      } else {
        const [exists] = await pool.query(
          `SELECT id FROM processed_webhooks WHERE webhook_id = ?`,
          [webhookId],
        );
        if (exists.length) {
          console.log(`🔁 Duplicate webhook skipped: ${webhookId}`);
          return;
        }

        await pool.query(
          `INSERT INTO processed_webhooks (webhook_id, topic, shop, created_at) VALUES (?, ?, ?, NOW())`,
          [webhookId, "app/uninstalled", shop],
        );
      }

      // Pela store_id fetch karo
      const [rows] = await pool.query(`SELECT id FROM stores WHERE shop = ?`, [
        shop,
      ]);
      if (!rows.length) {
        console.log(`⚠️ No store found for shop: ${shop}`);
        return;
      }

      const storeId = rows[0].id;

      // Related tables cleanup
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

      // Optional forward
      await forwardToWebhookSite({
        url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
        topic: "app/uninstalled",
        shop,
        payload,
      });
    } catch (err) {
      console.error("❌ Error handling background task:", err);
    }
  })();

  return response;
}
