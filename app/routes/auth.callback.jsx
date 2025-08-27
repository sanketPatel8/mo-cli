import { authenticate, shopify } from "../shopify.server";

import { useLoaderData } from "@remix-run/react";
import { getCustomerDetails } from "../utils/shopify-admin";

export const loader = async ({ request }) => {
  const { session, shop } = await authenticate.admin(request);

  console.log("✅ Store URL:", shop);

  console.log("✅ Access Token:", session.accessToken);

  // ✅ Register webhook

  try {
    await shopify.webhooks.register({
      path: "/webhooks/shopify",

      topic: "CUSTOMERS_CREATE",

      webhookHandler: async (topic, shop, body) => {
        const payload = JSON.parse(body);

        const customerId = payload.id;

        console.log(`📦 Webhook received from ${shop}`);

        console.log(`👤 New customer ID: ${customerId}`);

        // ✅ Load session for the shop so we can call Admin API

        const session = await shopify.sessionStorage.loadSession(shop, false);

        if (session) {
          const customer = await getCustomerDetails(session, customerId);

          console.log("🎯 Fetched customer:", customer);
        } else {
          console.error("❌ No session found for shop:", shop);
        }
      },
    });
  } catch (err) {
    console.error("❌ Webhook registration error:", err);
  }

  return { shop, accessToken: session.accessToken };
};

export default function AuthCallback() {
  const { shop, accessToken } = useLoaderData();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">App Installed 🎉</h1>
      <p>
        <strong>Shop:</strong> {shop}
      </p>
      <p>
        <strong>Access Token:</strong> {accessToken}
      </p>
      <p className="mt-4 text-gray-600">
        You can close this tab and return to Shopify.
      </p>
    </div>
  );
}
