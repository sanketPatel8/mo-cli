import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";
import pool from "../db.server.js"; // MySQL pool

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // should be "orders/delivery-status"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload?.id;
  const deliveryStatus = payload?.delivery_status;
  const trackingNumber = payload?.tracking_number;
  const carrier = payload?.carrier;

  console.log(
    `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}, delivery_status=${deliveryStatus}, tracking_number=${trackingNumber}, carrier=${carrier}`,
  );

  // ✅ Respond immediately to Shopify to prevent retries
  const response = json({ success: true });

  // 🔹 Check last saved delivery status
  const [rows] = await pool.query(
    "SELECT delivery_status FROM orders WHERE id = ?",
    [orderId],
  );
  const lastStatus = rows[0]?.delivery_status;

  if (lastStatus === deliveryStatus) {
    console.log(
      `ℹ️ Delivery status unchanged (${deliveryStatus}) — skipping forward.`,
    );
    return response; // Skip forwarding if no change
  }

  // 🔹 Save new delivery status
  await pool.query("UPDATE orders SET delivery_status = ? WHERE id = ?", [
    deliveryStatus,
    orderId,
  ]);

  // 🔄 Forward asynchronously to your internal API
  try {
    await forwardToWebhookSite({
      url: "https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413", // Replace with your endpoint
      topic,
      shop,
      payload,
    });
    console.log(`📤 Forwarded [${topic}] webhook → internal API`);
  } catch (fwdErr) {
    console.error("❌ Forwarding failed:", fwdErr);
  }

  return response;
}
