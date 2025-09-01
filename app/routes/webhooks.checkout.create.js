import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import pool from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  try {
    let payload;
    try {
      const response = await shopify.webhooks.process(request);
      if (!response.ok) console.warn("⚠️ Skipping HMAC check (local test)");
      payload = await request.json();
    } catch (e) {
      console.warn("⚠️ shopify.webhooks.process failed:", e.message);
      payload = await request.json();
    }

    const shopUrl = request.headers.get("x-shopify-shop-domain");
    const checkoutId = payload.id;

    // Prepare checkout data
    const checkoutData = [
      checkoutId,
      payload.token,
      payload.cart_token,
      payload.email,
      payload.created_at,
      payload.updated_at,
      payload.total_line_items_price || 0,
      payload.total_tax || 0,
      payload.subtotal_price || 0,
      payload.total_price || 0,
      payload.currency,
      JSON.stringify(payload.line_items || []),
      JSON.stringify(payload.shipping_lines || []),
      JSON.stringify(payload.tax_lines || []),
      shopUrl,
    ];

    // --- Insert only if not exists ---
    const sql = `
      INSERT IGNORE INTO checkouts (
        id, token, cart_token, email, created_at, updated_at,
        total_line_items_price, total_tax, subtotal_price, total_price,
        currency, line_items, shipping_lines, tax_lines, shop_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [rows] = await pool.execute("SELECT id FROM checkouts WHERE id = ?", [
      checkoutId,
    ]);

    if (rows.length === 0) {
      console.log(`⚠️ Checkout already exists, skipping insert: ${checkoutId}`);
    } else {
      const [result] = await pool.execute(sql, checkoutData);
      console.log(`✅ New checkout inserted: ${checkoutId}`);
    }

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Error handling checkouts/create webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
