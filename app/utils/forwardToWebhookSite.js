// export async function forwardToWebhookSite({
//   url,
//   topic,
//   shop,
//   payload,
//   retries = 1, // default = no retry (set to 2–3 if you want retries)
// }) {
//   // const controller = new AbortController();
//   // const timeout = setTimeout(() => controller.abort(), 6000);

//   console.log("url", url);
//   console.log("topic", topic);
//   console.log("shop", shop);
//   console.log("payload", payload);

//   try {
//     const res = await fetch(url, {
//       method: "POST",
//       headers: {
//         "content-type": "application/json",
//         "x-source": "shopify-remix",
//         "x-shopify-topic": topic,
//         "x-shop": shop,
//       },
//       body: JSON.stringify(payload),
//       // signal: controller.signal,
//     });

//     console.log("res", res);

//     if (!res.ok) {
//       let text;
//       try {
//         text = await res.text();
//       } catch {
//         text = "<no response body>";
//       }

//       console.error(
//         `❌ Forwarding failed: ${res.status} ${res.statusText}`,
//         text,
//       );

//       // Retry once if allowed
//       if (retries > 0) {
//         console.warn(`🔄 Retrying forward → ${url}`);
//         return await forwardToWebhookSite({
//           url,
//           topic,
//           shop,
//           payload,
//           retries: retries - 1,
//         });
//       }

//       return {
//         success: false,
//         status: res.status,
//         statusText: res.statusText,
//         body: text,
//       };
//     }

//     return { success: true, status: res.status };
//   } catch (err) {
//     console.error("⚠️ Forwarding error:", err.message);

//     if (retries > 0) {
//       console.warn(`🔄 Retrying forward after error → ${url}`);
//       return await forwardToWebhookSite({
//         url,
//         topic,
//         shop,
//         payload,
//         retries: retries - 1,
//       });
//     }

//     return { success: false, error: err.message };
//   } finally {
//     // clearTimeout(timeout);
//   }
// }

// import { isDuplicateOrder } from "./orderCache.js";

// export async function forwardToWebhookSite({
//   url, // main URL
//   topic,
//   shop,
//   payload,
//   retries = 1,
// }) {
//   const orderId = payload?.id;

//   // 🔹 Duplicate check
//   if (isDuplicateOrder(orderId)) {
//     console.log(`⚠️ Duplicate order forwarding skipped: ${orderId}`);
//     return { success: true, duplicate: true };
//   }

//   // 🔹 Build URLs array: main URL + optional debug URL
//   const urls = [url];
//   if (process.env.SHOPIFY_DEBUG_URL) {
//     urls.push(process.env.SHOPIFY_DEBUG_URL);
//   }

//   // 🔹 Forward to all URLs in parallel
//   const results = await Promise.all(
//     urls.map(async (forwardUrl) => {
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 6000);

//       try {
//         const res = await fetch(forwardUrl, {
//           method: "POST",
//           headers: {
//             "content-type": "application/json",
//             "x-source": "shopify-remix",
//             "x-shopify-topic": topic,
//             "x-shop": shop,
//           },
//           body: JSON.stringify(payload),
//           signal: controller.signal,
//         });

//         if (!res.ok) {
//           let text;
//           try {
//             text = await res.text();
//           } catch {
//             text = "<no response body>";
//           }
//           console.error(
//             `❌ Forwarding failed: ${res.status} ${res.statusText}`,
//             text,
//           );

//           if (retries > 0) {
//             console.warn(`🔄 Retrying forward → ${forwardUrl}`);
//             return await forwardToWebhookSite({
//               url: forwardUrl,
//               topic,
//               shop,
//               payload,
//               retries: retries - 1,
//             });
//           }

//           return {
//             success: false,
//             status: res.status,
//             body: text,
//             url: forwardUrl,
//           };
//         }

//         return { success: true, status: res.status, url: forwardUrl };
//       } catch (err) {
//         console.error(`⚠️ Forwarding error for ${forwardUrl}:`, err.message);
//         if (retries > 0) {
//           console.warn(`🔄 Retrying forward after error → ${forwardUrl}`);
//           return await forwardToWebhookSite({
//             url: forwardUrl,
//             topic,
//             shop,
//             payload,
//             retries: retries - 1,
//           });
//         }
//         return { success: false, error: err.message, url: forwardUrl };
//       } finally {
//         clearTimeout(timeout);
//       }
//     }),
//   );

//   return results;
// }

export async function forwardToWebhookSite({ url, topic, shop, payload }) {
  try {
    console.log("🌍 Forwarding payload to:", url);
    console.log(
      "📦 Forward payload sample:",
      JSON.stringify(payload).slice(0, 300),
    ); // only first 300 chars
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
