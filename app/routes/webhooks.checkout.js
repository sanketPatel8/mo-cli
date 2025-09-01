import { shopify } from "~/shopify.server";
import { connectDB } from "~/lib/db"; // 👈 mysql2 connection pool util

export async function action({ request }) {
  const connection = await connectDB();
  try {
    // Process webhook
    const response = await shopify.webhooks.process(request);

    const topic = request.headers.get("x-shopify-topic");
    const shopUrl = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("🔔 Checkout webhook:", topic, payload.id);

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

    // --- Handle CREATE ---
    if (topic === "checkouts/create") {
      const sql = `
        INSERT IGNORE INTO checkouts (
          id, token, cart_token, email, created_at, updated_at,
          total_line_items_price, total_tax, subtotal_price, total_price,
          currency, line_items, shipping_lines, tax_lines, shop_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.query(sql, checkoutData);
      console.log("✅ Checkout inserted:", checkoutId);
      return new Response("Checkout created", { status: 200 });
    }

    // --- Handle UPDATE ---
    if (topic === "checkouts/update") {
      const sql = `
        UPDATE checkouts
        SET token=?, cart_token=?, email=?, created_at=?, updated_at=?,
            total_line_items_price=?, total_tax=?, subtotal_price=?, total_price=?,
            currency=?, line_items=?, shipping_lines=?, tax_lines=?, shop_url=?
        WHERE id=?
      `;

      const updateData = [
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
        checkoutId, // 👈 last ma WHERE id=?
      ];

      await connection.query(sql, updateData);
      console.log("✏️ Checkout updated:", checkoutId);
      return new Response("Checkout updated", { status: 200 });
    }

    return response;
  } catch (err) {
    console.error("❌ Checkout webhook error:", err);
    return new Response("Error", { status: 500 });
  } finally {
    connection.release();
  }
}
