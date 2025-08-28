// export const action = async ({ request }) => {
//   try {
//     const body = await request.json();
//     console.log("✅ Order webhook received:", body);

import { forwardToWebhookSite } from "../utils/forwardToWebhookSite";

//     await forwardToWebhookSite({
//       url: "https://webhook.site/6691c6dd-97a0-4f63-b7a9-14525ff89931",
//       topic: "orders/create",
//       shop: "test-shop.myshopify.com",
//       payload: body,
//     });

//     return new Response("ok", { status: 200 });
//   } catch (err) {
//     console.error("❌ Webhook error:", err);
//     return new Response("error", { status: 500 });
//   }
// };

// app/routes/webhooks.orders.create.jsx
export const action = async ({ request }) => {
  try {
    const body = await request.json();

    console.log("✅ Order webhook received:", body);

    // Example: forward, save to DB, or process
    await forwardToWebhookSite({
      url: "https://webhook.site/6691c6dd-97a0-4f63-b7a9-14525ff89931",
      topic: "orders/create",
      shop: "flask-01.myshopify.com", // your real store
      payload: body,
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response("error", { status: 500 });
  }
};
