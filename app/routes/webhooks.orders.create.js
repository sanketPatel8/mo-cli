// import { authenticate } from "../shopify.server";
// import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

// export const action = async ({ request }) => {
//   const { topic, shop, payload } = await authenticate.webhook(request);

//   console.log(`Received ${topic} from ${shop}`);
//   const WEBHOOK_SITE_URL =
//     "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21";
//   // "https://webhook.site/6691c6dd-97a0-4f63-b7a9-14525ff89931";

//   // Forward to your Next.js API
//   await forwardToWebhookSite({
//     url: WEBHOOK_SITE_URL,
//     topic,
//     shop,
//     payload,
//   });

//   return new Response(null, { status: 200 });
// };

export const action = async ({ request }) => {
  try {
    const body = await request.json();
    console.log("✅ Order webhook received:", body);

    await forwardToWebhookSite({
      url: "https://webhook.site/53a0792f-2d18-497d-bf6b-d42d7b070a21",
      topic: "orders/create",
      shop: "test-shop.myshopify.com",
      payload: body,
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response("error", { status: 500 });
  }
};
