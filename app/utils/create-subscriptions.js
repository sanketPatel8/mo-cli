// app/utils/create-subscriptions.js
// Simple REST create webhook & script tag helpers (examples)
// You can use GraphQL webhookSubscriptionCreate too (recommended for new apps).
export async function createWebhooksAndScript(shop, accessToken) {
  const API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";
  const base = `https://${shop}/admin/api/${API_VERSION}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": accessToken,
  };

  const webhookTopics = [
    "carts/create",
    "carts/update",
    "checkouts/create",
    "checkouts/update",
    "orders/create",
    "orders/cancelled",
    "customers/create",
  ];

  for (const topic of webhookTopics) {
    await fetch(`${base}/webhooks.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        webhook: {
          topic,
          address: `${process.env.SHOPIFY_APP_URL}/webhooks/shopify`,
          format: "json",
        },
      }),
    });
  }

  // Create a ScriptTag to inject storefront JS (if you choose to use ScriptTag)
  // If your app is going to the App Store and needs theme integration, consider Theme App Extensions instead.
  await fetch(`${base}/script_tags.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      script_tag: {
        event: "onload",
        src: `${process.env.SHOPIFY_APP_URL}/scripts/storefront.js?token=${process.env.FRONT_SCRIPT_TOKEN}&shop=${shop}`,
      },
    }),
  });
}
