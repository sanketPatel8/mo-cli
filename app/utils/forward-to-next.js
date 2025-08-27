// app/utils/forward-to-next.js
import fetch from "node-fetch";
import crypto from "crypto";

export async function forwardToNext(forwarded) {
  const bodyString = JSON.stringify(forwarded);
  const signature = crypto
    .createHmac("sha256", process.env.FORWARD_SECRET)
    .update(bodyString)
    .digest("base64");

  const res = await fetch(
    `${process.env.SHOPIFY_NEXT_URI}/api/shopify-events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-signature": signature,
      },
      body: bodyString,
      timeout: 10000,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Next receiver responded ${res.status}: ${text}`);
  }
  return res;
}
