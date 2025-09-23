// app/routes/api/webhooks.jsx
import { json } from "@remix-run/node";
import crypto from "crypto";

export const action = async ({ request }) => {
  const body = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(body, "utf8")
    .digest("base64");

  if (generatedHash !== hmac) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Webhook received:", body);
  return json({ success: true });
};
