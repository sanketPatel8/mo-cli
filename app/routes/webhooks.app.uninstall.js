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
