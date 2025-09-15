export async function forwardToWebhookSite({ url, topic, shop, payload }) {
  try {
    console.log("🌍 Forwarding payload to:", url);
    console.log("📦 Forward payload sample:", JSON.stringify(payload)); // only first 300 chars
    console.log("🔖 Headers:", { topic, shop });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-topic": topic,
        "x-shopify-shop": shop,
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Response status:", res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Webhook forwarding failed: ${res.status} ${res.statusText} - ${text}`,
      );
    }

    console.log("✅ Webhook forwarded successfully:", topic);
  } catch (error) {
    console.error("❌ Forwarding error:", error);
  }
}
