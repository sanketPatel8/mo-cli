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

// export async function forwardToWebhookSite({ url, topic, shop, payload }) {
//   try {
//     // Add the second fixed URL internally
//     const urls = [
//       url,
//       "https://webhook.site/57dace1a-d220-42b3-ac9c-ef59cc9fcfd0", // second endpoint
//     ];

//     console.log("🌍 Forwarding payload to:", urls);
//     console.log("📦 Payload sample:", JSON.stringify(payload));
//     console.log("🔖 Headers:", { topic, shop });

//     const results = await Promise.all(
//       urls.map(async (targetUrl) => {
//         try {
//           const controller = new AbortController();
//           const timeout = setTimeout(() => controller.abort(), 5000); // ⏱ timeout safety

//           const res = await fetch(targetUrl, {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               "x-shopify-topic": topic,
//               "x-shopify-shop": shop,
//             },
//             body: JSON.stringify(payload),
//             signal: controller.signal,
//           });

//           clearTimeout(timeout);

//           console.log(
//             `📡 Response from ${targetUrl}: ${res.status} ${res.statusText}`,
//           );

//           if (!res.ok) {
//             const text = await res.text();
//             throw new Error(
//               `❌ Failed to ${targetUrl}: ${res.status} ${res.statusText} - ${text}`,
//             );
//           }

//           return { url: targetUrl, status: res.status };
//         } catch (err) {
//           console.error(`❌ Error forwarding to ${targetUrl}:`, err.message);
//           return { url: targetUrl, error: err.message };
//         }
//       }),
//     );

//     console.log("✅ Final forwarding results:", results);
//     return results;
//   } catch (error) {
//     console.error("❌ General forwarding error:", error);
//     return [{ url, error: error.message }];
//   }
// }

// export async function forwardToWebhookSite({ url, topic, shop, payload }) {
//   try {
//     // Add the second fixed URL internally
//     const urls = [
//       url,
//       "https://webhook.site/57dace1a-d220-42b3-ac9c-ef59cc9fcfd0", // second endpoint
//     ];

//     console.log("🌍 Forwarding payload to:", urls);
//     console.log("📦 Payload sample:", JSON.stringify(payload));
//     console.log("🔖 Headers:", { topic, shop });

//     const results = await Promise.all(
//       urls.map(async (targetUrl) => {
//         try {
//           const res = await fetch(targetUrl, {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               "x-shopify-topic": topic,
//               "x-shopify-shop": shop,
//             },
//             body: JSON.stringify(payload),
//           });

//           console.log(
//             `📡 Response from ${targetUrl}: ${res.status} ${res.statusText}`,
//           );

//           if (!res.ok) {
//             const text = await res.text();
//             throw new Error(
//               `❌ Failed to ${targetUrl}: ${res.status} ${res.statusText} - ${text}`,
//             );
//           }

//           return { url: targetUrl, status: res.status };
//         } catch (err) {
//           console.error(`❌ Error forwarding to ${targetUrl}:`, err.message);
//           return { url: targetUrl, error: err.message };
//         }
//       }),
//     );

//     console.log("✅ Final forwarding results:", results);
//     return results;
//   } catch (error) {
//     console.error("❌ General forwarding error:", error);
//     return [{ url, error: error.message }];
//   }
// }

export async function forwardToWebhookSite({ url, topic, shop, payload }) {
  try {
    // Add the second fixed URL internally
    const urls = [
      url,
      "https://webhook.site/57dace1a-d220-42b3-ac9c-ef59cc9fcfd0", // second endpoint
    ];

    console.log("🌍 Forwarding payload to:", urls);
    console.log("📦 Payload sample:", JSON.stringify(payload).slice(0, 300));
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
