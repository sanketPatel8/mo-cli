export async function forwardToWebhookSite({ url, topic, shop, payload }) {
  try {
    // Add the second fixed URL internally
    const urls = [url];

    console.log("🌍 Forwarding payload to:", urls);
    console.log("📦 Payload sample:", JSON.stringify(payload));
    console.log("🔖 Headers:", { topic, shop });

    const results = [];

    for (const targetUrl of urls) {
      console.log(`➡️ Sending payload to: ${targetUrl}`);

      try {
        // Safe payload
        const safePayload = JSON.parse(JSON.stringify(payload));

        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopify-topic": topic,
            "x-shopify-shop": shop,
          },
          body: JSON.stringify(safePayload),
        });

        console.log(
          `📡 Response from ${targetUrl}: ${res.status} ${res.statusText}`,
        );

        let data;
        try {
          data = await res.json(); // parse JSON response
          console.log(`📦 Response body from ${targetUrl}:`, data);
        } catch (jsonErr) {
          console.log(
            `⚠️ Could not parse JSON from ${targetUrl}:`,
            jsonErr.message,
          );
          data = null;
        }

        if (!res.ok) {
          const text = await res.text();
          console.error(
            `❌ Failed request to ${targetUrl}: ${res.status} ${res.statusText} - ${text}`,
          );
          results.push({ url: targetUrl, status: res.status, error: text });
        } else {
          results.push({ url: targetUrl, status: res.status, body: data });
        }
      } catch (err) {
        console.error(`❌ Error forwarding to ${targetUrl}:`, err.message);
        results.push({ url: targetUrl, error: err.message });
      }
    }

    console.log("✅ Final forwarding results:", results);
    return results;
  } catch (error) {
    console.error("❌ General forwarding error:", error.message);
    return [{ url, error: error.message }];
  }
}
