import crypto from "crypto";

// request is the full Request object
export async function verifyShopifyHmac(request) {
  console.log(request, "request in hmac token");
  console.log(request.headers, "request headers in hmac token");

  if (!request || !request.headers) return false;

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader) return false;

  // get raw body as string
  const rawBody = await request.text(); // can be empty string ""

  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  // timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(digest, "base64"),
    Buffer.from(hmacHeader, "base64"),
  );
}
