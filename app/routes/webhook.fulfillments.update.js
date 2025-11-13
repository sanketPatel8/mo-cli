import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

export async function action({ request }) {
  const topic = request.headers.get("x-shopify-topic"); 
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

 
  const response = json({ success: true });

  
  (async () => {
    try {
      await forwardToWebhookSite({
        url: `${process.env.SHOPIFY_NEXT_URI}/api/shopify/orders`, 
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
