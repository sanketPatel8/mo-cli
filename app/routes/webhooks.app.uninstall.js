import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  console.log("📥 Webhook request received for app/uninstalled");

  let payload = {};
  try {
    payload = await request.json();
  } catch (e) {
    console.error("⚠️ JSON parse error:", e);
  }

  const response = json({ success: true }); // immediate 200

  // 🔄 Background cleanup task
  (async () => {
    try {
      const shopHeader = request.headers.get("x-shopify-shop-domain");
      if (!shopHeader) {
        console.error("⚠️ No shop domain in headers");
        return;
      }

      // ✅ Normalize shop URL (remove https:// if stored differently)
      const shop = shopHeader.replace(/^https?:\/\//, "").toLowerCase();

      // 🔹 Idempotency check
      const webhookId = request.headers.get("x-shopify-webhook-id");
      if (webhookId) {
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

      // 🔹 Fetch store
      const [storeRows] = await pool.query(
        `SELECT id FROM stores WHERE REPLACE(LOWER(shop), 'https://', '') = ?`,
        [shop],
      );

      if (!storeRows.length) {
        console.log(`⚠️ No store found for shop: ${shop}`);
        return;
      }

      const storeId = storeRows[0].id;
      console.log(
        `🛠️ Found store_id: ${storeId}, proceeding to delete related data.`,
      );

      // 🔹 Delete child tables first
      const childTables = [
        "template_variable",
        "template_data",
        "template",
        "category_event",
      ];

      for (const table of childTables) {
        const [result] = await pool.query(
          `DELETE FROM ${table} WHERE store_id = ?`,
          [storeId],
        );
        console.log(`🗑️ Deleted ${result.affectedRows} rows from ${table}`);
      }

      // 🔹 Delete store
      const [storeDel] = await pool.query(`DELETE FROM stores WHERE id = ?`, [
        storeId,
      ]);
      console.log(
        `🗑️ Deleted ${storeDel.affectedRows} store row for shop: ${shop}`,
      );

      // 🔹 Forward webhook if needed
      await forwardToWebhookSite({
        url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
        topic: "app/uninstalled",
        shop,
        payload,
      });
      console.log("📤 Forwarded app/uninstalled webhook successfully");
    } catch (err) {
      console.error("🔥 Error in background task:", err);
    }
  })();

  return response;
}
