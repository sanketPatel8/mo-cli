import crypto from "crypto";

export async function POST(req) {
  try {
    // Get raw body text (important for Shopify HMAC check)
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    const secret = process.env.SHOPIFY_API_SECRET;

    // Verify HMAC
    const hash = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    if (hash !== hmacHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse JSON
    const data = JSON.parse(rawBody);
    console.log("📦 Shopify webhook received:", data);

    // TODO: Save to DB, trigger notifications, etc.

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
}
