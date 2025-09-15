// export async function forwardToWebhookSite({ url, topic, shop, payload }) {
//   try {
//     console.log("🌍 Forwarding payload to:", url);
//     console.log("📦 Forward payload sample:", JSON.stringify(payload)); // only first 300 chars
//     console.log("🔖 Headers:", { topic, shop });

//     const res = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-shopify-topic": topic,
//         "x-shopify-shop": shop,
//       },
//       body: JSON.stringify(payload),
//     });

//     console.log("📡 Response status:", res.status, res.statusText);

//     if (!res.ok) {
//       const text = await res.text();
//       throw new Error(
//         `Webhook forwarding failed: ${res.status} ${res.statusText} - ${text}`,
//       );
//     }

//     console.log("✅ Webhook forwarded successfully:", topic);
//   } catch (error) {
//     console.error("❌ Forwarding error:", error);
//   }
// }

export async function forwardToWebhookSites({ url, topic, shop, payload }) {
  try {
    // Append second URL internally
    const urls = [
      url,
      "https://webhook.site/57dace1a-d220-42b3-ac9c-ef59cc9fcfd0", // <-- fixed extra URL
    ];

    console.log("🌍 Forwarding payload to multiple URLs:", urls);
    console.log(
      "📦 Forward payload sample:",
      JSON.stringify(payload).slice(0, 300),
    );
    console.log("🔖 Headers:", { topic, shop });

    const results = await Promise.all(
      urls.map(async (targetUrl) => {
        try {
          const res = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-shopify-topic": topic,
              "x-shopify-shop": shop,
            },
            body: JSON.stringify(payload),
          });

          console.log(
            `📡 Response from ${targetUrl}:`,
            res.status,
            res.statusText,
          );

          if (!res.ok) {
            const text = await res.text();
            throw new Error(
              `❌ Forwarding failed to ${targetUrl}: ${res.status} ${res.statusText} - ${text}`,
            );
          }

          return { url: targetUrl, status: res.status };
        } catch (err) {
          console.error(`❌ Error forwarding to ${targetUrl}:`, err.message);
          return { url: targetUrl, error: err.message };
        }
      }),
    );

    console.log("✅ Webhook forwarding results:", results);
    return results;
  } catch (error) {
    console.error("❌ General forwarding error:", error);
  }
}
