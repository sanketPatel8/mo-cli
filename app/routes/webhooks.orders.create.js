// export const action = async ({ request }) => {
//   try {
//     const body = await request.json();

//     const shop = request.headers.get("x-shopify-shop-domain");

//     console.log("✅ Order webhook received:", body);

//     // Example: forward, save to DB, or process
//     await forwardToWebhookSite({
//       url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
//       topic: "orders/create",
//       shop,
//       payload: body,
//     });

//     return new Response("ok", { status: 200 });
//   } catch (err) {
//     console.error("❌ Webhook error:", err);
//     return new Response("error", { status: 500 });
//   }
// };

import { json } from "@remix-run/node";
import { forwardToWebhookSite } from "~/utils/forward.server.js";

export async function action({ request }) {
  try {
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    const payload = await request.json();

    console.log("✅ Order webhook received from Shopify:", payload.id);

    // Forward to your Next.js app API
    await forwardToWebhookSite({
      url: "https://my-operator.vercel.app/api/shopify/orders",
      topic,
      shop,
      payload,
    });

    // Respond 200 so Shopify knows we got it
    return json({ success: true });
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    return json({ error: "Webhook failed" }, { status: 500 });
  }
}
