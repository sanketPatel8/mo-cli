// app/utils/shopify-verify.js
import crypto from "crypto";

export function verifyShopifyWebhook(rawBody, hmacHeader, shopifySecret) {
  if (!hmacHeader) return false;
  const digest = crypto
    .createHmac("sha256", shopifySecret)
    .update(rawBody, "utf8")
    .digest("base64");

  const digestBuf = Buffer.from(digest, "utf8");
  const headerBuf = Buffer.from(hmacHeader, "utf8");

  // timingSafeEqual requires same length
  if (digestBuf.length !== headerBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuf, headerBuf);
}
