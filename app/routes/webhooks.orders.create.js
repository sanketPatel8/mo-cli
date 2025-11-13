import { json } from "@remix-run/node"; // or NextResponse.json if Next.js App Router
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";
import { verifyShopifyHmac } from "../utils/verifyShopifyHmac";
import pool, { closePool } from "../db.server";

const processedWebhooks = new Set();

export async function action({ request }) {
  console.log("📥 Webhook request received: orders/create");

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

  // 5️⃣ Forward immediately
  try {
    const forwardResult = await forwardToWebhookSite({
      url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`,
      topic,
      shop,
      payload,
    });
    console.log("🚀 Forwarded payload:", forwardResult);
  } catch (err) {
    console.error("❌ Forward failed:", err);
  }

  // 6️⃣ Delete from DB (optional)
  if (payload?.id) {
    try {
      const [res] = await pool.query(`DELETE FROM checkouts WHERE id = ?`, [
        payload.id,
      ]);
      console.log(`🗑️ Deleted ${res.affectedRows} row(s)`);
    } catch (err) {
      console.error("❌ DB deletion failed:", err);
    } finally {
      // ✅ Always close the pool after processing
      await closePool();
    }
  }

  return json({ success: true });
}
