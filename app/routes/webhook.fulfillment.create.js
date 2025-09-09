import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // "fulfillment_events/create"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fulfillmentEventId = payload?.id;
  const fulfillmentId = payload?.fulfillment_id;
  const orderId = payload?.order_id;
  const status = payload?.status;

  console.log(
    `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}, fulfillment_id=${fulfillmentId}, event_id=${fulfillmentEventId}, status=${status}`,
  );

  // Forward asynchronously (non-blocking)
  (async () => {
    try {
      await forwardToWebhookSite({
        url: "https://webhook.site/your-url", // replace with your actual endpoint
        topic,
        shop,
        payload,
      });
      console.log(`📤 Forwarded [${topic}] webhook`);
    } catch (fwdErr) {
      console.error("❌ Forwarding failed:", fwdErr);
    }
  })();

  // Respond immediately so Shopify doesn't retry
  return json({ success: true });
}
