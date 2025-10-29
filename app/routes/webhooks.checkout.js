import { json } from "@remix-run/node";
import pool, { closePool } from "../db.server.js";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import { verifyShopifyHmac } from "../utils/verifyShopifyHmac.js";

// 🛑 In-memory set to track processed webhooks
const processedWebhooks = new Set();

// 🕑 Helper: IST timestamp
function getISTDateTime() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  const h = String(ist.getHours()).padStart(2, "0");
  const min = String(ist.getMinutes()).padStart(2, "0");
  const s = String(ist.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export async function action({ request }) {
  try {
    // 1️⃣ Read raw body
    const rawBody = await request.text();

    // 2️⃣ Verify HMAC using raw body
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
    const isValid = verifyShopifyHmac(rawBody, hmacHeader); // pass raw body
    if (!isValid) {
      console.error("❌ Invalid HMAC");
      return json({ error: "Invalid HMAC" }, { status: 401 });
    }

    // 3️⃣ Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ Invalid JSON payload", err);
      return json({ error: "Invalid JSON" }, { status: 400 });
    }

    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");

    // 4️⃣ Prevent duplicate processing
    if (processedWebhooks.has(payload.id)) {
      console.log(`⚠️ Webhook for order ${payload.id} already processed`);
      return json({ success: true });
    }
    processedWebhooks.add(payload.id);

    const checkoutId = payload?.id;
    if (!checkoutId) {
      console.warn("⚠️ Missing checkout ID in payload");
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(
      `📥 Checkout webhook received: ${topic} | Shop: ${shop} | ID: ${checkoutId}`,
    );

    // 🔗 Forward payload to Next.js API and await
    try {
      const forwardResults = await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
        topic,
        shop,
        payload,
      });
      console.log("🚀 Payload forwarded successfully:", forwardResults);
    } catch (err) {
      console.error("❌ Forwarding failed:", err);
    }

    // 📝 Insert or update in database
    const now = getISTDateTime();
    try {
      const safe = (value, fallback = null) =>
        value === undefined ? fallback : value;

      if (topic === "checkouts/create") {
        await pool.execute(
          `
    INSERT INTO checkouts (
      id, token, cart_token, email, created_at, updated_at,
      total_line_items_price, total_tax, subtotal_price, total_price,
      currency, abandoned_checkout_url, customer, line_items, shipping_lines, tax_lines, shop_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      token = VALUES(token),
      cart_token = VALUES(cart_token),
      email = VALUES(email),
      updated_at = VALUES(updated_at),
      total_line_items_price = VALUES(total_line_items_price),
      total_tax = VALUES(total_tax),
      subtotal_price = VALUES(subtotal_price),
      total_price = VALUES(total_price),
      currency = VALUES(currency),
      abandoned_checkout_url = VALUES(abandoned_checkout_url),
      customer = VALUES(customer),
      line_items = VALUES(line_items),
      shipping_lines = VALUES(shipping_lines),
      tax_lines = VALUES(tax_lines),
      shop_url = VALUES(shop_url)
    `,
          [
            checkoutId,
            safe(payload.token),
            safe(payload.cart_token),
            safe(payload.email),
            now,
            now,
            safe(payload.total_line_items_price, 0),
            safe(payload.total_tax, 0),
            safe(payload.subtotal_price, 0),
            safe(payload.total_price, 0),
            safe(payload.currency),
            safe(payload.abandoned_checkout_url),
            JSON.stringify(safe(payload.customer, {})),
            JSON.stringify(safe(payload.line_items, [])),
            JSON.stringify(safe(payload.shipping_lines, [])),
            JSON.stringify(safe(payload.tax_lines, [])),
            safe(shop),
          ],
        );
        console.log(`✅ Checkout inserted/updated → ${checkoutId}`);
      } else if (topic === "checkouts/update") {
        await pool.execute(
          `
    UPDATE checkouts SET
      token = ?, cart_token = ?, email = ?, updated_at = ?,
      total_line_items_price = ?, total_tax = ?, subtotal_price = ?, total_price = ?,
      currency = ?, abandoned_checkout_url = ?, customer = ?, line_items = ?, shipping_lines = ?, tax_lines = ?, shop_url = ?
    WHERE id = ?
    `,
          [
            safe(payload.token),
            safe(payload.cart_token),
            safe(payload.email),
            now,
            safe(payload.total_line_items_price, 0),
            safe(payload.total_tax, 0),
            safe(payload.subtotal_price, 0),
            safe(payload.total_price, 0),
            safe(payload.currency),
            safe(payload.abandoned_checkout_url),
            JSON.stringify(safe(payload.customer, {})),
            JSON.stringify(safe(payload.line_items, [])),
            JSON.stringify(safe(payload.shipping_lines, [])),
            JSON.stringify(safe(payload.tax_lines, [])),
            safe(shop),
            checkoutId,
          ],
        );
        console.log(`✅ Checkout updated → ${checkoutId}`);
      } else {
        console.log(`⚠️ Unhandled webhook topic: ${topic}`);
      }
    } catch (err) {
      console.error("🔥 Error saving checkout to DB:", err);
      console.error("📝 Payload:", JSON.stringify(payload, null, 2));
    }

    return json({ success: true });
  } catch (err) {
    console.error("🔥 Checkout webhook failed:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  } finally {
    // ✅ Always close the pool after processing
    await closePool();
  }
}
