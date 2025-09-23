import crypto from "crypto";

export function verifyShopifyHmac(rawBody, header) {
  if (!header) return false;

  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(header, "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
