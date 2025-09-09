import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../../utils/forwardToWebhookSite.js";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); // should be "fulfillments/update"
  const shop = request.headers.get("x-shopify-shop-domain");

  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON payload:", err);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fulfillmentId = payload?.id;
  const orderId = payload?.order_id;

  console.log(
    `📥 Webhook received [${topic}] from ${shop}, order_id=${orderId}, fulfillment_id=${fulfillmentId}`,
  );

  // ✅ Respond immediately so Shopify doesn’t retry
  const response = json({ success: true });

  // 🔄 Forward asynchronously (non-blocking)
  (async () => {
    try {
      await forwardToWebhookSite({
        url: `https://webhook.site/4aa517f4-3dee-4ff2-9f88-574e26dd1413`, // replace with your endpoint
        topic,
        shop,
        payload,
      });
      console.log(`📤 Forwarded [${topic}] webhook → your API`);
    } catch (fwdErr) {
      console.error("❌ Forwarding failed:", fwdErr);
    }
  })();

  return response;
}
