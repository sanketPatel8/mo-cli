// Simple helper to forward Shopify webhook JSON to your endpoint
export async function forwardToWebhookSite({ url, topic, shop, payload }) {
  // optional: short timeout so Shopify 200 OK isn't delayed
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-source": "shopify-remix",
        "x-shopify-topic": topic,
        "x-shop": shop,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`Forwarding failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    // Don’t throw—Shopify only needs our 200 to acknowledge receipt
    console.error("Forwarding error:", err);
  } finally {
    clearTimeout(timeout);
  }
}
