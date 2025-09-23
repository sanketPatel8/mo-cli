import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  const body = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(body, "utf8")
    .digest("base64");

  if (generatedHash !== hmac)
    return new NextResponse("Unauthorized", { status: 401 });

  console.log("Webhook received:", body);
  return NextResponse.json({ success: true });
}
