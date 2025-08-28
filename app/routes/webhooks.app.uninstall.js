import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../../utils/forwardToWebhookSite.js";
import pool from "../db.server.js";

export async function action({ request }) {
  try {
    console.log("📥 Webhook request received for app/uninstalled");

    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("✅ App uninstalled webhook payload:", payload);

    // Delete the shop's session/data from your database
    await pool.query(`DELETE FROM sessions WHERE shop = ?`, [shop]);
    await pool.query(`DELETE FROM shops WHERE shop = ?`, [shop]); // if you store shop info

    console.log(`🗑️ Cleaned up data for shop: ${shop}`);

    // Optional: forward payload to another service
    await forwardToWebhookSite({
      url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
      topic: "app/uninstalled",
      shop,
      payload,
    });

    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling app/uninstalled webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
