export async function forwardToWebhookSite({ url, topic, shop, payload }) {
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
      return { success: false, status: res.status, statusText: res.statusText };
    }

    return { success: true, status: res.status };
  } catch (err) {
    console.error("Forwarding error:", err);
    return { success: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

// export async function forwardToWebhookSite({
//   url,
//   topic,
//   shop,
//   payload,
//   retries = 3,
// }) {
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), 6000);

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
//       signal: controller.signal,
//     });

//     if (res.status === 429 && retries > 0) {
//       const retryAfter = Number(res.headers.get("Retry-After") || 1);
//       const backoffMs = retryAfter * 1000 * Math.pow(2, 3 - retries);
//       console.warn(`⚠️ 429 received. Retrying after ${backoffMs}ms...`);
//       await new Promise((r) => setTimeout(r, backoffMs));
//       return forwardToWebhookSite({
//         url,
//         topic,
//         shop,
//         payload,
//         retries: retries - 1,
//       });
//     }

//     if (!res.ok) {
//       console.error(`Forwarding failed: ${res.status} ${res.statusText}`);
//       return { success: false, status: res.status, statusText: res.statusText };
//     }

//     return { success: true, status: res.status };
//   } catch (err) {
//     console.error("Forwarding error:", err);
//     return { success: false, error: err.message };
//   } finally {
//     clearTimeout(timeout);
//   }
// }
