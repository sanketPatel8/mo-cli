// app/routes/webhooks/orders/refund.js
import { json } from "@remix-run/node";
import shopify from "~/shopify.server";

export const action = async ({ request }) => {
  try {
    await shopify.webhooks.process(request);
    return json({ success: true });
  } catch (err) {
    console.error("ORDERS_REFUND webhook error:", err);
    return json({ success: false }, { status: 500 });
  }
};
