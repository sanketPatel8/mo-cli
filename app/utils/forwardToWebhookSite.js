export async function forwardToWebhookSite({
  url,
  topic,
  shop,
  payload,
  retries = 1, // default = no retry (set to 2–3 if you want retries)
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  console.log("url", url);
  console.log("topic", topic);
  console.log("shop", shop);
  console.log("payload", payload);
  console.log("retries", retries);

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
    console.log("res", res);

    if (!res.ok) {
      let text;
      try {
        text = await res.text();
      } catch {
        text = "<no response body>";
      }

      console.error(
        `❌ Forwarding failed: ${res.status} ${res.statusText}`,
        text,
      );

      // Retry once if allowed
      if (retries > 0) {
        console.warn(`🔄 Retrying forward → ${url}`);
        return await forwardToWebhookSite({
          url,
          topic,
          shop,
          payload,
          retries: retries - 1,
        });
      }

      return {
        success: false,
        status: res.status,
        statusText: res.statusText,
        body: text,
      };
    }

    return { success: true, status: res.status };
  } catch (err) {
    console.error("⚠️ Forwarding error:", err.message);

    if (retries > 0) {
      console.warn(`🔄 Retrying forward after error → ${url}`);
      return await forwardToWebhookSite({
        url,
        topic,
        shop,
        payload,
        retries: retries - 1,
      });
    }

    return { success: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}
